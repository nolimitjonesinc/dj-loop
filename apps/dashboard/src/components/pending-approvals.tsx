'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { getSupabase, type Idea } from '@/lib/supabase'

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

interface PendingApprovalsProps {
  ideas: Idea[]
  onUpdate?: () => void
}

export function PendingApprovals({ ideas, onUpdate }: PendingApprovalsProps) {
  const pendingIdeas = ideas.filter((i) => i.status === 'pending_approval')

  if (pendingIdeas.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-zinc-300">Pending Approval</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-500 text-sm">No ideas pending approval</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-zinc-300">
          Pending Approval ({pendingIdeas.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingIdeas.map((idea) => (
          <IdeaApprovalCard key={idea.id} idea={idea} onUpdate={onUpdate} />
        ))}
      </CardContent>
    </Card>
  )
}

function IdeaApprovalCard({ idea, onUpdate }: { idea: Idea; onUpdate?: () => void }) {
  const [loading, setLoading] = useState<string | null>(null)

  const supabase = useMemo(() => {
    try {
      return getSupabase()
    } catch {
      return null
    }
  }, [])

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!supabase) return
    setLoading(action)
    try {
      const newStatus = action === 'approve' ? 'approved' : 'rejected'
      const { error } = await supabase
        .from('dj_ideas')
        .update({
          status: newStatus,
          prd_approved: action === 'approve'
        })
        .eq('id', idea.id)

      if (error) throw error

      // Auto-start build when approved
      if (action === 'approve') {
        try {
          await fetch('/api/start-build', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ideaId: idea.id }),
          })
        } catch (buildErr) {
          console.error('Failed to start build:', buildErr)
          // Don't fail the approval if build start fails
        }
      }

      onUpdate?.()
    } catch (err) {
      console.error('Failed to update idea:', err)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="p-3 bg-zinc-800 rounded-lg border border-zinc-700">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-white truncate">{idea.title}</h3>
            <Badge variant="outline" className="text-xs shrink-0">
              {idea.project_dna}
            </Badge>
          </div>
          <p className="text-sm text-zinc-400 line-clamp-2">{idea.raw_input}</p>
        </div>
      </div>

      {idea.prd && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="mt-2 text-zinc-400 hover:text-white">
              View PRD
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">{idea.title} - PRD</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <Textarea
                value={idea.prd}
                readOnly
                className="min-h-[400px] bg-zinc-800 border-zinc-700 text-zinc-300 font-mono text-sm"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="flex gap-2 mt-3">
        <Button
          size="sm"
          onClick={() => handleAction('approve')}
          disabled={loading !== null || !supabase}
          className="bg-green-600 hover:bg-green-700 text-white min-w-[140px]"
        >
          {loading === 'approve' ? (
            <span className="flex items-center gap-2">
              <Spinner />
              Starting build...
            </span>
          ) : 'Approve & Build'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction('reject')}
          disabled={loading !== null || !supabase}
          className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
        >
          {loading === 'reject' ? '...' : 'Kill'}
        </Button>
      </div>
    </div>
  )
}
