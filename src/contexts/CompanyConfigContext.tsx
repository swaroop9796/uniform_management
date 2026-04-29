import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { AssetState, StaffCategory, ItemSubtype } from '@/types'

interface CompanyConfig {
  companyName: string
  numSets: number
  assetStates: AssetState[]
  staffCategories: StaffCategory[]
  itemSubtypes: ItemSubtype[]
  loaded: boolean
  reloadCompanyName: () => Promise<void>
  getState: (id: string) => AssetState | undefined
  getAssignedState: () => AssetState | undefined
  getInitialState: () => AssetState | undefined
  getStaffCategory: (id: string) => StaffCategory | undefined
  getItemSubtype: (id: string) => ItemSubtype | undefined
}

const CompanyConfigContext = createContext<CompanyConfig>({
  companyName: '', numSets: 2, assetStates: [], staffCategories: [], itemSubtypes: [], loaded: false,
  reloadCompanyName: async () => {},
  getState: () => undefined, getAssignedState: () => undefined,
  getInitialState: () => undefined, getStaffCategory: () => undefined,
  getItemSubtype: () => undefined,
})

export function CompanyConfigProvider({ children }: { children: ReactNode }) {
  const [companyName, setCompanyName] = useState('')
  const [numSets, setNumSets] = useState(2)
  const [assetStates, setAssetStates] = useState<AssetState[]>([])
  const [staffCategories, setStaffCategories] = useState<StaffCategory[]>([])
  const [itemSubtypes, setItemSubtypes] = useState<ItemSubtype[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadConfig()
      else { setCompanyName(''); setAssetStates([]); setStaffCategories([]); setItemSubtypes([]); setLoaded(false) }
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadConfig()
      else setLoaded(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadConfig() {
    const [tenantRes, statesRes, catsRes, subtypesRes] = await Promise.all([
      supabase.from('tenants').select('name, num_sets').single(),
      supabase.from('asset_states').select('*').order('sort_order'),
      supabase.from('staff_categories').select('*').order('sort_order'),
      supabase.from('item_subtypes').select('*').order('sort_order'),
    ])
    setCompanyName(tenantRes.data?.name ?? '')
    setNumSets(tenantRes.data?.num_sets ?? 2)
    setAssetStates(statesRes.data ?? [])
    setStaffCategories(catsRes.data ?? [])
    setItemSubtypes(subtypesRes.data ?? [])
    setLoaded(true)
  }

  async function reloadCompanyName() {
    const { data } = await supabase.from('tenants').select('name, num_sets').single()
    if (data) { setCompanyName(data.name); setNumSets(data.num_sets ?? 2) }
  }

  const value: CompanyConfig = {
    companyName,
    numSets,
    assetStates,
    staffCategories,
    itemSubtypes,
    loaded,
    reloadCompanyName,
    getState: (id) => assetStates.find(s => s.id === id),
    getAssignedState: () => assetStates.find(s => s.is_assigned_state),
    getInitialState: () => assetStates.find(s => s.is_initial_state),
    getStaffCategory: (id) => staffCategories.find(c => c.id === id),
    getItemSubtype: (id) => itemSubtypes.find(t => t.id === id),
  }

  return (
    <CompanyConfigContext.Provider value={value}>
      {children}
    </CompanyConfigContext.Provider>
  )
}

export function useCompanyConfig() {
  return useContext(CompanyConfigContext)
}
