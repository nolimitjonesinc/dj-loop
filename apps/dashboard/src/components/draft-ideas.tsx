'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getSupabase, type Idea } from '@/lib/supabase'

interface DraftIdeasProps {
  ideas: Idea[]
  onUpdate?: () => void
}

export function DraftIdeas({ ideas, onUpdate }: DraftIdeasProps) {
  const draftIdeas = ideas.filter((i) => i.status === 'draft')

  if (draftIdeas.length === 0) {
    return null
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-zinc-300">
          Draft Ideas ({draftIdeas.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {draftIdeas.map((idea) => (
          <DraftIdeaCard key={idea.id} idea={idea} onUpdate={onUpdate} />
        ))}
      </CardContent>
    </Card>
  )
}

function DraftIdeaCard({ idea, onUpdate }: { idea: Idea; onUpdate?: () => void }) {
  const [loading, setLoading] = useState(false)

  const supabase = useMemo(() => {
    try {
      return getSupabase()
    } catch {
      return null
    }
  }, [])

  const handleGeneratePRD = async () => {
    if (!supabase) return
    setLoading(true)
    try {
      await supabase
        .from('dj_ideas')
        .update({ status: 'generating_prd' })
        .eq('id', idea.id)

      const response = await fetch('/api/generate-prd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId: idea.id }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate PRD')
      }

      onUpdate?.()
    } catch (err) {
      console.error('Failed to generate PRD:', err)
      if (supabase) {
        await supabase
          .from('dj_ideas')
          .update({ status: 'draft' })
          .eq('id', idea.id)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!supabase) return
    try {
      await supabase.from('dj_ideas').delete().eq('id', idea.id)
      onUpdate?.()
    } catch (err) {
      console.error('Failed to delete idea:', err)
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
            <Badge variant="outline" className="text-xs shrink-0 text-zinc-500">
              {idea.input_type}
            </Badge>
          </div>
          <p className="text-sm text-zinc-400 line-clamp-2">{idea.raw_input}</p>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <Button
          size="sm"
          onClick={handleGeneratePRD}
          disabled={loading || !supabase}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? 'Generating...' : 'Generate PRD'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDelete}
          disabled={!supabase}
          className="text-zinc-400 hover:text-red-400"
        >
          Delete
        </Button>
      </div>
    </div>
  )
}
