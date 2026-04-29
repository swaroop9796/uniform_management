import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { UniformStatus } from '@/types'

interface TransitionParams {
  itemId: string
  newStatus: UniformStatus
  staffId?: string | null
  performedBy: string
  notes?: string
}

export function useUniformTransition() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function transition({ itemId, newStatus, staffId, performedBy, notes }: TransitionParams) {
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.rpc('transition_uniform', {
      p_item_id: itemId,
      p_new_status: newStatus,
      p_staff_id: staffId ?? null,
      p_performed_by: performedBy,
      p_notes: notes ?? null,
    })
    setLoading(false)
    if (err) { setError(err.message); return false }
    return true
  }

  return { transition, loading, error }
}
