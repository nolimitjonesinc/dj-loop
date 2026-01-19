/**
 * DJ Loop Build Engine
 *
 * Autonomous build pipeline:
 * 1. Pick up approved PRDs
 * 2. Create GitHub repo
 * 3. Run Claude Code to implement
 * 4. Deploy to Vercel
 * 5. Report completion
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { mkdir, writeFile, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const execAsync = promisify(exec)

export interface BuildConfig {
  ideaId: string
  title: string
  prd: string
  projectDna: string
  repoName?: string
  githubOrg?: string
}

export interface BuildProgress {
  phase: string
  progress: number
  message: string
}

export interface BuildResult {
  success: boolean
  repoUrl?: string
  deployedUrl?: string
  error?: string
  logs: string[]
}

type ProgressCallback = (progress: BuildProgress) => Promise<void>

/**
 * Generate a slug from title for repo name
 */
function generateRepoName(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50)
}

/**
 * Get project template based on DNA type
 */
function getProjectTemplate(projectDna: string): {
  framework: string
  initCommand: string
  buildCommand: string
} {
  const templates: Record<string, { framework: string; initCommand: string; buildCommand: string }> = {
    'utility-app': {
      framework: 'next',
      initCommand: 'npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes',
      buildCommand: 'npm run build',
    },
    'chrome-extension': {
      framework: 'vite',
      initCommand: 'npm init -y && npm install -D vite typescript @types/chrome',
      buildCommand: 'npx vite build',
    },
    'adhd-game': {
      framework: 'next',
      initCommand: 'npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes',
      buildCommand: 'npm run build',
    },
    api: {
      framework: 'hono',
      initCommand: 'npm init -y && npm install hono @hono/node-server && npm install -D typescript @types/node',
      buildCommand: 'npx tsc',
    },
    script: {
      framework: 'node',
      initCommand: 'npm init -y && npm install -D typescript @types/node ts-node',
      buildCommand: 'npx tsc',
    },
  }

  return templates[projectDna] || templates['utility-app']
}

/**
 * Check required CLI tools are installed
 */
export async function checkPrerequisites(): Promise<{
  gh: boolean
  vercel: boolean
  claude: boolean
}> {
  const checks = {
    gh: false,
    vercel: false,
    claude: false,
  }

  try {
    await execAsync('gh --version')
    checks.gh = true
  } catch {}

  try {
    await execAsync('vercel --version')
    checks.vercel = true
  } catch {}

  try {
    await execAsync('claude --version')
    checks.claude = true
  } catch {}

  return checks
}

/**
 * Create a GitHub repository
 */
async function createGitHubRepo(
  repoName: string,
  description: string,
  isPrivate: boolean = true,
  org?: string
): Promise<string> {
  const fullName = org ? `${org}/${repoName}` : repoName
  const visibility = isPrivate ? '--private' : '--public'

  await execAsync(`gh repo create ${fullName} ${visibility} --description "${description}" --clone=false`)

  // Get the repo URL
  const { stdout } = await execAsync(`gh repo view ${fullName} --json url -q .url`)
  return stdout.trim()
}

/**
 * Initialize project in directory
 */
async function initializeProject(
  projectDir: string,
  config: BuildConfig,
  onProgress: ProgressCallback
): Promise<void> {
  const template = getProjectTemplate(config.projectDna)

  await onProgress({
    phase: 'init',
    progress: 20,
    message: `Initializing ${template.framework} project...`,
  })

  // Run init command
  await execAsync(template.initCommand, { cwd: projectDir })

  // Write PRD to file for Claude to reference
  await writeFile(join(projectDir, 'PRD.md'), config.prd)

  // Write CLAUDE.md with build instructions
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
- Ensure \`npm run build\` passes
- Test basic functionality works
`

  await writeFile(join(projectDir, 'CLAUDE.md'), claudeInstructions)
}

/**
 * Run Claude Code to implement the PRD
 */
async function runClaudeImplementation(
  projectDir: string,
  config: BuildConfig,
  onProgress: ProgressCallback
): Promise<{ success: boolean; logs: string[] }> {
  const logs: string[] = []

  await onProgress({
    phase: 'implement',
    progress: 40,
    message: 'Running Claude Code to implement PRD...',
  })

  try {
    // Use Claude Code CLI to implement the project
    const prompt = `Read PRD.md and implement the project completely.
Make sure:
1. All features from the PRD are implemented
2. The code builds without errors (run npm run build to verify)
3. Keep it minimal - only what's in the PRD
4. Use proper TypeScript types

Start by reading PRD.md, then implement the project step by step.`

    const { stdout, stderr } = await execAsync(
      `claude -p "${prompt}" --yes`,
      {
        cwd: projectDir,
        timeout: 600000, // 10 minute timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      }
    )

    logs.push('Claude implementation output:', stdout)
    if (stderr) logs.push('Claude stderr:', stderr)

    await onProgress({
      phase: 'implement',
      progress: 70,
      message: 'Claude implementation complete',
    })

    return { success: true, logs }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    logs.push(`Claude implementation error: ${errorMsg}`)
    return { success: false, logs }
  }
}

/**
 * Push code to GitHub
 */
async function pushToGitHub(
  projectDir: string,
  repoUrl: string,
  onProgress: ProgressCallback
): Promise<void> {
  await onProgress({
    phase: 'push',
    progress: 80,
    message: 'Pushing to GitHub...',
  })

  // Initialize git and push
  await execAsync('git init', { cwd: projectDir })
  await execAsync('git add -A', { cwd: projectDir })
  await execAsync('git commit -m "Initial implementation from PRD"', { cwd: projectDir })
  await execAsync('git branch -M main', { cwd: projectDir })
  await execAsync(`git remote add origin ${repoUrl}`, { cwd: projectDir })
  await execAsync('git push -u origin main', { cwd: projectDir })
}

/**
 * Deploy to Vercel
 */
async function deployToVercel(
  projectDir: string,
  projectName: string,
  onProgress: ProgressCallback
): Promise<string> {
  await onProgress({
    phase: 'deploy',
    progress: 90,
    message: 'Deploying to Vercel...',
  })

  // Deploy to Vercel with production flag
  const { stdout } = await execAsync(
    `vercel --prod --yes --name ${projectName}`,
    { cwd: projectDir }
  )

  // Extract deployed URL from output
  const urlMatch = stdout.match(/https:\/\/[^\s]+\.vercel\.app/)
  return urlMatch ? urlMatch[0] : stdout.trim().split('\n').pop() || ''
}

/**
 * Main build function
 */
export async function runBuild(
  config: BuildConfig,
  onProgress: ProgressCallback
): Promise<BuildResult> {
  const logs: string[] = []
  const repoName = config.repoName || generateRepoName(config.title)
  const projectDir = join(tmpdir(), `dj-build-${repoName}-${Date.now()}`)

  try {
    // Check prerequisites
    await onProgress({
      phase: 'check',
      progress: 5,
      message: 'Checking prerequisites...',
    })

    const prereqs = await checkPrerequisites()
    if (!prereqs.gh) {
      throw new Error('GitHub CLI (gh) not installed. Run: brew install gh')
    }
    if (!prereqs.vercel) {
      throw new Error('Vercel CLI not installed. Run: npm i -g vercel')
    }
    if (!prereqs.claude) {
      throw new Error('Claude Code not installed. Run: npm i -g @anthropic-ai/claude-code')
    }

    logs.push('Prerequisites check passed')

    // Create project directory
    await mkdir(projectDir, { recursive: true })
    logs.push(`Created project directory: ${projectDir}`)

    // Create GitHub repo
    await onProgress({
      phase: 'repo',
      progress: 10,
      message: 'Creating GitHub repository...',
    })

    const repoUrl = await createGitHubRepo(
      repoName,
      `Auto-built from DJ Loop: ${config.title}`,
      true,
      config.githubOrg
    )
    logs.push(`Created repo: ${repoUrl}`)

    // Initialize project
    await initializeProject(projectDir, config, onProgress)
    logs.push('Project initialized')

    // Run Claude to implement
    const claudeResult = await runClaudeImplementation(projectDir, config, onProgress)
    logs.push(...claudeResult.logs)

    if (!claudeResult.success) {
      throw new Error('Claude implementation failed')
    }

    // Push to GitHub
    await pushToGitHub(projectDir, repoUrl, onProgress)
    logs.push('Pushed to GitHub')

    // Deploy to Vercel (only for web projects)
    let deployedUrl = ''
    if (['utility-app', 'adhd-game'].includes(config.projectDna)) {
      deployedUrl = await deployToVercel(projectDir, repoName, onProgress)
      logs.push(`Deployed to: ${deployedUrl}`)
    }

    await onProgress({
      phase: 'complete',
      progress: 100,
      message: 'Build complete!',
    })

    return {
      success: true,
      repoUrl,
      deployedUrl: deployedUrl || undefined,
      logs,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    logs.push(`Build failed: ${errorMsg}`)

    await onProgress({
      phase: 'error',
      progress: 0,
      message: `Build failed: ${errorMsg}`,
    })

    return {
      success: false,
      error: errorMsg,
      logs,
    }
  } finally {
    // Cleanup temp directory
    try {
      await rm(projectDir, { recursive: true, force: true })
    } catch {}
  }
}

/**
 * Check if build can run (has all prerequisites)
 */
export async function canRunBuild(): Promise<{ ready: boolean; missing: string[] }> {
  const prereqs = await checkPrerequisites()
  const missing: string[] = []

  if (!prereqs.gh) missing.push('gh (GitHub CLI)')
  if (!prereqs.vercel) missing.push('vercel (Vercel CLI)')
  if (!prereqs.claude) missing.push('claude (Claude Code)')

  return {
    ready: missing.length === 0,
    missing,
  }
}
