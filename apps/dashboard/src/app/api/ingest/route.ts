import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Ingest waits for Genesis analysis (up to 2 min)
export const maxDuration = 120

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase environment variables not configured')
  }

  return createClient(url, key)
}

export async function POST(request: Request) {
  try {
    // API key check — if no key is configured, reject everything
    const ingestKey = process.env.DJ_LOOP_INGEST_KEY
    if (!ingestKey) {
      return NextResponse.json(
        { error: 'Ingest endpoint not configured' },
        { status: 401 }
      )
    }

    const apiKey = request.headers.get('x-api-key')
    if (apiKey !== ingestKey) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.title || !body.raw_input) {
      return NextResponse.json(
        { error: 'Missing required fields: title and raw_input' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    const insertData = {
      title: body.title,
      raw_input: body.raw_input,
      input_type: body.input_type || 'manual',
      project_dna: body.project_dna || 'utility-app',
      source_url: body.source_url || null,
      score: body.score ?? 0,
      status: 'draft' as const,
      source_metadata: {
        ...(body.source ? { source: body.source } : {}),
        ...(body.analysis ? { analysis: body.analysis } : {}),
      },
    }

    const { data, error } = await supabase
      .from('dj_ideas')
      .insert(insertData)
      .select('id, status')
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json(
        { error: 'Failed to insert idea' },
        { status: 500 }
      )
    }

    // If auto_generate_prd is set, kick off PRD generation
    if (body.auto_generate_prd && data?.id) {
      // Update status to generating_prd
      await supabase
        .from('dj_ideas')
        .update({ status: 'generating_prd' })
        .eq('id', data.id)

      // Run Genesis analysis inline — Vercel kills fire-and-forget fetches
      const baseUrl = request.headers.get('host')
      const protocol = request.headers.get('x-forwarded-proto') || 'https'
      const analyzeUrl = `${protocol}://${baseUrl}/api/analyze`

      try {
        const analyzeRes = await fetch(analyzeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ideaId: data.id }),
        })

        if (!analyzeRes.ok) {
          throw new Error(`Analyze returned ${analyzeRes.status}`)
        }

        const result = await analyzeRes.json()
        return NextResponse.json({
          id: data.id,
          status: 'pending_approval',
          score: result.score,
          verdict: result.verdict,
        })
      } catch (err) {
        console.error('Genesis analysis failed, falling back to simple PRD:', err)

        // Fallback to basic PRD
        try {
          const generateUrl = `${protocol}://${baseUrl}/api/generate-prd`
          await fetch(generateUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ideaId: data.id }),
          })
        } catch (prdErr) {
          console.error('Fallback PRD also failed:', prdErr)
        }

        return NextResponse.json({
          id: data.id,
          status: 'generating_prd',
        })
      }
    }

    return NextResponse.json({
      id: data.id,
      status: data.status,
    })
  } catch (error) {
    console.error('Ingest error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
