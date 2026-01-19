import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exec } from 'child_process'
import { promisify } from 'util'
import { mkdir, writeFile, rm, readFile, access } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const execAsync = promisify(exec)

// Retry configuration
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 5000

// Parse PRD to extract expected character count
function extractExpectedCharacterCount(prd: string): number {
  // Look for patterns like:
  // "12 characters" or "twelve characters"
  // "CHARACTERS (12)" or "Characters: 12"
  // "generate 12 characters"
  // "12 unique characters"

  const patterns = [
    /(\d+)\s+characters/i,
    /characters\s*[:\(]\s*(\d+)/i,
    /generate\s+(\d+)\s+/i,
    /create\s+(\d+)\s+characters/i,
    /(\d+)\s+unique\s+characters/i,
    /total\s+of\s+(\d+)\s+characters/i,
  ]

  for (const pattern of patterns) {
    const match = prd.match(pattern)
    if (match) {
      const count = parseInt(match[1], 10)
      if (count > 0 && count <= 100) { // Sanity check
        return count
      }
    }
  }

  // Word number patterns
  const wordNumbers: Record<string, number> = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
    'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
  }

  for (const [word, num] of Object.entries(wordNumbers)) {
    const wordPattern = new RegExp(`${word}\\s+characters`, 'i')
    if (prd.match(wordPattern)) {
      return num
    }
  }

  // Default: if we can't find a count, assume 1
  return 1
}

// =============================================================================
// UNIVERSAL BUILD VERIFICATION SYSTEM
// Defines what "success" means for each project type and generates human-readable reports
// =============================================================================

interface BuildReport {
  success: boolean
  projectType: string
  title: string

  // What was supposed to be created
  expected: {
    description: string
    items: string[]
  }

  // What was actually created (verified)
  actual: {
    description: string
    items: { name: string; status: 'pass' | 'fail'; detail: string }[]
  }

  // Plain English summary for non-technical users
  summary: {
    headline: string      // "Your app is live!" or "Build failed"
    explanation: string   // What this means
    location: string      // Where to find it
    nextSteps: string[]   // What to do next
  }

  // Technical details (for debugging)
  technical: {
    buildId: string
    repoUrl: string | null
    deployedUrl: string | null
    errorMessage: string | null
  }
}

// Success criteria for each project type
// Written for NON-TECHNICAL users who just want their thing to work
const PROJECT_SUCCESS_CRITERIA: Record<string, {
  requires: string[]
  description: string
  locationTemplate: string
  nextStepsSuccess: string[]
  nextStepsFailure: string[]
}> = {
  'utility-app': {
    requires: ['deployed_url', 'build_passes'],
    description: 'a website you can use right now',
    locationTemplate: '{deployed_url}',
    nextStepsSuccess: [
      'Click the green button below to open your website',
      'Bookmark it so you can find it later',
      'Share the link with anyone you want to use it',
    ],
    nextStepsFailure: [
      'Click the purple "Copy Report" button above',
      'Open Claude and paste it there',
      'Claude will help you fix it',
    ],
  },
  'adhd-game': {
    requires: ['deployed_url', 'build_passes'],
    description: 'a game you can play right now',
    locationTemplate: '{deployed_url}',
    nextStepsSuccess: [
      'Click the green button below to play your game',
      'Works on your phone too - just open the link',
      'Share it with friends!',
    ],
    nextStepsFailure: [
      'Click the purple "Copy Report" button above',
      'Open Claude and paste it there',
      'Claude will help you fix it',
    ],
  },
  'chrome-extension': {
    requires: ['repo_url', 'build_passes'],
    description: 'a Chrome browser add-on',
    locationTemplate: 'Ready to install',
    nextStepsSuccess: [
      'Ask Claude to help you install this extension',
      'Say: "Help me install this Chrome extension" and paste the report',
      'Claude will walk you through it step by step',
    ],
    nextStepsFailure: [
      'Click the purple "Copy Report" button above',
      'Open Claude and paste it there',
      'Claude will help you fix it',
    ],
  },
  'api': {
    requires: ['repo_url', 'build_passes'],
    description: 'a backend service',
    locationTemplate: 'Code is saved and ready',
    nextStepsSuccess: [
      'This is a technical project - the code is saved',
      'Ask Claude to help you deploy it',
      'Say: "Help me deploy this API" and paste the report',
    ],
    nextStepsFailure: [
      'Click the purple "Copy Report" button above',
      'Open Claude and paste it there',
      'Claude will help you fix it',
    ],
  },
  'script': {
    requires: ['repo_url', 'build_passes'],
    description: 'a utility script',
    locationTemplate: 'Code is saved and ready',
    nextStepsSuccess: [
      'This is a technical project - the code is saved',
      'Ask Claude to help you run it',
      'Say: "Help me run this script" and paste the report',
    ],
    nextStepsFailure: [
      'Click the purple "Copy Report" button above',
      'Open Claude and paste it there',
      'Claude will help you fix it',
    ],
  },
  'world-builder': {
    requires: ['characters_verified'],
    description: 'characters for your story',
    locationTemplate: 'Saved to your computer',
    nextStepsSuccess: [
      'Your characters are saved!',
      'Find them in the "generated-characters" folder',
      'Open the .md files to read about each character',
    ],
    nextStepsFailure: [
      'Click the purple "Copy Report" button above',
      'Open Claude and paste it there',
      'Claude will help you fix it',
    ],
  },
}

// Verify world-builder results
async function verifyWorldBuilderResults(
  supabase: ReturnType<typeof getSupabase>,
  buildId: string,
  prd: string
): Promise<{ success: boolean; expected: number; actual: number; message: string }> {
  const expected = extractExpectedCharacterCount(prd)

  // Count characters that were saved for THIS build
  const { count, error } = await supabase
    .from('dj_world_characters')
    .select('*', { count: 'exact', head: true })
    .eq('build_id', buildId)

  if (error) {
    return { success: false, expected, actual: 0, message: `Database error: ${error.message}` }
  }

  const actual = count || 0

  if (actual === 0) {
    return { success: false, expected, actual: 0, message: 'No characters were saved to the database' }
  }

  if (actual < expected) {
    return { success: false, expected, actual, message: `Only ${actual} of ${expected} characters were saved` }
  }

  return { success: true, expected, actual, message: `All ${actual} characters saved successfully` }
}

// Generate a complete build report for any project type
async function generateBuildReport(
  supabase: ReturnType<typeof getSupabase>,
  buildId: string,
  config: { title: string; projectDna: string; prd: string },
  results: { repoUrl: string | null; deployedUrl: string | null; buildPassed: boolean; errorMessage: string | null }
): Promise<BuildReport> {
  const criteria = PROJECT_SUCCESS_CRITERIA[config.projectDna] || PROJECT_SUCCESS_CRITERIA['utility-app']
  const checks: { name: string; status: 'pass' | 'fail'; detail: string }[] = []
  let allPassed = true

  // Check each requirement - use SIMPLE language for non-technical users
  for (const req of criteria.requires) {
    switch (req) {
      case 'deployed_url':
        if (results.deployedUrl) {
          checks.push({ name: 'Website is live', status: 'pass', detail: 'Ready to use!' })
        } else {
          checks.push({ name: 'Website is live', status: 'fail', detail: 'Could not create website' })
          allPassed = false
        }
        break

      case 'repo_url':
        if (results.repoUrl) {
          checks.push({ name: 'Code is saved', status: 'pass', detail: 'Backed up safely' })
        } else {
          checks.push({ name: 'Code is saved', status: 'fail', detail: 'Could not save code' })
          allPassed = false
        }
        break

      case 'build_passes':
        if (results.buildPassed) {
          checks.push({ name: 'Everything works', status: 'pass', detail: 'No errors found' })
        } else {
          checks.push({ name: 'Everything works', status: 'fail', detail: 'Something went wrong' })
          allPassed = false
        }
        break

      case 'characters_verified':
        const charVerify = await verifyWorldBuilderResults(supabase, buildId, config.prd)
        if (charVerify.success) {
          checks.push({ name: 'Characters created', status: 'pass', detail: `All ${charVerify.actual} characters saved` })
        } else {
          checks.push({ name: 'Characters created', status: 'fail', detail: charVerify.message })
          allPassed = false
        }
        break
    }
  }

  // Build location string
  let location = criteria.locationTemplate
    .replace('{deployed_url}', results.deployedUrl || 'Not available')
    .replace('{repo_url}', results.repoUrl || 'Not available')

  // Generate summary - SIMPLE language for non-technical users
  const summary = {
    headline: allPassed ? '✅ Done!' : '❌ Something went wrong',
    explanation: allPassed
      ? `Your ${criteria.description} is ready.`
      : `Could not finish creating your ${criteria.description}.`,
    location: allPassed ? location : '',
    nextSteps: allPassed ? criteria.nextStepsSuccess : criteria.nextStepsFailure,
  }

  return {
    success: allPassed,
    projectType: config.projectDna,
    title: config.title,
    expected: {
      description: criteria.description,
      items: criteria.requires.map(r => {
        switch (r) {
          case 'deployed_url': return 'Live website URL'
          case 'repo_url': return 'GitHub repository'
          case 'build_passes': return 'Code that compiles'
          case 'characters_verified': return 'All requested characters saved'
          default: return r
        }
      }),
    },
    actual: {
      description: allPassed ? 'All requirements met' : 'Some requirements not met',
      items: checks,
    },
    summary,
    technical: {
      buildId,
      repoUrl: results.repoUrl,
      deployedUrl: results.deployedUrl,
      errorMessage: results.errorMessage,
    },
  }
}

// Save build report to database
async function saveBuildReport(
  supabase: ReturnType<typeof getSupabase>,
  buildId: string,
  report: BuildReport
) {
  await supabase
    .from('dj_builds')
    .update({
      build_report: report,
    })
    .eq('id', buildId)
}

// Full paths to CLI tools (dashboard runs with limited PATH)
const CLI_PATHS = {
  gh: '/opt/homebrew/bin/gh',
  vercel: '/Users/dannyjonesphotography/.npm-global/bin/vercel',
  claude: '/Users/dannyjonesphotography/.claude/local/claude',
}

// Helper to run Claude CLI - uses JSON output format for reliable programmatic use
function runClaudeCommand(prompt: string, cwd: string, timeout: number = 600000): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process')

    // Escape the prompt for bash - handle both double quotes and backticks
    const escapedPrompt = prompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$')
    const cmd = `${CLI_PATHS.claude} -p "${escapedPrompt}" --dangerously-skip-permissions --output-format json`

    const child = spawn('bash', ['-c', cmd], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data: Buffer) => { stdout += data.toString() })
    child.stderr.on('data', (data: Buffer) => { stderr += data.toString() })

    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`Claude command timed out after ${timeout/1000}s`))
    }, timeout)

    child.on('close', (code: number) => {
      clearTimeout(timer)
      if (code === 0) {
        // Parse JSON output to get the result text
        try {
          const result = JSON.parse(stdout)
          resolve({ stdout: result.result || stdout, stderr })
        } catch {
          resolve({ stdout, stderr })
        }
      } else {
        const error = new Error(`Claude exited with code ${code}`) as Error & { stdout: string; stderr: string }
        error.stdout = stdout
        error.stderr = stderr
        reject(error)
      }
    })

    child.on('error', (err: Error) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase environment variables not configured')
  }

  return createClient(url, key)
}

interface BuildConfig {
  ideaId: string
  title: string
  prd: string
  projectDna: string
}

function generateRepoName(title: string): string {
  // Add timestamp suffix to avoid collisions with existing repos
  const timestamp = Date.now().toString(36).slice(-4) // Short 4-char timestamp
  const baseName = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .slice(0, 45) || 'dj-loop-project'

  return `${baseName}-${timestamp}`
}

// Analyze error and generate fix instructions for retry
function analyzeErrorAndCreateFixPrompt(
  error: string,
  stderr: string,
  stdout: string,
  attempt: number
): string {
  const combinedOutput = `${error}\n${stderr}\n${stdout}`.toLowerCase()
  const fixes: string[] = []

  // Common error patterns and their fixes
  if (combinedOutput.includes('module not found') || combinedOutput.includes('cannot find module')) {
    const moduleMatch = combinedOutput.match(/cannot find module ['"]([^'"]+)['"]/i)
    if (moduleMatch) {
      fixes.push(`Install missing module: npm install ${moduleMatch[1]}`)
    } else {
      fixes.push('Check for missing npm dependencies and install them')
    }
  }

  if (combinedOutput.includes('typescript') || combinedOutput.includes('type error') || combinedOutput.includes('ts(')) {
    fixes.push('Fix TypeScript type errors - check for missing types or incorrect type usage')
  }

  if (combinedOutput.includes('syntax error') || combinedOutput.includes('unexpected token')) {
    fixes.push('Fix JavaScript/TypeScript syntax errors in the code')
  }

  if (combinedOutput.includes('eslint') || combinedOutput.includes('lint')) {
    fixes.push('Fix ESLint errors - run npm run lint and fix all issues')
  }

  if (combinedOutput.includes('build failed') || combinedOutput.includes('next build')) {
    fixes.push('Run npm run build and fix any build errors')
  }

  if (combinedOutput.includes('permission denied')) {
    fixes.push('Check file permissions')
  }

  if (combinedOutput.includes('enoent') || combinedOutput.includes('no such file')) {
    fixes.push('Check that all required files exist')
  }

  if (combinedOutput.includes('port') && combinedOutput.includes('in use')) {
    fixes.push('Port conflict - use a different port')
  }

  // If no specific fixes identified, provide general guidance
  if (fixes.length === 0) {
    fixes.push('Review the error message and fix the underlying issue')
    fixes.push('Make sure all code compiles without errors')
    fixes.push('Run npm run build to verify the project builds')
  }

  return `
## RETRY ATTEMPT ${attempt} of ${MAX_ATTEMPTS}

The previous attempt failed. Here's what went wrong and what you need to fix:

### Error Details
\`\`\`
${error.slice(0, 500)}
${stderr ? `\nSTDERR: ${stderr.slice(0, 500)}` : ''}
\`\`\`

### What to Fix
${fixes.map(f => `- ${f}`).join('\n')}

### Instructions
1. Read the error carefully
2. Fix the specific issue
3. Make sure npm run build succeeds
4. Verify all code compiles without errors

DO NOT skip this step. The previous attempt failed and you MUST fix the issues.
`
}

async function updateBuildProgress(
  supabase: ReturnType<typeof getSupabase>,
  buildId: string,
  updates: {
    status?: string
    progress?: number
    current_phase?: string
    logs?: string[]
    error_message?: string
    repo_url?: string
    deployed_url?: string
  }
) {
  const updateData: Record<string, unknown> = { ...updates }

  // Append logs instead of replacing
  if (updates.logs && updates.logs.length > 0) {
    const { data: currentBuild } = await supabase
      .from('dj_builds')
      .select('logs')
      .eq('id', buildId)
      .single()

    updateData.logs = [...(currentBuild?.logs || []), ...updates.logs]
  }

  await supabase.from('dj_builds').update(updateData).eq('id', buildId)
}

// Special build process for world-builder - generates characters, saves to Supabase
async function runWorldBuilderProcess(
  supabase: ReturnType<typeof getSupabase>,
  buildId: string,
  config: BuildConfig
) {
  const projectDir = join(tmpdir(), `dj-world-${Date.now()}`)

  try {
    // Phase 1: Check Claude CLI
    await updateBuildProgress(supabase, buildId, {
      progress: 5,
      current_phase: 'Checking prerequisites...',
      logs: ['Starting world builder process'],
    })

    try {
      await execAsync(`${CLI_PATHS.claude} --version`)
    } catch {
      throw new Error('Claude Code CLI not installed')
    }

    // Phase 2: Setup project directory with Supabase access
    await mkdir(projectDir, { recursive: true })
    await updateBuildProgress(supabase, buildId, {
      progress: 10,
      current_phase: 'Setting up environment...',
      logs: [`Created temp directory: ${projectDir}`],
    })

    // Write PRD
    await writeFile(join(projectDir, 'PRD.md'), config.prd)

    // Write a working JavaScript save script with credentials baked in
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const saveScript = `
// save-character.js - Run this to save a character to Supabase
// Usage: node save-character.js
// IMPORTANT: Each character will be tagged with build_id for verification

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const BUILD_ID = '${buildId}' // Tracked for verification

const supabase = createClient(
  '${supabaseUrl}',
  '${supabaseKey}'
)

// Read character JSON from file passed as argument or from character.json
const characterFile = process.argv[2] || 'character.json'

let savedCount = 0
let failedCount = 0

try {
  const characterData = JSON.parse(readFileSync(characterFile, 'utf-8'))

  // Handle single character or array of characters
  const characters = Array.isArray(characterData) ? characterData : [characterData]
  const totalExpected = characters.length

  console.log('\\n📊 VERIFICATION: Expecting to save', totalExpected, 'character(s)')
  console.log('Build ID:', BUILD_ID)
  console.log('')

  for (const character of characters) {
    console.log('Saving character:', character.name)

    // Add build_id to track which build created this character
    const characterWithBuild = {
      ...character,
      build_id: BUILD_ID,
    }

    const { data, error } = await supabase
      .from('dj_world_characters')
      .insert(characterWithBuild)
      .select()
      .single()

    if (error) {
      console.error('❌ Failed to save', character.name, ':', error.message)
      failedCount++
    } else {
      console.log('✅ Saved:', character.name, '- ID:', data.id)
      savedCount++
    }
  }

  console.log('')
  console.log('═══════════════════════════════════════')
  console.log('📊 VERIFICATION RESULTS:')
  console.log('   Expected:', totalExpected)
  console.log('   Saved:   ', savedCount)
  console.log('   Failed:  ', failedCount)
  console.log('═══════════════════════════════════════')

  if (savedCount === totalExpected && failedCount === 0) {
    console.log('✅ SUCCESS: All', totalExpected, 'characters saved!')
  } else if (savedCount > 0) {
    console.log('⚠️ PARTIAL: Only', savedCount, 'of', totalExpected, 'characters saved')
    process.exit(1)
  } else {
    console.log('❌ FAILED: No characters were saved')
    process.exit(1)
  }

} catch (err) {
  console.error('Error:', err.message)
  process.exit(1)
}
`
    await writeFile(join(projectDir, 'save-character.js'), saveScript)

    // Write package.json
    const packageJson = {
      name: 'world-builder-job',
      type: 'module',
      dependencies: {
        '@supabase/supabase-js': '^2.39.0',
      },
    }
    await writeFile(join(projectDir, 'package.json'), JSON.stringify(packageJson, null, 2))

    // Where to save readable character files
    const outputDir = '/Users/dannyjonesphotography/Desktop/DJ-Projects/dj-loop/generated-characters'

    // Write CLAUDE.md with clear instructions
    const claudeMd = `# World Builder Job

## Your Task
Generate deeply-layered characters based on PRD.md and save them to Supabase.

## CHARACTER JSON STRUCTURE

Your character.json MUST include a \`markdown_summary\` field - a human-readable version of the character. This gets stored in the database so admins can read it without parsing JSON.

\`\`\`json
{
  "id": "chr_[timestamp]_[random]",
  "name": "Kira Voss",
  "age": 28,
  "gender": "female",
  "neighborhood": "The Substrate",
  "faction": "The Unwritten",
  "social_class": "lower",
  "profession": "Information Broker",
  "narrative_role": "Protagonist",
  "psychology": { /* full 8-layer system */ },
  "life_events": [ /* 80-150 events */ ],
  "core_memories": [ /* 5-15 memories */ ],
  "elaborations": { /* visual, voice, hooks */ },
  "markdown_summary": "# Kira Voss\\n\\n**Age:** 28 | **Profession:** Information Broker...\\n\\n## Visual Description\\n..."
}
\`\`\`

## MARKDOWN_SUMMARY FORMAT

The \`markdown_summary\` field should be a complete, readable character profile:

\`\`\`markdown
# [Character Name]
**Age:** 28 | **Profession:** Information Broker | **Faction:** The Unwritten | **Role:** Protagonist

## Visual Description
[2-3 sentences describing how they look, move, dress]

## Voice Samples
> "[Something they'd say when calm]"
> "[Something they'd say under stress]"
> "[Something they'd say to someone they love]"

## Psychology Summary
**Attachment Style:** Anxious-preoccupied
**Core Wound:** Abandonment (father left at age 7)
**Coping Style:** Fawn - people-pleasing, anticipating needs

### Core Beliefs
- About Self: "I am only lovable when I perform"
- About Others: "Others will eventually leave"
- About World: "The game is rigged"

## Family Background
**Mother:** Regina - Parentified as a child, emotionally unavailable, works double shifts
**Father:** Marcus - Left when she was 7, sends birthday cards sometimes

## Key Memories
1. **Age 5:** Mother praised younger brother's drawing while ignoring hers. Concluded: "My efforts don't matter."
2. **Age 7:** Father left. No goodbye. Concluded: "People leave. Don't get attached."
3. **Age 12:** Teacher noticed her writing, encouraged her. First adult who saw her.

## Story Hooks
- Her father has resurfaced after 15 years. He needs something.
- She's been offered a promotion that requires her to stop helping everyone.
- Someone she helped has accused her of being controlling.
\`\`\`

## Steps
1. Run \`npm install\`
2. Read PRD.md for the full 8-layer psychology system and count how many characters are requested
3. Generate ALL characters specified in the PRD (if PRD says 12 characters, make 12!)
4. Each character needs FULL depth (80-150 life events!)
5. Include \`markdown_summary\` field with readable profile for each
6. Include \`narrative_role\` field matching the PRD requirements
7. Write ALL characters to character.json as an array: [{...}, {...}, ...]
8. Run \`node save-character.js\` - verify "✅ Saved" for each character

## Important
- Generate ALL characters requested in the PRD, not just one!
- The \`markdown_summary\` is REQUIRED - it's how humans will read the character
- Each character needs 80-150 life events (not 10!)
- Include full 8-layer psychology in the \`psychology\` field
- The markdown_summary should be ENJOYABLE to read, not just data
- character.json should be an ARRAY of characters if multiple are requested
`
    await writeFile(join(projectDir, 'CLAUDE.md'), claudeMd)

    await updateBuildProgress(supabase, buildId, {
      progress: 20,
      current_phase: 'init: Environment ready',
      logs: ['PRD.md written', 'save-character.js configured with Supabase credentials', 'Ready for character generation'],
    })

    // Phase 3: Install dependencies
    await updateBuildProgress(supabase, buildId, {
      progress: 25,
      current_phase: 'Installing dependencies...',
    })

    await execAsync('npm install', { cwd: projectDir, timeout: 60000 })

    await updateBuildProgress(supabase, buildId, {
      progress: 30,
      logs: ['Dependencies installed'],
    })

    // Phase 4: Run Claude Code to generate characters (with retry loop)
    let buildSucceeded = false
    let lastError = ''
    let lastStderr = ''
    let lastStdout = ''

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const progressBase = 35 + (attempt - 1) * 15 // 35, 50, 65 for attempts 1, 2, 3

      await updateBuildProgress(supabase, buildId, {
        progress: progressBase,
        current_phase: `implement: Claude attempt ${attempt}/${MAX_ATTEMPTS}`,
        logs: [`🔄 Starting Claude attempt ${attempt} of ${MAX_ATTEMPTS}...`],
      })

      let claudePrompt = `IMPORTANT: Read CLAUDE.md first for exact instructions.

Your task:
1. Run npm install
2. Read PRD.md - count how many characters are requested (look for "CHARACTERS" section)
3. Generate ALL characters with FULL 8-layer psychology, 80-150 life events each
4. CRITICAL: Include "markdown_summary" field in each character's JSON
5. Include "narrative_role" field matching what PRD specifies (Protagonist, Antagonist, etc.)
6. Write ALL characters to character.json as an ARRAY: [{...}, {...}, ...]
7. Run: node save-character.js (verify "✅ Saved" for EACH character)

If PRD requests 12 characters, you must generate 12 characters. Do not stop at 1.`

      if (attempt > 1 && lastError) {
        const fixPrompt = analyzeErrorAndCreateFixPrompt(lastError, lastStderr, lastStdout, attempt)
        await writeFile(join(projectDir, 'FIX_REQUIRED.md'), fixPrompt)
        claudePrompt = `IMPORTANT: Read FIX_REQUIRED.md first - the previous attempt failed. Fix the issues described there. Then continue with PRD.md and CLAUDE.md to generate characters.`
      }

      try {
        const { stdout: claudeOutput } = await runClaudeCommand(
          claudePrompt,
          projectDir,
          1800000 // 30 minutes for character generation
        )

        // VERIFICATION: Compare expected characters (from PRD) vs actual saved (in database)
        const verification = await verifyWorldBuilderResults(supabase, buildId, config.prd)

        await updateBuildProgress(supabase, buildId, {
          logs: [
            `📊 Verification: Expected ${verification.expected}, Found ${verification.actual}`,
          ],
        })

        if (verification.success) {
          buildSucceeded = true
          await updateBuildProgress(supabase, buildId, {
            progress: 90,
            current_phase: 'Characters verified!',
            logs: [
              `✅ Attempt ${attempt} succeeded!`,
              verification.message,
              `Claude output: ${claudeOutput.slice(0, 300)}...`,
            ],
          })
          break
        } else {
          lastError = verification.message
          lastStderr = ''
          lastStdout = claudeOutput

          await updateBuildProgress(supabase, buildId, {
            logs: [
              `⚠️ Attempt ${attempt} - verification failed`,
              verification.message,
            ],
          })

          if (attempt < MAX_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
          }
        }

      } catch (claudeError: unknown) {
        const err = claudeError as { message?: string; stderr?: string; stdout?: string }
        lastError = err.message || String(claudeError)
        lastStderr = err.stderr || ''
        lastStdout = err.stdout || ''

        await updateBuildProgress(supabase, buildId, {
          logs: [
            `❌ Attempt ${attempt} - Claude failed`,
            `Error: ${lastError.slice(0, 200)}`,
            lastStderr ? `stderr: ${lastStderr.slice(0, 200)}` : '',
          ].filter(Boolean),
        })

        if (attempt < MAX_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
        }
      }
    }

    if (!buildSucceeded) {
      // Generate failure report
      const failReport = await generateBuildReport(
        supabase,
        buildId,
        { title: config.title, projectDna: config.projectDna, prd: config.prd },
        { repoUrl: null, deployedUrl: null, buildPassed: false, errorMessage: lastError }
      )
      await saveBuildReport(supabase, buildId, failReport)

      await updateBuildProgress(supabase, buildId, {
        status: 'failed',
        progress: 0,
        current_phase: 'Failed after all retries',
        error_message: `Failed after ${MAX_ATTEMPTS} attempts: ${lastError.slice(0, 200)}`,
        logs: [
          `❌ WORLD BUILDER FAILED after ${MAX_ATTEMPTS} attempts`,
          `Final error: ${lastError.slice(0, 500)}`,
          `📋 Report: ${failReport.summary.headline}`,
        ],
      })

      await supabase
        .from('dj_ideas')
        .update({ status: 'approved' })
        .eq('id', config.ideaId)

      return
    }

    // Copy character files to generated-characters folder before cleanup
    try {
      const characterJsonPath = join(projectDir, 'character.json')
      await access(characterJsonPath) // Check if file exists

      const characterData = await readFile(characterJsonPath, 'utf-8')
      const parsed = JSON.parse(characterData)
      const characters = Array.isArray(parsed) ? parsed : [parsed]
      const timestamp = Date.now()

      // Ensure output directory exists
      await mkdir(outputDir, { recursive: true })

      const savedFiles: string[] = []
      for (const character of characters) {
        const characterName = character.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'unnamed'

        // Save JSON file
        const jsonFilename = `${characterName}-${timestamp}.json`
        await writeFile(join(outputDir, jsonFilename), JSON.stringify(character, null, 2))
        savedFiles.push(jsonFilename)

        // Save markdown summary as separate file for easy reading
        if (character.markdown_summary) {
          const mdFilename = `${characterName}-${timestamp}.md`
          await writeFile(join(outputDir, mdFilename), character.markdown_summary)
        }
      }

      await updateBuildProgress(supabase, buildId, {
        logs: [`📁 Saved ${savedFiles.length} character(s) to generated-characters/`],
      })
    } catch (copyErr) {
      // Don't fail the build if copy fails - characters are already in Supabase
      console.error('Failed to copy character files:', copyErr)
      await updateBuildProgress(supabase, buildId, {
        logs: ['⚠️ Could not save local character files (characters still saved to database)'],
      })
    }

    // Phase 5: Generate and save build report
    const report = await generateBuildReport(
      supabase,
      buildId,
      { title: config.title, projectDna: config.projectDna, prd: config.prd },
      { repoUrl: null, deployedUrl: null, buildPassed: true, errorMessage: null }
    )
    await saveBuildReport(supabase, buildId, report)

    // Mark complete
    await updateBuildProgress(supabase, buildId, {
      status: 'completed',
      progress: 100,
      current_phase: 'Complete!',
      logs: [
        'World building complete!',
        `📋 Report: ${report.summary.headline}`,
      ],
    })

    // Update idea status
    await supabase
      .from('dj_ideas')
      .update({ status: 'shipped' })
      .eq('id', config.ideaId)

    await supabase
      .from('dj_builds')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', buildId)

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)

    await updateBuildProgress(supabase, buildId, {
      status: 'failed',
      progress: 0,
      current_phase: 'Failed',
      error_message: errorMsg,
      logs: [`World builder failed: ${errorMsg}`],
    })

    await supabase
      .from('dj_ideas')
      .update({ status: 'approved' })
      .eq('id', config.ideaId)

  } finally {
    try {
      await rm(projectDir, { recursive: true, force: true })
    } catch {}
  }
}

async function runBuildProcess(
  supabase: ReturnType<typeof getSupabase>,
  buildId: string,
  config: BuildConfig
) {
  // World-builder has a different flow - no GitHub, no Vercel
  if (config.projectDna === 'world-builder') {
    return runWorldBuilderProcess(supabase, buildId, config)
  }

  const repoName = generateRepoName(config.title)
  const projectDir = join(tmpdir(), `dj-build-${repoName}-${Date.now()}`)

  try {
    // Phase 1: Check prerequisites
    await updateBuildProgress(supabase, buildId, {
      progress: 5,
      current_phase: 'check: Verifying CLI tools',
      logs: ['Starting build process'],
    })

    // Check for gh CLI
    try {
      await execAsync(`${CLI_PATHS.gh} --version`)
    } catch {
      throw new Error('GitHub CLI (gh) not installed')
    }

    // Check for vercel CLI
    try {
      await execAsync(`${CLI_PATHS.vercel} --version`)
    } catch {
      throw new Error('Vercel CLI not installed')
    }

    // Check for claude CLI
    try {
      await execAsync(`${CLI_PATHS.claude} --version`)
    } catch {
      throw new Error('Claude Code CLI not installed')
    }

    // Phase 2: Create temp directory
    await mkdir(projectDir, { recursive: true })
    await updateBuildProgress(supabase, buildId, {
      progress: 10,
      current_phase: 'repo: Preparing workspace',
      logs: [`Created temp directory: ${projectDir}`],
    })

    // Phase 3: Create GitHub repo
    await updateBuildProgress(supabase, buildId, {
      progress: 15,
      current_phase: 'repo: Creating GitHub repository',
    })

    // All DJ Loop builds go to the Nolimit-Labs-Projects organization
    const repoFullName = `Nolimit-Labs-Projects/${repoName}`
    await execAsync(`${CLI_PATHS.gh} repo create ${repoFullName} --private --description "Auto-built: ${config.title}" --clone=false`)

    const { stdout: repoUrlOutput } = await execAsync(`${CLI_PATHS.gh} repo view ${repoFullName} --json url -q .url`)
    const repoUrl = repoUrlOutput.trim()

    await updateBuildProgress(supabase, buildId, {
      repo_url: repoUrl,
      logs: [`Created repo: ${repoUrl}`],
    })

    // Phase 4: Initialize project based on DNA
    await updateBuildProgress(supabase, buildId, {
      progress: 20,
      current_phase: 'init: Setting up project structure',
    })

    const initCommands: Record<string, string> = {
      'utility-app': 'npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes',
      'chrome-extension': 'npm init -y',
      'adhd-game': 'npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes',
      api: 'npm init -y && npm install hono @hono/node-server typescript @types/node',
      script: 'npm init -y && npm install typescript @types/node ts-node',
    }

    const initCommand = initCommands[config.projectDna] || initCommands['utility-app']
    await execAsync(initCommand, { cwd: projectDir, timeout: 120000 })

    // Write PRD and CLAUDE.md
    await writeFile(join(projectDir, 'PRD.md'), config.prd)

    const claudeInstructions = `# ${config.title}

## Project Type
${config.projectDna}

## Instructions
Implement this project according to PRD.md.

## Requirements
- Follow the PRD exactly
- Keep it minimal and functional
- No unnecessary features
- Use TypeScript
- Make sure it builds without errors

## When Done
Ensure the project builds and basic functionality works.
`
    await writeFile(join(projectDir, 'CLAUDE.md'), claudeInstructions)

    await updateBuildProgress(supabase, buildId, {
      progress: 30,
      current_phase: 'init: Project ready for implementation',
      logs: ['Project structure initialized', 'PRD.md and CLAUDE.md written'],
    })

    // Phase 5: Run Claude Code to implement (with retry loop)
    let buildSucceeded = false
    let lastError = ''
    let lastStderr = ''
    let lastStdout = ''

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const progressBase = 40 + (attempt - 1) * 10 // 40, 50, 60 for attempts 1, 2, 3

      await updateBuildProgress(supabase, buildId, {
        progress: progressBase,
        current_phase: `implement: Claude attempt ${attempt}/${MAX_ATTEMPTS}`,
        logs: [`🔄 Starting Claude attempt ${attempt} of ${MAX_ATTEMPTS}...`],
      })

      // Build the prompt - add fix instructions if this is a retry
      let claudePrompt = `Read PRD.md and implement the project completely. Make sure all features are working and the code builds without errors.`

      if (attempt > 1 && lastError) {
        const fixPrompt = analyzeErrorAndCreateFixPrompt(lastError, lastStderr, lastStdout, attempt)
        // Write fix instructions to a file so Claude can see them
        await writeFile(join(projectDir, 'FIX_REQUIRED.md'), fixPrompt)
        claudePrompt = `IMPORTANT: Read FIX_REQUIRED.md first - the previous attempt failed. Fix the issues described there, then continue implementing PRD.md. Run npm run build to verify everything works before finishing.`
      }

      try {
        const { stdout: claudeOutput } = await runClaudeCommand(
          claudePrompt,
          projectDir,
          900000 // 15 minutes per attempt
        )

        // Check if build actually works
        await updateBuildProgress(supabase, buildId, {
          progress: progressBase + 5,
          current_phase: `implement: Verifying build (attempt ${attempt})`,
          logs: ['Claude finished, verifying build...'],
        })

        // Try to build the project to verify it works
        try {
          await execAsync('npm run build', {
            cwd: projectDir,
            timeout: 180000,
            env: { ...process.env, NODE_ENV: 'production' }
          })

          // Build succeeded!
          buildSucceeded = true
          await updateBuildProgress(supabase, buildId, {
            progress: 70,
            current_phase: 'implement: Build verified ✓',
            logs: [
              `✅ Attempt ${attempt} succeeded!`,
              'npm run build passed',
              claudeOutput.slice(0, 300) + '...',
            ],
          })
          break // Exit the retry loop

        } catch (buildError: unknown) {
          // Build failed - capture error for next attempt
          const err = buildError as { message?: string; stderr?: string; stdout?: string }
          lastError = err.message || String(buildError)
          lastStderr = err.stderr || ''
          lastStdout = err.stdout || ''

          await updateBuildProgress(supabase, buildId, {
            logs: [
              `⚠️ Attempt ${attempt} - build verification failed`,
              `Error: ${lastError.slice(0, 200)}`,
              lastStderr ? `stderr: ${lastStderr.slice(0, 200)}` : '',
            ].filter(Boolean),
          })

          // If not last attempt, wait and retry
          if (attempt < MAX_ATTEMPTS) {
            await updateBuildProgress(supabase, buildId, {
              logs: [`Waiting ${RETRY_DELAY_MS / 1000}s before retry...`],
            })
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
          }
        }

      } catch (claudeError: unknown) {
        // Claude itself failed
        const err = claudeError as { message?: string; stderr?: string; stdout?: string }
        lastError = err.message || String(claudeError)
        lastStderr = err.stderr || ''
        lastStdout = err.stdout || ''

        await updateBuildProgress(supabase, buildId, {
          logs: [
            `❌ Attempt ${attempt} - Claude execution failed`,
            `Error: ${lastError.slice(0, 200)}`,
            lastStderr ? `stderr: ${lastStderr.slice(0, 200)}` : '',
          ].filter(Boolean),
        })

        // If not last attempt, wait and retry
        if (attempt < MAX_ATTEMPTS) {
          await updateBuildProgress(supabase, buildId, {
            logs: [`Waiting ${RETRY_DELAY_MS / 1000}s before retry...`],
          })
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
        }
      }
    }

    // Check if we succeeded after all attempts
    if (!buildSucceeded) {
      // Generate failure report
      const failReport = await generateBuildReport(
        supabase,
        buildId,
        { title: config.title, projectDna: config.projectDna, prd: config.prd },
        { repoUrl: null, deployedUrl: null, buildPassed: false, errorMessage: lastError }
      )
      await saveBuildReport(supabase, buildId, failReport)

      await updateBuildProgress(supabase, buildId, {
        status: 'failed',
        progress: 0,
        current_phase: 'implement: FAILED after all retries',
        error_message: `Failed after ${MAX_ATTEMPTS} attempts: ${lastError.slice(0, 200)}`,
        logs: [
          `❌ BUILD FAILED after ${MAX_ATTEMPTS} attempts`,
          `Final error: ${lastError.slice(0, 500)}`,
          lastStderr ? `Final stderr: ${lastStderr.slice(0, 500)}` : '',
          `📋 Report: ${failReport.summary.headline}`,
        ].filter(Boolean),
      })

      // Reset idea to approved for manual retry
      await supabase
        .from('dj_ideas')
        .update({ status: 'approved' })
        .eq('id', config.ideaId)

      // Cleanup and exit
      try {
        await rm(projectDir, { recursive: true, force: true })
      } catch {}
      return
    }

    // Phase 6: Push to GitHub
    await updateBuildProgress(supabase, buildId, {
      progress: 75,
      current_phase: 'push: Pushing to GitHub',
    })

    await execAsync('git init', { cwd: projectDir })
    await execAsync('git add -A', { cwd: projectDir })
    await execAsync('git commit -m "Initial implementation from DJ Loop PRD"', { cwd: projectDir })
    await execAsync('git branch -M main', { cwd: projectDir })
    await execAsync(`git remote add origin ${repoUrl}`, { cwd: projectDir })
    await execAsync('git push -u origin main', { cwd: projectDir })

    await updateBuildProgress(supabase, buildId, {
      progress: 85,
      current_phase: 'push: Code pushed to GitHub',
      logs: ['Pushed to GitHub'],
    })

    // Phase 7: Deploy to Vercel (for web projects)
    let deployedUrl = ''
    if (['utility-app', 'adhd-game'].includes(config.projectDna)) {
      await updateBuildProgress(supabase, buildId, {
        progress: 90,
        current_phase: 'deploy: Deploying to Vercel',
      })

      try {
        const { stdout: vercelOutput } = await execAsync(
          `${CLI_PATHS.vercel} deploy --prod --yes`,
          { cwd: projectDir, timeout: 300000 }
        )

        const urlMatch = vercelOutput.match(/https:\/\/[^\s]+\.vercel\.app/)
        deployedUrl = urlMatch ? urlMatch[0] : ''

        if (!deployedUrl) {
          throw new Error('Vercel deploy succeeded but no URL was returned')
        }

        await updateBuildProgress(supabase, buildId, {
          current_phase: 'deploy: Deployed successfully',
          deployed_url: deployedUrl,
          logs: [`✅ Deployed to: ${deployedUrl}`],
        })
      } catch (vercelError) {
        // Vercel deploy failed - this is a BUILD FAILURE
        const errMsg = vercelError instanceof Error ? vercelError.message : String(vercelError)

        // Generate failure report (has repo but no deploy)
        const deployFailReport = await generateBuildReport(
          supabase,
          buildId,
          { title: config.title, projectDna: config.projectDna, prd: config.prd },
          { repoUrl, deployedUrl: null, buildPassed: true, errorMessage: `Deploy failed: ${errMsg}` }
        )
        await saveBuildReport(supabase, buildId, deployFailReport)

        await updateBuildProgress(supabase, buildId, {
          status: 'failed',
          progress: 90,
          current_phase: 'deploy: Vercel deployment FAILED',
          error_message: `Deploy failed: ${errMsg.slice(0, 300)}`,
          logs: [
            `❌ Vercel deploy FAILED: ${errMsg.slice(0, 300)}`,
            `📋 Report: ${deployFailReport.summary.headline}`,
          ],
        })

        // Reset idea to approved so it can be retried
        await supabase
          .from('dj_ideas')
          .update({ status: 'approved' })
          .eq('id', config.ideaId)

        // Cleanup and exit - don't mark as complete!
        try {
          await rm(projectDir, { recursive: true, force: true })
        } catch {}
        return
      }
    }

    // Phase 8: Generate success report and complete
    const successReport = await generateBuildReport(
      supabase,
      buildId,
      { title: config.title, projectDna: config.projectDna, prd: config.prd },
      { repoUrl, deployedUrl: deployedUrl || null, buildPassed: true, errorMessage: null }
    )
    await saveBuildReport(supabase, buildId, successReport)

    await updateBuildProgress(supabase, buildId, {
      status: 'completed',
      progress: 100,
      current_phase: 'complete: Build shipped!',
      deployed_url: deployedUrl || undefined,
      logs: [
        '✅ BUILD COMPLETE - All steps succeeded',
        `📋 Report: ${successReport.summary.headline}`,
      ],
    })

    // Update idea status to shipped
    await supabase
      .from('dj_ideas')
      .update({ status: 'shipped' })
      .eq('id', config.ideaId)

    // Set completed_at
    await supabase
      .from('dj_builds')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', buildId)

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)

    await updateBuildProgress(supabase, buildId, {
      status: 'failed',
      progress: 0,
      current_phase: 'check: Build FAILED',
      error_message: errorMsg,
      logs: [`❌ Build failed: ${errorMsg}`],
    })

    // Update idea status back to approved so it can be retried
    await supabase
      .from('dj_ideas')
      .update({ status: 'approved' })
      .eq('id', config.ideaId)

  } finally {
    // Cleanup temp directory
    try {
      await rm(projectDir, { recursive: true, force: true })
    } catch {}
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase()
    const body = await request.json()

    // Two modes: specific ideaId or pick next approved
    let ideaId = body.ideaId

    if (!ideaId) {
      // Pick the next approved idea
      const { data: nextIdea, error: fetchError } = await supabase
        .from('dj_ideas')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (fetchError || !nextIdea) {
        return NextResponse.json({ message: 'No approved ideas to build' }, { status: 200 })
      }

      ideaId = nextIdea.id
    }

    // Fetch the idea
    const { data: idea, error: ideaError } = await supabase
      .from('dj_ideas')
      .select('*')
      .eq('id', ideaId)
      .single()

    if (ideaError || !idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    if (idea.status !== 'approved') {
      return NextResponse.json({ error: 'Idea not approved' }, { status: 400 })
    }

    // Check if there's already a running build for this idea
    const { data: existingBuilds } = await supabase
      .from('dj_builds')
      .select('id')
      .eq('idea_id', ideaId)
      .eq('status', 'running')
      .limit(1)

    if (existingBuilds && existingBuilds.length > 0) {
      return NextResponse.json({ error: 'Build already running for this idea' }, { status: 409 })
    }

    if (!idea.prd) {
      return NextResponse.json({ error: 'Idea has no PRD' }, { status: 400 })
    }

    // Update idea status to building
    await supabase
      .from('dj_ideas')
      .update({ status: 'building' })
      .eq('id', ideaId)

    // Create build record
    const { data: build, error: buildError } = await supabase
      .from('dj_builds')
      .insert({
        idea_id: ideaId,
        status: 'running',
        progress: 0,
        current_phase: 'Starting...',
        started_at: new Date().toISOString(),
        logs: [],
      })
      .select('id')
      .single()

    if (buildError || !build) {
      throw new Error('Failed to create build record')
    }

    // Start build process in background (don't await)
    runBuildProcess(supabase, build.id, {
      ideaId: idea.id,
      title: idea.title,
      prd: idea.prd,
      projectDna: idea.project_dna,
    }).catch((err) => {
      console.error('Background build error:', err)
    })

    return NextResponse.json({
      success: true,
      buildId: build.id,
      message: 'Build started',
    })

  } catch (error) {
    console.error('Start build error:', error)
    return NextResponse.json(
      { error: 'Failed to start build' },
      { status: 500 }
    )
  }
}

// GET endpoint to check build status or trigger next build
export async function GET() {
  try {
    const supabase = getSupabase()

    // Get queue stats
    const { data: stats } = await supabase
      .from('dj_queue_stats')
      .select('*')

    // Get active builds
    const { data: activeBuilds } = await supabase
      .from('dj_active_builds')
      .select('*')

    return NextResponse.json({
      stats,
      activeBuilds,
    })
  } catch (error) {
    console.error('Get build status error:', error)
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}
