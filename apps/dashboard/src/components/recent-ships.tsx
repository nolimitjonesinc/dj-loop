'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { Build, BuildReport } from '@/lib/supabase'

// Component to display a build report in plain English for non-technical users
function BuildReportDisplay({ report }: { report: BuildReport }) {
  // Determine if this is a "clickable" result (website/game)
  const hasClickableResult = report.technical.deployedUrl &&
    ['utility-app', 'adhd-game'].includes(report.projectType)

  return (
    <div className="space-y-4">
      {/* Big headline */}
      <div className={`p-6 rounded-lg text-center ${
        report.success
          ? 'bg-green-900/30 border-2 border-green-600'
          : 'bg-red-900/30 border-2 border-red-600'
      }`}>
        <p className="text-5xl mb-3">{report.success ? '✅' : '❌'}</p>
        <p className={`text-2xl font-bold ${report.success ? 'text-green-400' : 'text-red-400'}`}>
          {report.summary.headline}
        </p>
        <p className="text-zinc-300 mt-2 text-lg">{report.summary.explanation}</p>
      </div>

      {/* BIG ACTION BUTTON for clickable results */}
      {report.success && hasClickableResult && (
        <a
          href={report.technical.deployedUrl!}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full p-4 bg-green-600 hover:bg-green-500 text-white text-center text-xl font-bold rounded-lg transition-colors"
        >
          🚀 Open Your {report.projectType === 'adhd-game' ? 'Game' : 'Website'}
        </a>
      )}

      {/* Simple checklist */}
      <div className="p-4 bg-zinc-800 rounded-lg">
        <div className="space-y-3">
          {report.actual.items.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className={`text-2xl ${item.status === 'pass' ? 'text-green-400' : 'text-red-400'}`}>
                {item.status === 'pass' ? '✓' : '✗'}
              </span>
              <div>
                <p className={`font-medium ${item.status === 'pass' ? 'text-white' : 'text-red-300'}`}>
                  {item.name}
                </p>
                <p className="text-zinc-500 text-sm">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What to do next */}
      <div className="p-4 bg-zinc-800 rounded-lg">
        <p className="text-white font-medium mb-3">
          {report.success ? 'What to do now:' : 'To fix this:'}
        </p>
        <ol className="space-y-2">
          {report.summary.nextSteps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-zinc-300">
              <span className="bg-zinc-700 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

interface RecentShipsProps {
  builds: Build[]
  onClearHistory?: () => void
  onDeleteBuild?: (buildId: string) => void
}

// Extract verification info from logs
function extractVerificationInfo(logs: string[]): {
  expected: number | null
  actual: number | null
  verified: boolean
} {
  const logText = logs.join('\n')

  // Look for verification line: "📊 Verification: Expected 12, Found 12"
  const verifyMatch = logText.match(/Verification: Expected (\d+), Found (\d+)/)
  if (verifyMatch) {
    const expected = parseInt(verifyMatch[1], 10)
    const actual = parseInt(verifyMatch[2], 10)
    return { expected, actual, verified: actual >= expected }
  }

  // Look for character count in logs
  const countMatch = logText.match(/(\d+) characters? saved/)
  if (countMatch) {
    const actual = parseInt(countMatch[1], 10)
    return { expected: null, actual, verified: actual > 0 }
  }

  return { expected: null, actual: null, verified: false }
}

// Detect if build actually succeeded or had hidden failures
function detectBuildOutcome(build: Build): {
  realStatus: 'success' | 'partial' | 'failed'
  summary: string
  issues: string[]
  successes: string[]
  isWorldBuilder: boolean
  verification: { expected: number | null; actual: number | null; verified: boolean }
} {
  const logs = build.logs || []
  const logText = logs.join('\n').toLowerCase()

  const issues: string[] = []
  const successes: string[] = []
  const isWorldBuilder = build.project_dna === 'world-builder'

  // Extract verification info for world-builder
  const verification = isWorldBuilder
    ? extractVerificationInfo(logs)
    : { expected: null, actual: null, verified: false }

  if (logText.includes('command failed')) {
    issues.push('A command failed to run')
  }
  if (logText.includes('needs an update') || logText.includes('needs update')) {
    issues.push('Claude Code was outdated')
  }
  if (logText.includes('error') && !logText.includes('error_message')) {
    // Only flag as error if it's not just mentioning the error_message field
    const errorLog = logs.find(l => l.toLowerCase().includes('error') && !l.toLowerCase().includes('error_message'))
    if (errorLog) {
      issues.push('An error occurred during build')
    }
  }
  if (logText.includes('verification failed')) {
    issues.push('Verification failed - not all characters were saved')
  }
  if (logText.includes('unknown option')) {
    issues.push('Invalid command was used')
  }

  // Success indicators
  if (build.deployed_url) {
    successes.push('Deployed to ' + build.deployed_url)
  }
  if (build.repo_url) {
    successes.push('Code saved to GitHub')
  }
  if (logText.includes('pushed to github')) {
    successes.push('Pushed to GitHub')
  }

  // World-builder success - must be VERIFIED
  if (isWorldBuilder && verification.verified) {
    if (verification.expected && verification.actual) {
      successes.push(`${verification.actual}/${verification.expected} characters saved ✓`)
    } else if (verification.actual) {
      successes.push(`${verification.actual} characters saved`)
    }
  }

  let realStatus: 'success' | 'partial' | 'failed'
  let summary: string

  // For world-builder, SUCCESS requires verification
  if (isWorldBuilder) {
    if (verification.verified && issues.length === 0) {
      realStatus = 'success'
      summary = verification.expected
        ? `All ${verification.actual} characters verified ✓`
        : `${verification.actual} characters generated`
    } else if (verification.actual && verification.actual > 0) {
      realStatus = 'partial'
      summary = verification.expected
        ? `Only ${verification.actual} of ${verification.expected} characters saved`
        : 'Some characters may be missing'
    } else {
      realStatus = 'failed'
      summary = 'No characters were saved'
    }
  } else {
    // Standard builds (utility-app, etc)
    if (issues.length === 0 && (build.deployed_url || build.repo_url)) {
      realStatus = 'success'
      summary = 'Build completed successfully'
    } else if (issues.length > 0 && successes.length > 0) {
      realStatus = 'partial'
      summary = 'Build had problems - may not work correctly'
    } else if (issues.length > 0) {
      realStatus = 'failed'
      summary = 'Build failed - nothing was created'
    } else {
      realStatus = 'partial'
      summary = 'Build finished but unclear if it worked'
    }
  }

  return { realStatus, summary, issues, successes, isWorldBuilder, verification }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Unknown'
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

function BuildCard({ build, onDelete }: { build: Build; onDelete?: () => void }) {
  const outcome = detectBuildOutcome(build)
  const logs = build.logs || []
  const [copied, setCopied] = useState(false)

  const copyForClaude = (e: React.MouseEvent) => {
    e.stopPropagation()

    // Build verification section for world-builder
    let verificationSection = ''
    if (outcome.isWorldBuilder && outcome.verification.expected) {
      verificationSection = `
**Verification:**
- Expected: ${outcome.verification.expected} characters
- Actual: ${outcome.verification.actual || 0} characters
- Status: ${outcome.verification.verified ? 'PASSED' : 'FAILED'}
`
    }

    const report = `## DJ Loop Build Report

**Status:** ${outcome.realStatus.toUpperCase()}
**Summary:** ${outcome.summary}

**Title:** ${build.title || 'Untitled'}
**Project Type:** ${build.project_dna}
**Build ID:** ${build.id}

**Started:** ${formatDate(build.started_at)}
**Finished:** ${formatDate(build.completed_at)}
${outcome.isWorldBuilder ? verificationSection : `
**Deployed URL:** ${build.deployed_url || 'None'}
**Repo URL:** ${build.repo_url || 'None'}`}

**Problems Found:**
${outcome.issues.length > 0 ? outcome.issues.map(i => `- ${i}`).join('\n') : 'None'}

**Successes:**
${outcome.successes.length > 0 ? outcome.successes.map(s => `- ${s}`).join('\n') : 'None'}

**Full Logs:**
\`\`\`
${logs.join('\n') || 'No logs'}
\`\`\`

Please help me understand what went wrong and how to fix it.`

    navigator.clipboard.writeText(report)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div
          className={`p-3 rounded cursor-pointer hover:opacity-80 transition-opacity ${
            outcome.realStatus === 'success' ? 'bg-green-900/20 border border-green-800' :
            outcome.realStatus === 'partial' ? 'bg-yellow-900/20 border border-yellow-800' :
            'bg-red-900/20 border border-red-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>
                {outcome.realStatus === 'success' ? '✅' :
                 outcome.realStatus === 'partial' ? '⚠️' : '❌'}
              </span>
              <span className="text-white font-medium">{build.title || 'Untitled'}</span>
              <Badge variant="outline" className="text-xs">
                {build.project_dna}
              </Badge>
            </div>
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-zinc-500 hover:text-red-400 text-sm px-2"
                title="Delete this build"
              >
                ✕
              </button>
            )}
          </div>
          <p className={`text-xs mt-1 ${
            outcome.realStatus === 'success' ? 'text-green-400' :
            outcome.realStatus === 'partial' ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {outcome.summary}
          </p>
          <p className="text-zinc-500 text-xs mt-1">
            {formatDate(build.completed_at || build.created_at)}
          </p>
        </div>
      </DialogTrigger>

      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            {build.title || 'Untitled'} - Build Report
          </DialogTitle>
        </DialogHeader>

        <Button
          onClick={copyForClaude}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        >
          {copied ? '✓ Copied!' : '📋 Copy Report for Claude'}
        </Button>

        {/* Use new report display if build_report exists */}
        {build.build_report ? (
          <BuildReportDisplay report={build.build_report} />
        ) : (
          /* Fallback for older builds without build_report */
          <>
            <div className={`p-4 rounded-lg ${
              outcome.realStatus === 'success' ? 'bg-green-900/30 border border-green-700' :
              outcome.realStatus === 'partial' ? 'bg-yellow-900/30 border border-yellow-700' :
              'bg-red-900/30 border border-red-700'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">
                  {outcome.realStatus === 'success' ? '✅' :
                   outcome.realStatus === 'partial' ? '⚠️' : '❌'}
                </span>
                <span className={`font-bold ${
                  outcome.realStatus === 'success' ? 'text-green-400' :
                  outcome.realStatus === 'partial' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {outcome.realStatus === 'success' ? 'SUCCESS' :
                   outcome.realStatus === 'partial' ? 'PARTIAL - HAD PROBLEMS' :
                   'FAILED'}
                </span>
              </div>
              <p className="text-white">{outcome.summary}</p>
            </div>

            <div className="p-3 bg-zinc-800 rounded">
              <p className="text-zinc-400 text-xs uppercase tracking-wide mb-1">When</p>
              <p className="text-white">
                Started: {formatDate(build.started_at)}<br/>
                Finished: {formatDate(build.completed_at)}
              </p>
            </div>

            <div className="p-3 bg-zinc-800 rounded">
              <p className="text-zinc-400 text-xs uppercase tracking-wide mb-2">What Was Created</p>
              {outcome.isWorldBuilder ? (
                // World-builder: show verification results
                <div className="space-y-2">
                  {/* Verification box */}
              {outcome.verification.expected && (
                <div className={`p-2 rounded border ${
                  outcome.verification.verified
                    ? 'bg-green-900/30 border-green-700'
                    : 'bg-yellow-900/30 border-yellow-700'
                }`}>
                  <p className="text-xs uppercase tracking-wide mb-1 text-zinc-400">Verification</p>
                  <div className="flex items-center gap-2">
                    <span className={outcome.verification.verified ? 'text-green-400' : 'text-yellow-400'}>
                      {outcome.verification.verified ? '✓' : '⚠'}
                    </span>
                    <span className="text-white text-sm">
                      {outcome.verification.actual} of {outcome.verification.expected} characters saved
                    </span>
                  </div>
                  {outcome.verification.verified && (
                    <p className="text-green-400 text-xs mt-1">All expected characters accounted for</p>
                  )}
                  {!outcome.verification.verified && outcome.verification.actual && outcome.verification.actual > 0 && (
                    <p className="text-yellow-400 text-xs mt-1">
                      Missing {outcome.verification.expected - outcome.verification.actual} characters
                    </p>
                  )}
                </div>
              )}

              {/* Success items */}
              {outcome.successes.map((s, i) => (
                <p key={i} className="text-green-400 text-sm">✓ {s}</p>
              ))}

              {/* No verification and no successes */}
              {!outcome.verification.expected && outcome.successes.length === 0 && (
                <p className="text-zinc-500 text-sm">No characters saved</p>
              )}
            </div>
          ) : (
            // Regular builds: show website/repo
            <>
              {build.deployed_url ? (
                <div className="mb-2">
                  <p className="text-green-400 text-sm">✓ Live Website</p>
                  <a href={build.deployed_url} target="_blank" rel="noopener noreferrer"
                     className="text-blue-400 hover:underline text-sm break-all">
                    {build.deployed_url}
                  </a>
                </div>
              ) : (
                <p className="text-zinc-500 text-sm">✗ No website deployed</p>
              )}
              {build.repo_url ? (
                <div className="mt-2">
                  <p className="text-green-400 text-sm">✓ Code Repository</p>
                  <a href={build.repo_url} target="_blank" rel="noopener noreferrer"
                     className="text-blue-400 hover:underline text-sm break-all">
                    {build.repo_url}
                  </a>
                </div>
              ) : (
                <p className="text-zinc-500 text-sm mt-2">✗ No code repository created</p>
              )}
            </>
          )}
        </div>

        {outcome.issues.length > 0 && (
          <div className="p-3 bg-red-900/20 border border-red-800 rounded">
            <p className="text-red-400 text-xs uppercase tracking-wide mb-2">Problems Found</p>
            <ul className="space-y-1">
              {outcome.issues.map((issue, i) => (
                <li key={i} className="text-red-300 text-sm">• {issue}</li>
              ))}
            </ul>
          </div>
        )}

            {outcome.realStatus !== 'success' && (
              <div className="p-3 bg-zinc-800 rounded">
                <p className="text-zinc-400 text-xs uppercase tracking-wide mb-2">What To Do</p>
                <ol className="text-white text-sm space-y-1 list-decimal list-inside">
                  <li>Make sure Claude Code is updated: run <code className="bg-zinc-700 px-1 rounded">claude update</code> in Terminal</li>
                  <li>Restart DJ Loop (click the app in Dock again)</li>
                  <li>Try the build again</li>
                  <li>If it still fails, click the purple button above and paste into Claude</li>
                </ol>
              </div>
            )}
          </>
        )}

        {/* Logs section - always shown */}
        <details>
          <summary className="text-zinc-400 text-sm cursor-pointer hover:text-white">
            View Full Logs (for debugging)
          </summary>
          <div className="mt-2 p-3 bg-zinc-950 rounded max-h-60 overflow-auto">
            {logs.length === 0 ? (
              <p className="text-zinc-500 text-sm">No logs recorded</p>
            ) : (
              logs.map((log, i) => (
                <p key={i} className="text-zinc-400 text-xs font-mono whitespace-pre-wrap break-words mb-1">
                  {log}
                </p>
              ))
            )}
          </div>
        </details>

        <p className="text-zinc-600 text-xs">
          Build ID: {build.id}
        </p>
      </DialogContent>
    </Dialog>
  )
}

export function RecentShips({ builds, onClearHistory, onDeleteBuild }: RecentShipsProps) {
  const [isCollapsed, setIsCollapsed] = useState(true)

  const recentBuilds = builds
    .filter((b) => b.status === 'completed' || b.status === 'failed')
    .slice(0, 5)

  if (recentBuilds.length === 0) {
    return null
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-2 hover:text-white transition-colors"
          >
            <span className="text-zinc-500">{isCollapsed ? '▶' : '▼'}</span>
            <CardTitle className="text-sm font-medium text-zinc-300">
              Recent Builds ({recentBuilds.length})
            </CardTitle>
          </button>
          {!isCollapsed && onClearHistory && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClearHistory}
              className="text-xs text-zinc-500 hover:text-red-400"
            >
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="space-y-3 pt-2">
          {recentBuilds.map((build) => (
            <BuildCard
              key={build.id}
              build={build}
              onDelete={onDeleteBuild ? () => onDeleteBuild(build.id) : undefined}
            />
          ))}
        </CardContent>
      )}
    </Card>
  )
}
