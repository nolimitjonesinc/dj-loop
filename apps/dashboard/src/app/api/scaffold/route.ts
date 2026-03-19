import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runScaffoldAgent } from '@/lib/agents/scaffold'
import type { Idea } from '@/lib/supabase'

// Scaffold makes 2 sequential Anthropic API calls — needs more than default 10s
export const maxDuration = 30

export async function POST(req: Request) {
  const { ideaId } = await req.json()

  if (!ideaId) {
    return NextResponse.json({ error: 'ideaId required' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Get the idea
  const { data: idea, error: fetchError } = await supabase
    .from('dj_ideas')
    .select('*')
    .eq('id', ideaId)
    .single()

  if (fetchError || !idea) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
  }

  try {
    // Run scaffold agent
    const result = await runScaffoldAgent(idea as unknown as Idea, apiKey)

    // Create build record with scaffold output
    const { data: build, error: buildError } = await supabase
      .from('dj_builds')
      .insert({
        idea_id: ideaId,
        status: 'scaffolded',
        progress: 0,
        current_phase: 'Scaffold complete — ready for build',
        claude_md: result.claudeMd,
        scaffold_tasks: result.tasks,
        logs: [`Scaffold generated: ${result.tasks.length} tasks`],
      })
      .select()
      .single()

    if (buildError) {
      return NextResponse.json({ error: buildError.message }, { status: 500 })
    }

    // Update idea status
    await supabase
      .from('dj_ideas')
      .update({ status: 'approved' })
      .eq('id', ideaId)

    return NextResponse.json({
      status: 'scaffolded',
      build,
      claudeMd: result.claudeMd,
      tasks: result.tasks,
      repoStructure: result.repoStructure,
      stackReasoning: result.stackReasoning,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Scaffold failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
