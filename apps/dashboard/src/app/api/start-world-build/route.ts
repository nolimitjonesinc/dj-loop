import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

/**
 * Start World Build API
 *
 * Creates a world generation job and kicks off overnight character generation.
 */

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase environment variables not configured')
  }

  return createClient(url, key)
}

function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }
  return new Anthropic({ apiKey: key })
}

// ============================================
// INLINE CHARACTER GENERATOR (simplified)
// ============================================

interface WorldTemplate {
  id: string
  name: string
  era: string
  neighborhoods: Array<{ name: string; social_class: string; atmosphere: string }>
  factions: Array<{ name: string }>
  social_classes: Array<{ name: string; typical_professions: string[] }>
  cultural_groups: Array<{ name: string; typical_belonging: string }>
  character_count: number
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateCharacterSeed(world: WorldTemplate, index: number) {
  const neighborhood = pickRandom(world.neighborhoods)
  const socialClass = pickRandom(world.social_classes)
  const culturalGroup = pickRandom(world.cultural_groups)
  const faction = world.factions.length > 0 ? pickRandom(world.factions) : null

  const attachmentStyles = ['secure', 'anxious', 'avoidant', 'disorganized']
  const copingStyles = ['fight', 'flight', 'freeze', 'fawn']
  const emotionalClimates = [
    'warm_secure', 'functional_distant', 'cold_critical',
    'tense_walking_eggshells', 'chaotic_unpredictable'
  ]

  const age = 18 + Math.floor(Math.random() * 47)
  const gender = Math.random() > 0.5 ? 'female' : 'male'

  return {
    id: `chr_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
    world_id: world.id,
    age,
    gender,
    neighborhood: neighborhood.name,
    faction: faction?.name || null,
    social_class: socialClass.name,
    profession: pickRandom(socialClass.typical_professions || ['worker']),
    psychology: {
      world_context: {
        era: world.era,
        region: world.name,
        setting: neighborhood.name
      },
      cultural_identity: {
        group: culturalGroup.name,
        belonging: culturalGroup.typical_belonging
      },
      atmospheric_conditions: {
        emotional_climate: pickRandom(emotionalClimates),
        base_threat_level: Math.random() * 0.6 + 0.2
      },
      attachment: {
        style: pickRandom(attachmentStyles),
        coping_style: pickRandom(copingStyles)
      }
    },
    life_events: [],
    core_memories: [],
    relationships: [],
    generation_phase: 'seed',
    created_at: new Date().toISOString()
  }
}

async function generateCharacterName(
  anthropic: Anthropic,
  world: WorldTemplate,
  seed: ReturnType<typeof generateCharacterSeed>
): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: `Generate a single full name for a ${seed.age}-year-old ${seed.gender} character in ${world.name} (${world.era}), from the ${seed.psychology.cultural_identity.group} culture, ${seed.social_class} class. Just the name, nothing else.`
      }]
    })

    const content = response.content[0]
    if (content.type === 'text') {
      return content.text.trim()
    }
  } catch (e) {
    console.error('Name generation error:', e)
  }

  return `Character_${seed.id.slice(-6)}`
}

async function elaborateCharacter(
  anthropic: Anthropic,
  world: WorldTemplate,
  seed: ReturnType<typeof generateCharacterSeed>
) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Create brief character details for a ${seed.age}-year-old ${seed.gender} named [NAME] in ${world.name} (${world.era}).

Background:
- Social class: ${seed.social_class}
- Neighborhood: ${seed.neighborhood}
- Profession: ${seed.profession}
- Attachment style: ${seed.psychology.attachment.style}
- Coping style: ${seed.psychology.attachment.coping_style}
- Home atmosphere: ${seed.psychology.atmospheric_conditions.emotional_climate}

Provide JSON with:
{
  "visual_description": "2 sentences describing appearance",
  "core_wound": "What damaged them in childhood",
  "core_belief": "Their central belief about themselves",
  "voice_sample": "One line of dialogue showing how they speak",
  "story_hook": "One potential conflict for this character"
}

Just the JSON, no explanation.`
      }]
    })

    const content = response.content[0]
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    }
  } catch (e) {
    console.error('Elaboration error:', e)
  }

  return null
}

// ============================================
// UPDATE HELPERS
// ============================================

async function updateJob(
  supabase: ReturnType<typeof getSupabase>,
  jobId: string,
  updates: Record<string, unknown>
) {
  await supabase.from('dj_world_jobs').update(updates).eq('id', jobId)
}

async function addLog(
  supabase: ReturnType<typeof getSupabase>,
  jobId: string,
  message: string
) {
  const { data } = await supabase
    .from('dj_world_jobs')
    .select('logs')
    .eq('id', jobId)
    .single()

  const logs = [...(data?.logs || []), message]
  await supabase.from('dj_world_jobs').update({ logs }).eq('id', jobId)
}

// ============================================
// MAIN GENERATION LOOP
// ============================================

async function runWorldGeneration(
  supabase: ReturnType<typeof getSupabase>,
  anthropic: Anthropic,
  jobId: string,
  world: WorldTemplate
) {
  const characters: Array<ReturnType<typeof generateCharacterSeed> & { name: string }> = []

  try {
    for (let i = 0; i < world.character_count; i++) {
      const progress = Math.round((i / world.character_count) * 100)

      await updateJob(supabase, jobId, {
        progress,
        current_phase: `Character ${i + 1}/${world.character_count}`,
        characters_generated: i
      })

      // Generate seed
      const seed = generateCharacterSeed(world, i)

      // Generate name
      const name = await generateCharacterName(anthropic, world, seed)

      // Elaborate
      const elaborations = await elaborateCharacter(anthropic, world, seed)

      // Save
      const character = { ...seed, name, elaborations, generation_phase: 'complete' }

      await supabase.from('dj_world_characters').insert(character)

      characters.push(character)
      await addLog(supabase, jobId, `Generated: ${name}`)

      // Rate limit delay
      await new Promise(r => setTimeout(r, 1500))
    }

    // Complete
    await updateJob(supabase, jobId, {
      status: 'completed',
      progress: 100,
      current_phase: 'Complete!',
      characters_generated: world.character_count,
      completed_at: new Date().toISOString()
    })

    await supabase
      .from('dj_worlds')
      .update({ status: 'completed' })
      .eq('id', world.id)

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await updateJob(supabase, jobId, {
      status: 'failed',
      error_message: msg
    })
  }
}

// ============================================
// API ENDPOINT
// ============================================

export async function POST(request: Request) {
  try {
    const supabase = getSupabase()
    const anthropic = getAnthropic()
    const body = await request.json()

    const worldId = body.worldId

    if (!worldId) {
      return NextResponse.json({ error: 'worldId required' }, { status: 400 })
    }

    // Fetch world
    const { data: world, error: worldError } = await supabase
      .from('dj_worlds')
      .select('*')
      .eq('id', worldId)
      .single()

    if (worldError || !world) {
      return NextResponse.json({ error: 'World not found' }, { status: 404 })
    }

    if (world.status !== 'approved') {
      return NextResponse.json({ error: 'World not approved' }, { status: 400 })
    }

    // Update world status
    await supabase
      .from('dj_worlds')
      .update({ status: 'generating' })
      .eq('id', worldId)

    // Create job
    const { data: job, error: jobError } = await supabase
      .from('dj_world_jobs')
      .insert({
        world_id: worldId,
        status: 'running',
        progress: 0,
        current_phase: 'Starting...',
        characters_generated: 0,
        characters_total: world.character_count,
        started_at: new Date().toISOString(),
        logs: ['Job started']
      })
      .select('id')
      .single()

    if (jobError || !job) {
      throw new Error('Failed to create job')
    }

    // Run in background
    runWorldGeneration(supabase, anthropic, job.id, world as WorldTemplate).catch(err => {
      console.error('Generation error:', err)
    })

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: `Started generating ${world.character_count} characters for ${world.name}`
    })

  } catch (error) {
    console.error('Start world build error:', error)
    return NextResponse.json({ error: 'Failed to start' }, { status: 500 })
  }
}

// GET: Check job status
export async function GET(request: Request) {
  try {
    const supabase = getSupabase()
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (jobId) {
      const { data: job } = await supabase
        .from('dj_world_jobs')
        .select('*')
        .eq('id', jobId)
        .single()

      return NextResponse.json({ job })
    }

    // List all active jobs
    const { data: jobs } = await supabase
      .from('dj_active_world_jobs')
      .select('*')

    return NextResponse.json({ jobs })

  } catch (error) {
    console.error('Get status error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
