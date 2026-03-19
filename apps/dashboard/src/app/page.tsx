'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { getSupabase, type Idea, type Build, type QueueStats } from '@/lib/supabase'
import { QueueStatsDisplay } from '@/components/queue-stats'
import { IdeaInput } from '@/components/idea-input'
import { DraftIdeas } from '@/components/draft-ideas'
import { PendingApprovals } from '@/components/pending-approvals'
import { BuildQueue } from '@/components/build-queue'
import { ActiveBuilds } from '@/components/active-builds'
import { RecentShips } from '@/components/recent-ships'
import { ScaffoldModal } from '@/components/scaffold-modal'
import type { ScaffoldTask } from '@/lib/agents/scaffold'

// Shows prominent red alert for recent failures (last hour)
function FailedBuildAlert({ builds, onDismiss }: { builds: Build[]; onDismiss: (id: string) => void }) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const recentFailures = builds.filter(
    b => b.status === 'failed' && b.created_at && b.created_at > oneHourAgo
  )

  if (recentFailures.length === 0) return null

  return (
    <div className="space-y-2">
      {recentFailures.map(build => (
        <div
          key={build.id}
          className="p-4 bg-red-900/40 border-2 border-red-500 rounded-lg animate-pulse"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">❌</span>
              <div>
                <p className="text-red-400 font-bold">BUILD FAILED</p>
                <p className="text-white">{build.title || 'Untitled'}</p>
              </div>
            </div>
            <button
              onClick={() => onDismiss(build.id)}
              className="text-zinc-400 hover:text-white text-sm"
            >
              Dismiss
            </button>
          </div>
          {build.error_message && (
            <p className="mt-2 text-red-300 text-sm">{build.error_message}</p>
          )}
          <p className="mt-2 text-zinc-400 text-xs">
            Click to expand in Recent Builds for full details
          </p>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [builds, setBuilds] = useState<Build[]>([])
  const [stats, setStats] = useState<QueueStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [queueStatus, setQueueStatus] = useState<'idle' | 'processing' | 'waiting'>('idle')

  // Scaffold state
  const [scaffoldModalOpen, setScaffoldModalOpen] = useState(false)
  const [scaffoldIdea, setScaffoldIdea] = useState<Idea | null>(null)
  const [scaffoldResult, setScaffoldResult] = useState<{ claudeMd: string; tasks: ScaffoldTask[]; repoStructure?: string[]; stackReasoning?: string } | null>(null)
  const [scaffoldLoading, setScaffoldLoading] = useState(false)
  const [scaffoldError, setScaffoldError] = useState<string | null>(null)
  const [scaffoldBuildId, setScaffoldBuildId] = useState<string | null>(null)

  const supabase = useMemo(() => {
    try {
      return getSupabase()
    } catch {
      return null
    }
  }, [])

  const fetchData = useCallback(async () => {
    if (!supabase) {
      setError('Supabase not configured. Add environment variables.')
      setLoading(false)
      return
    }

    try {
      const [ideasRes, buildsRes, statsRes] = await Promise.all([
        supabase.from('dj_ideas').select('*').order('created_at', { ascending: false }),
        supabase.from('dj_builds').select('*, build_report, dj_ideas(title, project_dna)').order('created_at', { ascending: false }),
        supabase.from('dj_queue_stats').select('*'),
      ])

      if (ideasRes.error) throw ideasRes.error
      if (buildsRes.error) throw buildsRes.error

      setIdeas(ideasRes.data || [])
      setBuilds(
        (buildsRes.data || []).map((b: Record<string, unknown>) => ({
          ...b,
          title: (b.dj_ideas as Record<string, unknown>)?.title,
          project_dna: (b.dj_ideas as Record<string, unknown>)?.project_dna,
        })) as Build[]
      )
      setStats(statsRes.data || [])
      setError(null)
    } catch (err) {
      console.error('Failed to fetch data:', err)
      setError('Failed to connect to database. Check your Supabase configuration.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const handleScaffold = useCallback(async (idea: Idea) => {
    setScaffoldIdea(idea)
    setScaffoldModalOpen(true)
    setScaffoldLoading(true)
    setScaffoldResult(null)
    setScaffoldError(null)
    setScaffoldBuildId(null)

    try {
      const res = await fetch('/api/scaffold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId: idea.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scaffold failed')
      setScaffoldResult({
        claudeMd: data.claudeMd,
        tasks: data.tasks,
        repoStructure: data.repoStructure,
        stackReasoning: data.stackReasoning,
      })
      setScaffoldBuildId(data.build?.id || null)
      fetchData()
    } catch (err) {
      setScaffoldError(err instanceof Error ? err.message : 'Scaffold failed')
    } finally {
      setScaffoldLoading(false)
    }
  }, [fetchData])

  const handleScaffoldBuild = useCallback(async () => {
    if (!scaffoldIdea) return
    setScaffoldModalOpen(false)
    try {
      await fetch('/api/start-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId: scaffoldIdea.id, buildId: scaffoldBuildId }),
      })
      fetchData()
    } catch (err) {
      console.error('Failed to start build:', err)
    }
  }, [scaffoldIdea, scaffoldBuildId, fetchData])

  const clearBuildHistory = useCallback(async () => {
    if (!supabase) return

    await supabase
      .from('dj_builds')
      .delete()
      .in('status', ['completed', 'failed'])

    fetchData()
  }, [supabase, fetchData])

  const deleteBuild = useCallback(async (buildId: string) => {
    if (!supabase) return

    await supabase
      .from('dj_builds')
      .delete()
      .eq('id', buildId)

    fetchData()
  }, [supabase, fetchData])

  // Track if we're currently starting a build to prevent duplicates
  const [isStartingBuild, setIsStartingBuild] = useState(false)

  // Queue processor - automatically starts builds for approved ideas
  const processQueue = useCallback(async () => {
    if (!supabase || loading || isStartingBuild) return

    // Check if there's already a running build
    const runningBuilds = builds.filter(b => b.status === 'running')
    if (runningBuilds.length > 0) {
      setQueueStatus('processing')
      return
    }

    // Check for approved ideas
    const approvedIdeas = ideas.filter(i => i.status === 'approved')
    if (approvedIdeas.length === 0) {
      setQueueStatus('idle')
      return
    }

    // Start build for the oldest approved idea
    setIsStartingBuild(true)
    setQueueStatus('processing')
    const nextIdea = approvedIdeas[approvedIdeas.length - 1] // Oldest first
    console.log('[Queue] Starting build for:', nextIdea.title)

    try {
      await fetch('/api/start-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId: nextIdea.id }),
      })
    } catch (err) {
      console.error('[Queue] Failed to start build:', err)
    } finally {
      // Reset after a short delay to allow state to update
      setTimeout(() => setIsStartingBuild(false), 5000)
    }
  }, [supabase, ideas, builds, loading, isStartingBuild])

  useEffect(() => {
    fetchData()

    if (!supabase) return

    const ideasChannel = supabase
      .channel('dj-ideas-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dj_ideas' }, () => {
        fetchData()
      })
      .subscribe()

    const buildsChannel = supabase
      .channel('dj-builds-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dj_builds' }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ideasChannel)
      supabase.removeChannel(buildsChannel)
    }
  }, [fetchData, supabase])

  // Queue processor disabled - builds only trigger on manual "Approve & Build" click
  // To re-enable auto-queue, uncomment this:
  // useEffect(() => {
  //   const interval = setInterval(() => processQueue(), 30000)
  //   processQueue()
  //   return () => clearInterval(interval)
  // }, [processQueue])

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">DJ Loop</h1>
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
            <p className="text-zinc-400 text-sm mt-2">
              Make sure you have set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">DJ Loop</h1>
            {queueStatus === 'processing' && (
              <span className="flex items-center gap-1.5 text-xs bg-green-900/50 text-green-400 px-2 py-1 rounded-full">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Building...
              </span>
            )}
            {queueStatus === 'idle' && ideas.filter(i => i.status === 'approved').length > 0 && (
              <span className="flex items-center gap-1.5 text-xs bg-yellow-900/50 text-yellow-400 px-2 py-1 rounded-full">
                <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                {ideas.filter(i => i.status === 'approved').length} in queue
              </span>
            )}
          </div>
          <span className="text-zinc-500 text-sm">Idea → PRD → Build → Ship</span>
        </div>

        <QueueStatsDisplay stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <IdeaInput onIdeaCreated={fetchData} />
            <DraftIdeas ideas={ideas} onUpdate={fetchData} />
            <PendingApprovals ideas={ideas} onUpdate={fetchData} onScaffold={handleScaffold} />
          </div>

          <div className="space-y-6">
            <FailedBuildAlert builds={builds} onDismiss={deleteBuild} />
            <BuildQueue ideas={ideas} onUpdate={fetchData} />
            <ActiveBuilds builds={builds} />
            <RecentShips builds={builds} onClearHistory={clearBuildHistory} onDeleteBuild={deleteBuild} />
          </div>
        </div>
      </div>

      <ScaffoldModal
        isOpen={scaffoldModalOpen}
        ideaTitle={scaffoldIdea?.title || ''}
        result={scaffoldResult}
        isLoading={scaffoldLoading}
        error={scaffoldError}
        onClose={() => setScaffoldModalOpen(false)}
        onStartBuild={handleScaffoldBuild}
      />
    </div>
  )
}
