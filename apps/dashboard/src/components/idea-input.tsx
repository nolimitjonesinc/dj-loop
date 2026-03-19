'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSupabase, type InputType, type ProjectDNA } from '@/lib/supabase'

interface IdeaInputProps {
  onIdeaCreated?: () => void
}

export function IdeaInput({ onIdeaCreated }: IdeaInputProps) {
  const [input, setInput] = useState('')
  const [inputType, setInputType] = useState<InputType>('manual')
  const [projectDna, setProjectDna] = useState<ProjectDNA>('utility-app')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const supabase = useMemo(() => {
    try {
      return getSupabase()
    } catch {
      return null
    }
  }, [])

  const handleSubmit = async () => {
    if (!input.trim() || !supabase) return

    setLoading(true)
    setStatus('Creating idea...')

    try {
      const title = input.slice(0, 50) + (input.length > 50 ? '...' : '')

      // Step 1: Create the idea
      const { data, error } = await supabase.from('dj_ideas').insert({
        title,
        raw_input: input,
        input_type: inputType,
        project_dna: projectDna,
        status: 'generating_prd',
        source_url: inputType === 'tweet' ? extractUrl(input) : null,
      }).select('id').single()

      if (error) throw error

      // Step 2: Send through Genesis Engine analysis
      setStatus('Analyzing idea...')

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId: data.id }),
      })

      if (!response.ok) {
        throw new Error('Failed to analyze idea')
      }

      setInput('')
      setStatus(null)
      onIdeaCreated?.()
    } catch (err) {
      console.error('Failed to create idea:', err)
      setStatus('Error - try again')
      setTimeout(() => setStatus(null), 2000)
    } finally {
      setLoading(false)
    }
  }

  const extractUrl = (text: string): string | null => {
    const urlMatch = text.match(/https?:\/\/[^\s]+/)
    return urlMatch ? urlMatch[0] : null
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-300">New Idea</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          placeholder="Describe your idea, paste a tweet URL, or explain a bug..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-h-[100px] bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
        />

        <div className="flex gap-2 flex-wrap">
          <select
            value={inputType}
            onChange={(e) => setInputType(e.target.value as InputType)}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300"
          >
            <option value="manual">Idea</option>
            <option value="tweet">Tweet</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
          </select>

          <select
            value={projectDna}
            onChange={(e) => setProjectDna(e.target.value as ProjectDNA)}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300"
          >
            <option value="utility-app">Utility App</option>
            <option value="chrome-extension">Chrome Extension</option>
            <option value="adhd-game">ADHD Game</option>
            <option value="api">API</option>
            <option value="script">Script</option>
            <option value="world-builder">World Builder</option>
          </select>

          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || loading || !supabase}
            className="ml-auto bg-white text-black hover:bg-zinc-200"
          >
            {status || 'Create & Generate PRD'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
