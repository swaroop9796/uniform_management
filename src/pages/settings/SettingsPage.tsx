import { useNavigate } from 'react-router-dom'
import { Building2, GitBranch, Users, Tag, Layers, Package, ChevronRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useCompanyConfig } from '@/contexts/CompanyConfigContext'
import { supabase } from '@/lib/supabase'

const companySections = [
  { to: '/settings/company',    icon: Building2, label: 'Company Details',   desc: 'Name and logo' },
  { to: '/settings/branches',   icon: GitBranch, label: 'Branches',          desc: 'Add and manage locations' },
  { to: '/settings/users',      icon: Users,     label: 'Users & Access',    desc: 'Invite store managers, manage access' },
]

const uniformSections = [
  { to: '/settings/staff-categories', icon: Tag,     label: 'Staff Categories', desc: 'Chef, Counter, Cashier…' },
  { to: '/settings/asset-states',     icon: Layers,  label: 'Asset States',     desc: 'With Staff, In Laundry, In Store…' },
  { to: '/settings/item-subtypes',    icon: Package, label: 'Item Types',       desc: 'Shirt, Pant, Apron…' },
]

export function SettingsPage() {
  const { profile } = useAuth()
  const { numSets, reloadCompanyName } = useCompanyConfig()
  const navigate = useNavigate()

  if (profile?.role !== 'owner') {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-sm text-slate-500">Settings are only available to owners.</p>
      </div>
    )
  }

  async function updateNumSets(value: number) {
    await supabase.from('tenants').update({ num_sets: value }).eq('id', profile!.tenant_id)
    await reloadCompanyName()
  }

  return (
    <div className="px-4 py-5 space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Settings</h1>

      {/* Company section */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">Company</p>
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {companySections.map((item, i, arr) => {
            const Icon = item.icon
            return (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors ${i < arr.length - 1 ? 'border-b border-slate-50' : ''}`}
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
              </button>
            )
          })}
        </div>
      </div>

      {/* Uniform Config section */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">Uniform Config</p>
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {/* Uniform sets — inline control */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-50">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-slate-600">S</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">Sets per staff</p>
              <p className="text-xs text-slate-400">Max uniform sets each staff member can have</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => updateNumSets(Math.max(1, numSets - 1))}
                disabled={numSets <= 1}
                className="w-7 h-7 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 flex items-center justify-center text-base leading-none"
              >−</button>
              <span className="text-sm font-bold text-slate-900 w-4 text-center">{numSets}</span>
              <button
                onClick={() => updateNumSets(Math.min(10, numSets + 1))}
                disabled={numSets >= 10}
                className="w-7 h-7 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 flex items-center justify-center text-base leading-none"
              >+</button>
            </div>
          </div>

          {uniformSections.map((item, i, arr) => {
            const Icon = item.icon
            return (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors ${i < arr.length - 1 ? 'border-b border-slate-50' : ''}`}
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
