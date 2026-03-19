import Anthropic from '@anthropic-ai/sdk'
import type { Idea } from '@/lib/supabase'

const DJ_PREFERENCES = `
## DJ's Defaults (ALWAYS apply these)
- Tech: Next.js + shadcn/ui + Tailwind, Supabase, Vercel, avoid auth unless necessary (Clerk if needed)
- Design: Mobile-first, dark mode default, no tutorials, satisfying micro-interactions, minimal UI
- Approach: Ship working > ship perfect. Simple > feature-rich. < 4 hour builds preferred.
- Reject patterns: User accounts/auth (friction), crowded markets, backend-heavy ongoing costs, content moderation
- Approve patterns: Chrome extensions for Twitter/X, ADHD-friendly mechanics, existing demand, quick wins
`

export type BuildPhase = 'SETUP' | 'CORE' | 'FEATURES' | 'POLISH' | 'DEPLOY'

export interface ScaffoldTask {
  id: string
  phase: BuildPhase
  task: string
  detail: string
  priority: 'P0' | 'P1' | 'P2'
  done: boolean
}

export interface ScaffoldOutput {
  claudeMd: string
  tasks: ScaffoldTask[]
  repoStructure: string[]
  stackReasoning: string
}

export async function runScaffoldAgent(
  idea: Idea,
  apiKey: string
): Promise<ScaffoldOutput> {
  const client = new Anthropic({ apiKey })

  // Step 1: Generate tasks with phases and priorities
  const taskResponse = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `You are a senior engineer breaking a validated idea into executable tasks for an autonomous AI coding agent.

${DJ_PREFERENCES}

IDEA: ${idea.title}
DESCRIPTION: ${idea.raw_input}
${idea.prd ? `PRD:\n${idea.prd}` : ''}
PROJECT TYPE: ${idea.project_dna || 'utility-app'}

Create a task list. Return ONLY a JSON array:
[{"phase":"SETUP","task":"title","detail":"specific implementation detail","priority":"P0"}]

Phases: SETUP, CORE, FEATURES, POLISH, DEPLOY
Priority: P0 (must have), P1 (should have), P2 (nice to have)
Create 12-20 tasks. Be specific — an AI agent will execute these literally.
Return ONLY the JSON array.`,
      },
    ],
  })

  let tasks: ScaffoldTask[]
  try {
    const raw = (taskResponse.content[0] as { type: 'text'; text: string }).text
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
    tasks = parsed.map((t: Record<string, string>, i: number) => ({
      id: `task-${i + 1}`,
      phase: t.phase as BuildPhase,
      task: t.task,
      detail: t.detail,
      priority: t.priority as 'P0' | 'P1' | 'P2',
      done: false,
    }))
  } catch {
    tasks = [
      { id: 'task-1', phase: 'SETUP', task: 'Initialize project', detail: 'Set up project structure with Next.js + Tailwind', priority: 'P0', done: false },
      { id: 'task-2', phase: 'CORE', task: 'Build core feature', detail: idea.raw_input, priority: 'P0', done: false },
      { id: 'task-3', phase: 'DEPLOY', task: 'Deploy to Vercel', detail: 'Deploy and smoke test', priority: 'P1', done: false },
    ]
  }

  // Step 2: Generate stack reasoning + repo structure
  const structureResponse = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: `For this project, recommend a file/folder structure and explain the stack choice in 2-3 sentences.

${DJ_PREFERENCES}

IDEA: ${idea.title}
DESCRIPTION: ${idea.raw_input}
PROJECT TYPE: ${idea.project_dna || 'utility-app'}

Return ONLY JSON:
{"stackReasoning":"why this stack","repoStructure":["src/app/page.tsx","src/components/...","..."]}`,
      },
    ],
  })

  let stackReasoning = "Next.js + Supabase + Tailwind — DJ's default stack."
  let repoStructure = ['src/app/page.tsx', 'src/app/layout.tsx', 'src/components/', 'src/lib/']
  try {
    const raw = (structureResponse.content[0] as { type: 'text'; text: string }).text
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
    stackReasoning = parsed.stackReasoning || stackReasoning
    repoStructure = parsed.repoStructure || repoStructure
  } catch {
    // defaults above
  }

  // Step 3: Assemble CLAUDE.md
  const phases = [...new Set(tasks.map((t) => t.phase))]
  const taskMd = phases
    .map(
      (phase) =>
        `### ${phase}\n` +
        tasks
          .filter((t) => t.phase === phase)
          .map((t) => `- [ ] **${t.task}** (${t.priority})\n  - ${t.detail}`)
          .join('\n')
    )
    .join('\n\n')

  const claudeMd = `# ${idea.title}
> ${idea.raw_input}

---

## Stack
${stackReasoning}

## MVP Features
${idea.prd || idea.raw_input}

## Sprint Goal
Working prototype deployed to Vercel.

## Constraints
- Mobile-first, dark mode default
- No unnecessary auth — reduce friction
- Ship working > ship perfect
- Keep it simple — minimal over feature-rich

---

## Task List

${taskMd}

---

## Agent Rules

- Work through tasks top to bottom, phase by phase
- Check off tasks: replace \`[ ]\` with \`[x]\`
- P0 tasks are blockers — do not skip
- Smoke test after each phase before moving on
- Commit working code after each phase
- If stuck, document in ERRORS.md and continue
- When done, write DONE.md summarizing what shipped

---
*Generated by DJ Loop Scaffold Agent — ${new Date().toISOString().split('T')[0]}*
`

  return { claudeMd, tasks, repoStructure, stackReasoning }
}
