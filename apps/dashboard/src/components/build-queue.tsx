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

interface BuildQueueProps {
  ideas: Idea[]
  onUpdate?: () => void
}

export function BuildQueue({ ideas, onUpdate }: BuildQueueProps) {
  const [clearing, setClearing] = useState(false)

  const supabase = useMemo(() => {
    try {
      return getSupabase()
    } catch {
      return null
    }
  }, [])

  // Queue = approved ideas waiting to be built
  const queuedIdeas = ideas.filter((i) => i.status === 'approved')

  const removeFromQueue = async (ideaId: string) => {
    if (!supabase) return

    // Move back to pending_approval so user can re-approve later
    await supabase
      .from('dj_ideas')
      .update({ status: 'pending_approval' })
      .eq('id', ideaId)

    onUpdate?.()
  }

  const clearQueue = async () => {
    if (!supabase || queuedIdeas.length === 0) return

    setClearing(true)
    try {
      // Move all approved back to pending
      await supabase
        .from('dj_ideas')
        .update({ status: 'pending_approval' })
        .eq('status', 'approved')

      onUpdate?.()
    } finally {
      setClearing(false)
    }
  }

  if (queuedIdeas.length === 0) {
    return null // Don't show if queue is empty
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800 border-yellow-600/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-400 rounded-full" />
            <CardTitle className="text-sm font-medium text-zinc-300">
              Build Queue ({queuedIdeas.length})
            </CardTitle>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={clearQueue}
            disabled={clearing || !supabase}
            className="text-xs text-zinc-500 hover:text-red-400"
          >
            {clearing ? 'Clearing...' : 'Clear All'}
          </Button>
        </div>
        <p className="text-zinc-500 text-xs">
          These will build automatically when the current build finishes
        </p>
      </CardHeader>
      <CardContent className="space-y-2 pt-2">
        {queuedIdeas.map((idea, index) => (
          <QueuedIdeaCard
            key={idea.id}
            idea={idea}
            position={index + 1}
            onRemove={() => removeFromQueue(idea.id)}
          />
        ))}
      </CardContent>
    </Card>
  )
}

function QueuedIdeaCard({
  idea,
  position,
  onRemove
}: {
  idea: Idea
  position: number
  onRemove: () => void
}) {
  return (
    <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-zinc-500 text-sm font-mono w-6">#{position}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium truncate">{idea.title}</span>
            <Badge variant="outline" className="text-xs shrink-0">
              {idea.project_dna}
            </Badge>
          </div>
          <p className="text-zinc-500 text-xs truncate">{idea.raw_input}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {idea.prd && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white text-xs">
                PRD
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
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemove}
          className="text-zinc-500 hover:text-red-400 text-xs"
          title="Remove from queue"
        >
          ✕
        </Button>
      </div>
    </div>
  )
}
