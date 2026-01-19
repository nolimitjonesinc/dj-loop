'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { QueueStats } from '@/lib/supabase'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-zinc-500' },
  generating_prd: { label: 'Generating', color: 'bg-blue-500' },
  pending_approval: { label: 'Pending', color: 'bg-yellow-500' },
  approved: { label: 'Queued', color: 'bg-yellow-500' },
  rejected: { label: 'Rejected', color: 'bg-red-500' },
  building: { label: 'Building', color: 'bg-purple-500' },
  shipped: { label: 'Shipped', color: 'bg-emerald-500' },
  archived: { label: 'Archived', color: 'bg-zinc-400' },
}

interface QueueStatsProps {
  stats: QueueStats[]
}

export function QueueStatsDisplay({ stats }: QueueStatsProps) {
  const getCount = (status: string) => {
    const stat = stats.find((s) => s.status === status)
    return stat?.count ?? 0
  }

  const displayStatuses = ['draft', 'generating_prd', 'pending_approval', 'approved', 'building', 'shipped']

  return (
    <div className="grid grid-cols-6 gap-3">
      {displayStatuses.map((status) => {
        const config = STATUS_CONFIG[status]
        const count = getCount(status)
        return (
          <Card key={status} className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${config.color}`} />
                <span className="text-xs text-zinc-400">{config.label}</span>
              </div>
              <div className="text-2xl font-bold text-white">{count}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
