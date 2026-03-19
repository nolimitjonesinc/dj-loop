'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ScaffoldTask } from '@/lib/agents/scaffold'

interface ScaffoldResult {
  claudeMd: string
  tasks: ScaffoldTask[]
  repoStructure?: string[]
  stackReasoning?: string
}

interface ScaffoldModalProps {
  isOpen: boolean
  ideaTitle: string
  result: ScaffoldResult | null
  isLoading: boolean
  error?: string | null
  onClose: () => void
  onStartBuild: () => void
}

const SCAFFOLD_STEPS = [
  'Analyzing idea and requirements...',
  'Generating task breakdown...',
  'Designing repo structure...',
  'Building CLAUDE.md...',
  'Finalizing scaffold...',
]

export function ScaffoldModal({
  isOpen,
  ideaTitle,
  result,
  isLoading,
  error,
  onClose,
  onStartBuild,
}: ScaffoldModalProps) {
  const [copied, setCopied] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  // Simulate progress steps while loading
  useEffect(() => {
    if (!isLoading) {
      setCurrentStep(0)
      return
    }
    setCurrentStep(0)
    const intervals = [0, 2000, 5000, 9000, 13000]
    const timers = intervals.map((delay, i) =>
      setTimeout(() => setCurrentStep(i), delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [isLoading])

  const handleCopy = () => {
    if (result?.claudeMd) {
      navigator.clipboard.writeText(result.claudeMd)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-3xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-white">{ideaTitle}</DialogTitle>
          <p className="text-sm text-zinc-400">
            {isLoading ? 'Generating scaffold...' : result ? 'Scaffold ready' : ''}
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="py-6 space-y-3">
            {SCAFFOLD_STEPS.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                  i < currentStep
                    ? 'border-green-500 bg-green-500/20'
                    : i === currentStep
                      ? 'border-blue-400 animate-pulse'
                      : 'border-zinc-700'
                }`}>
                  {i < currentStep && <span className="text-green-400 text-xs">&#10003;</span>}
                  {i === currentStep && <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" />}
                </div>
                <span className={`text-sm font-mono transition-colors duration-300 ${
                  i < currentStep ? 'text-green-400' : i === currentStep ? 'text-white' : 'text-zinc-600'
                }`}>
                  {i < currentStep ? step.replace('...', ' — done') : step}
                </span>
              </div>
            ))}
            <p className="text-xs text-zinc-500 mt-4 font-mono">
              This typically takes 15-30 seconds. Two AI calls in sequence.
            </p>
          </div>
        ) : error ? (
          <div className="py-6 text-center">
            <div className="inline-block px-6 py-4 rounded-xl bg-red-900/20 border border-red-800">
              <p className="text-red-400 text-sm font-medium mb-3">{error}</p>
            </div>
          </div>
        ) : result ? (
          <>
            <Tabs defaultValue="claude" className="w-full">
              <TabsList className="bg-zinc-800 border-zinc-700">
                <TabsTrigger value="claude" className="data-[state=active]:bg-zinc-700">CLAUDE.md</TabsTrigger>
                <TabsTrigger value="tasks" className="data-[state=active]:bg-zinc-700">Tasks ({result.tasks.length})</TabsTrigger>
                {result.repoStructure && (
                  <TabsTrigger value="structure" className="data-[state=active]:bg-zinc-700">Structure</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="claude" className="max-h-[50vh] overflow-y-auto mt-4">
                <pre className="font-mono text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap bg-zinc-800 rounded-lg p-4">
                  {result.claudeMd}
                </pre>
              </TabsContent>

              <TabsContent value="tasks" className="max-h-[50vh] overflow-y-auto mt-4">
                <div className="space-y-1">
                  {result.tasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-3 py-3 border-b border-zinc-800 last:border-0">
                      <div className="w-4 h-4 border-2 border-zinc-600 rounded shrink-0 mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] tracking-wider text-blue-400 uppercase">
                            {task.phase}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            task.priority === 'P0' ? 'bg-red-900/30 text-red-400' :
                            task.priority === 'P1' ? 'bg-yellow-900/30 text-yellow-400' :
                            'bg-zinc-800 text-zinc-500'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-white mt-1">{task.task}</p>
                        <p className="text-xs text-zinc-400 mt-1">{task.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {result.repoStructure && (
                <TabsContent value="structure" className="max-h-[50vh] overflow-y-auto mt-4">
                  {result.stackReasoning && (
                    <p className="text-sm text-zinc-400 mb-4">{result.stackReasoning}</p>
                  )}
                  <div className="font-mono text-sm space-y-1">
                    {result.repoStructure.map((path, i) => (
                      <div key={i} className="text-zinc-300 py-1 px-3 bg-zinc-800 rounded">
                        {path}
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}
            </Tabs>

            <div className="flex gap-3 pt-4 border-t border-zinc-800">
              <Button
                onClick={onStartBuild}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Start Build
              </Button>
              <Button
                onClick={handleCopy}
                variant="outline"
                className="border-zinc-700 text-zinc-300"
              >
                {copied ? 'Copied!' : 'Copy CLAUDE.md'}
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
