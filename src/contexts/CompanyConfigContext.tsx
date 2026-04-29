import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { AssetState, StaffCategory, ItemSubtype, UniformCategory } from '@/types'

interface CompanyConfig {
  companyName: string
  logoUrl: string
  numSets: number
  assetStates: AssetState[]
  staffCategories: StaffCategory[]
  itemSubtypes: ItemSubtype[]
  uniformCategories: UniformCategory[]
  loaded: boolean
  reloadCompanyName: () => Promise<void>
  reloadLogo: () => Promise<void>
  getState: (id: string) => AssetState | undefined
  getAssignedState: () => AssetState | undefined
  getInitialState: () => AssetState | undefined
  getStaffCategory: (id: string) => StaffCategory | undefined
  getItemSubtype: (id: string) => ItemSubtype | undefined
}

const CompanyConfigContext = createContext<CompanyConfig>({
  companyName: '', logoUrl: '', numSets: 2, assetStates: [], staffCategories: [], itemSubtypes: [], uniformCategories: [], loaded: false,
  reloadCompanyName: async () => {}, reloadLogo: async () => {},
  getState: () => undefined, getAssignedState: () => undefined,
  getInitialState: () => undefined, getStaffCategory: () => undefined,
  getItemSubtype: () => undefined,
})

export function CompanyConfigProvider({ children }: { children: ReactNode }) {
  const [companyName, setCompanyName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [numSets, setNumSets] = useState(2)
  const [assetStates, setAssetStates] = useState<AssetState[]>([])
  const [staffCategories, setStaffCategories] = useState<StaffCategory[]>([])
  const [itemSubtypes, setItemSubtypes] = useState<ItemSubtype[]>([])
  const [uniformCategories, setUniformCategories] = useState<UniformCategory[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadConfig()
      else {
        setCompanyName(''); setLogoUrl(''); setAssetStates([])
        setStaffCategories([]); setItemSubtypes([]); setUniformCategories([]); setLoaded(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadConfig() {
    const [tenantRes, statesRes, catsRes, subtypesRes, uniformCatsRes] = await Promise.all([
      supabase.from('tenants').select('name, num_sets, logo_url').single(),
      supabase.from('asset_states').select('*').order('sort_order'),
      supabase.from('staff_categories').select('*').order('sort_order'),
      supabase.from('item_subtypes').select('*').order('sort_order'),
      supabase.from('uniform_categories').select('*').order('name'),
    ])
    setCompanyName(tenantRes.data?.name ?? '')
    setLogoUrl(tenantRes.data?.logo_url ?? '')
    setNumSets(tenantRes.data?.num_sets ?? 2)
    setAssetStates(statesRes.data ?? [])
    setStaffCategories(catsRes.data ?? [])
    setItemSubtypes(subtypesRes.data ?? [])
    setUniformCategories(uniformCatsRes.data ?? [])
    setLoaded(true)
  }

  async function reloadCompanyName() {
    const { data } = await supabase.from('tenants').select('name, num_sets, logo_url').single()
    if (data) { setCompanyName(data.name); setLogoUrl(data.logo_url ?? ''); setNumSets(data.num_sets ?? 2) }
  }

  async function reloadLogo() {
    const { data } = await supabase.from('tenants').select('logo_url').single()
    if (data) setLogoUrl(data.logo_url ?? '')
  }

  const value: CompanyConfig = {
    companyName,
    logoUrl,
    numSets,
    assetStates,
    staffCategories,
    itemSubtypes,
    uniformCategories,
    loaded,
    reloadCompanyName,
    reloadLogo,
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
