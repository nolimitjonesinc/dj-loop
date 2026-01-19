'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import type { Build } from '@/lib/supabase'

interface ActiveBuildsProps {
  builds: Build[]
  onStop?: () => void
}

function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

const BUILD_STEPS = [
  { phase: 'check', label: 'Checking prerequisites' },
  { phase: 'repo', label: 'Creating GitHub repo' },
  { phase: 'init', label: 'Initializing project' },
  { phase: 'implement', label: 'Claude implementing PRD' },
  { phase: 'push', label: 'Pushing to GitHub' },
  { phase: 'deploy', label: 'Deploying to Vercel' },
  { phase: 'complete', label: 'Complete!' },
]

export function ActiveBuilds({ builds, onStop }: ActiveBuildsProps) {
  const [stopping, setStopping] = useState(false)
  const activeBuilds = builds.filter((b) => b.status === 'running' || b.status === 'queued')
  const hasActive = activeBuilds.length > 0

  const handleStopAll = async () => {
    setStopping(true)
    try {
      await fetch('/api/stop-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      onStop?.()
    } catch (err) {
      console.error('Failed to stop builds:', err)
    } finally {
      setStopping(false)
    }
  }

  if (!hasActive) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-zinc-300">Active Builds</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-500 text-sm">No active builds</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900 border-green-500/50 border-2 shadow-lg shadow-green-500/10 animate-pulse-subtle">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-green-400 flex items-center gap-2">
            <Spinner className="h-4 w-4 text-green-400" />
            Building ({activeBuilds.length})
          </CardTitle>
          <Button
            onClick={handleStopAll}
            disabled={stopping}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white font-bold"
          >
            {stopping ? 'STOPPING...' : '🛑 STOP ALL'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeBuilds.map((build) => (
          <BuildProgressCard key={build.id} build={build} />
        ))}
      </CardContent>
    </Card>
  )
}

function BuildProgressCard({ build }: { build: Build }) {
  const currentPhaseKey = build.current_phase?.toLowerCase().split(' ')[0] || ''

  return (
    <div className="space-y-3 p-3 bg-zinc-800/50 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">{build.title || 'Untitled'}</span>
          <Badge variant="outline" className="text-xs">
            {build.project_dna}
          </Badge>
        </div>
        <span className="text-sm font-mono text-green-400">{build.progress}%</span>
      </div>

      <Progress value={build.progress} className="h-2" />

      {/* Step indicators */}
      <div className="space-y-1">
        {BUILD_STEPS.map((step, i) => {
          const isActive = build.current_phase?.toLowerCase().includes(step.phase)
          const isPast = build.progress > (i + 1) * 14
          const isFailed = build.status === 'failed' && isActive

          return (
            <div
              key={step.phase}
              className={`flex items-center gap-2 text-xs transition-all ${
                isActive
                  ? 'text-green-400 font-medium'
                  : isPast
                    ? 'text-zinc-500'
                    : 'text-zinc-600'
              } ${isFailed ? 'text-red-400' : ''}`}
            >
              {isActive && !isFailed && <Spinner className="h-3 w-3" />}
              {isPast && <span className="text-green-500">✓</span>}
              {isFailed && <span className="text-red-400">✕</span>}
              {!isActive && !isPast && !isFailed && <span className="text-zinc-600">○</span>}
              <span>{step.label}</span>
            </div>
          )
        })}
      </div>

      {build.error_message && (
        <div className="mt-2 p-2 bg-red-900/30 border border-red-800 rounded text-xs text-red-400">
          {build.error_message}
        </div>
      )}

      {build.repo_url && (
        <div className="text-xs text-zinc-400">
          Repo: <a href={build.repo_url} target="_blank" className="text-blue-400 hover:underline">{build.repo_url}</a>
        </div>
      )}
    </div>
  )
}
