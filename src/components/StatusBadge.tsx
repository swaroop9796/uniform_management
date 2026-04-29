import { cn } from '@/lib/utils'
import type { UniformStatus } from '@/types'
import { STATUS_LABELS } from '@/types'

const styles: Record<UniformStatus, string> = {
  with_staff: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  in_laundry: 'bg-amber-100 text-amber-800 border-amber-200',
  in_store:   'bg-blue-100 text-blue-800 border-blue-200',
  damaged:    'bg-red-100 text-red-800 border-red-200',
  lost:       'bg-slate-100 text-slate-600 border-slate-200',
}

interface Props {
  status: UniformStatus
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'md' }: Props) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border font-medium',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
      styles[status]
    )}>
      {STATUS_LABELS[status]}
    </span>
  )
}
