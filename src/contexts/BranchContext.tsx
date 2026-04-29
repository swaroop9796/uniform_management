import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { Branch, Profile } from '@/types'

interface BranchContextValue {
  branches: Branch[]
  selectedBranchId: string | 'all'
  setSelectedBranchId: (id: string | 'all') => void
  selectedBranch: Branch | undefined
  isAllBranches: boolean
  reloadBranches: () => void
}

const BranchContext = createContext<BranchContextValue>({
  branches: [],
  selectedBranchId: 'all',
  setSelectedBranchId: () => {},
  selectedBranch: undefined,
  isAllBranches: true,
  reloadBranches: () => {},
})

export function BranchProvider({ profile, children }: { profile: Profile | null; children: ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, _setSelectedBranchId] = useState<string | 'all'>(() => {
    return (sessionStorage.getItem('selectedBranchId') as string | null) ?? 'all'
  })

  useEffect(() => {
    if (!profile) { setBranches([]); return }
    loadBranches(profile)
  }, [profile?.id])

  async function loadBranches(p: Profile) {
    let loaded: Branch[] = []
    if (p.role === 'owner') {
      const { data } = await supabase.from('branches').select('*').eq('tenant_id', p.tenant_id).order('name')
      loaded = data ?? []
    } else {
      const { data: ub } = await supabase.from('user_branches').select('branch_id').eq('user_id', p.id)
      const ids = (ub ?? []).map(r => r.branch_id)
      if (ids.length === 0) { setBranches([]); return }
      const { data } = await supabase.from('branches').select('*').in('id', ids).order('name')
      loaded = data ?? []
    }
    setBranches(loaded)
    // Auto-select first branch if nothing valid is stored
    const stored = sessionStorage.getItem('selectedBranchId')
    const validStored = stored && loaded.some(b => b.id === stored)
    if (!validStored && loaded.length > 0) {
      _setSelectedBranchId(loaded[0].id)
      sessionStorage.setItem('selectedBranchId', loaded[0].id)
    }
  }

  function setSelectedBranchId(id: string | 'all') {
    _setSelectedBranchId(id)
    sessionStorage.setItem('selectedBranchId', id)
  }

  function reloadBranches() {
    if (profile) loadBranches(profile)
  }

  const selectedBranch = selectedBranchId === 'all'
    ? undefined
    : branches.find(b => b.id === selectedBranchId)

  return (
    <BranchContext.Provider value={{
      branches,
      selectedBranchId,
      setSelectedBranchId,
      selectedBranch,
      isAllBranches: selectedBranchId === 'all',
      reloadBranches,
    }}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  return useContext(BranchContext)
}
