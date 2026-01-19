import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  return createClient(url, key)
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase()
    const body = await request.json()
    const { buildId } = body

    // Kill all Claude processes
    try {
      await execAsync('pkill -f "claude" || true')
    } catch {
      // Ignore errors - process might not exist
    }

    // Mark specific build as failed, or all running builds if no buildId
    if (buildId) {
      await supabase
        .from('dj_builds')
        .update({
          status: 'failed',
          error_message: 'Stopped by user',
          progress: 0,
          current_phase: 'Stopped'
        })
        .eq('id', buildId)

      // Reset idea back to approved
      const { data: build } = await supabase
        .from('dj_builds')
        .select('idea_id')
        .eq('id', buildId)
        .single()

      if (build?.idea_id) {
        await supabase
          .from('dj_ideas')
          .update({ status: 'approved' })
          .eq('id', build.idea_id)
      }
    } else {
      // Stop ALL running builds
      const { data: runningBuilds } = await supabase
        .from('dj_builds')
        .select('id, idea_id')
        .eq('status', 'running')

      if (runningBuilds && runningBuilds.length > 0) {
        await supabase
          .from('dj_builds')
          .update({
            status: 'failed',
            error_message: 'Stopped by user',
            progress: 0,
            current_phase: 'Stopped'
          })
          .in('id', runningBuilds.map(b => b.id))

        // Reset all ideas back to approved
        const ideaIds = runningBuilds.map(b => b.idea_id).filter(Boolean)
        if (ideaIds.length > 0) {
          await supabase
            .from('dj_ideas')
            .update({ status: 'approved' })
            .in('id', ideaIds)
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Build stopped' })
  } catch (error) {
    console.error('Stop build error:', error)
    return NextResponse.json({ error: 'Failed to stop build' }, { status: 500 })
  }
}
