import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Genesis processes 9 agents — can take up to 2 minutes
export const maxDuration = 300

const GENESIS_URL = process.env.GENESIS_URL || 'https://genesis.nolimitjones.com'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase environment variables not configured')
  }

  return createClient(url, key)
}

export async function POST(request: Request) {
  let ideaId: string | null = null

  try {
    const body = await request.json()
    ideaId = body.ideaId

    if (!ideaId) {
      return NextResponse.json({ error: 'Missing ideaId' }, { status: 400 })
    }

    const supabase = getSupabase()

    // 1. Read the DJ Loop idea
    const { data: idea, error: fetchError } = await supabase
      .from('dj_ideas')
      .select('*')
      .eq('id', ideaId)
      .single()

    if (fetchError || !idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    // 2. Submit to Genesis Engine — now awaits full processing
    const submitRes = await fetch(`${GENESIS_URL}/api/genesis/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idea: idea.raw_input,
        source: 'dj-loop',
      }),
    })

    if (!submitRes.ok) {
      const errBody = await submitRes.text()
      console.error('Genesis submit failed:', submitRes.status, errBody)
      throw new Error(`Genesis submit failed: ${submitRes.status}`)
    }

    const submitData = await submitRes.json()

    if (!submitData.success || !submitData.ideaId) {
      throw new Error('Genesis returned unexpected response')
    }

    const genesisIdeaId = submitData.ideaId

    // 3. Fetch the completed results from Genesis status endpoint
    const statusRes = await fetch(
      `${GENESIS_URL}/api/genesis/status?ideaId=${genesisIdeaId}`
    )

    if (!statusRes.ok) {
      throw new Error(`Genesis status check failed: ${statusRes.status}`)
    }

    const genesisIdea = await statusRes.json()

    if (genesisIdea.status !== 'ready') {
      throw new Error(`Genesis idea status: ${genesisIdea.status}`)
    }

    // 4. Update DJ Loop idea with Genesis analysis results
    const score = genesisIdea.genesisScore
      ? Math.round(genesisIdea.genesisScore)
      : (genesisIdea.quickScore ?? 0)

    const existingMetadata = (idea.source_metadata as Record<string, unknown>) || {}

    const updatedMetadata = {
      ...existingMetadata,
      genesis_idea_id: genesisIdeaId,
      executiveSummary: genesisIdea.executiveSummary,
      quickVerdict: genesisIdea.quickVerdict,
      feasibilityData: genesisIdea.feasibilityData,
      exploitAnalysis: genesisIdea.exploitAnalysis,
      productizeAnalysis: genesisIdea.productizeAnalysis,
      researchFindings: genesisIdea.researchFindings,
      questionsAnswered: genesisIdea.questionsAnswered,
    }

    const updatePayload: Record<string, unknown> = {
      score,
      status: 'pending_approval',
      source_metadata: updatedMetadata,
    }

    if (genesisIdea.prdContent) {
      updatePayload.prd = genesisIdea.prdContent
    }

    const { error: updateError } = await supabase
      .from('dj_ideas')
      .update(updatePayload)
      .eq('id', ideaId)

    if (updateError) {
      console.error('Failed to update idea with Genesis data:', updateError)
      return NextResponse.json(
        { error: 'Failed to update idea with analysis results' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      ideaId,
      genesisIdeaId,
      score,
      verdict: genesisIdea.quickVerdict,
    })
  } catch (error) {
    console.error('Genesis analysis failed, falling back to simple PRD:', error)

    // Fallback: generate a basic PRD instead of leaving the idea stuck
    if (ideaId) {
      try {
        const baseUrl = request.headers.get('host')
        const protocol = request.headers.get('x-forwarded-proto') || 'https'
        const generateUrl = `${protocol}://${baseUrl}/api/generate-prd`

        await fetch(generateUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ideaId }),
        })
      } catch (fallbackErr) {
        console.error('Fallback PRD also failed:', fallbackErr)
      }
    }

    return NextResponse.json(
      { error: 'Genesis analysis failed, used fallback PRD' },
      { status: 500 }
    )
  }
}
