import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight, Shirt, Plus, Pencil, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useBranch } from '@/contexts/BranchContext'
import { useCompanyConfig } from '@/contexts/CompanyConfigContext'
import { friendlyError } from '@/lib/utils'
import type { StaffMember, RoleCategory } from '@/types'
import { ROLE_CATEGORY_LABELS } from '@/types'

const FALLBACK_CATEGORIES: RoleCategory[] = ['chef', 'counter', 'cashier', 'supervisor', 'hk_boys', 'hk_ladies']

interface StaffWithCount extends StaffMember { uniform_count: number }
interface Group { category: RoleCategory; staff: StaffWithCount[] }

const CATEGORY_ORDER: RoleCategory[] = ['chef', 'counter', 'cashier', 'supervisor', 'hk_boys', 'hk_ladies']

const CATEGORY_DOT: Record<RoleCategory, string> = {
  chef:       '#f59e0b',
  counter:    '#3b82f6',
  cashier:    '#a855f7',
  supervisor: '#06b6d4',
  hk_boys:    '#10b981',
  hk_ladies:  '#ec4899',
}

function nameToSlug(name: string): RoleCategory {
  const map: Record<string, RoleCategory> = {
    'Chef': 'chef', 'Counter': 'counter', 'Cashier': 'cashier',
    'Supervisor': 'supervisor', 'HK Boys': 'hk_boys', 'HK Ladies': 'hk_ladies',
  }
  return map[name] ?? 'chef'
}

const emptyForm = { name: '', role_category: 'chef' as RoleCategory }

export function StaffListPage() {
  const { profile } = useAuth()
  const { selectedBranchId } = useBranch()
  const { staffCategories } = useCompanyConfig()
  const navigate = useNavigate()
  const [allStaff, setAllStaff] = useState<StaffWithCount[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [search, setSearch] = useState('')
  const [noUniformsOnly, setNoUniformsOnly] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<StaffMember | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const canEdit = profile?.role && ['owner', 'store_manager'].includes(profile.role)

  useEffect(() => { if (selectedBranchId && selectedBranchId !== 'all') loadStaff() }, [selectedBranchId])

  useEffect(() => {
    const query = search.toLowerCase()
    const filtered = allStaff.filter(s => {
      if (noUniformsOnly && s.uniform_count > 0) return false
      if (query && !s.name.toLowerCase().includes(query)) return false
      return true
    })
    const grouped: Group[] = CATEGORY_ORDER
      .map(cat => ({ category: cat, staff: filtered.filter(s => s.role_category === cat) }))
      .filter(g => g.staff.length > 0)
    setGroups(grouped)
  }, [search, noUniformsOnly, allStaff])

  async function loadStaff() {
    const [staffRes, itemsRes] = await Promise.all([
      supabase.from('staff_members').select('*').eq('is_active', true).eq('branch_id', selectedBranchId).order('name', { ascending: true }),
      supabase.from('uniform_items').select('current_staff_id').eq('branch_id', selectedBranchId).not('current_staff_id', 'is', null),
    ])
    const items = itemsRes.data ?? []
    const list: StaffWithCount[] = (staffRes.data ?? []).map(s => ({
      ...s,
      uniform_count: items.filter(i => i.current_staff_id === s.id).length,
    }))
    setAllStaff(list)
    setLoading(false)
  }

  function toggleGroup(cat: RoleCategory) {
    setCollapsed(c => ({ ...c, [cat]: !c[cat] }))
  }

  function openAdd() { setForm(emptyForm); setEditing(null); setFormError(''); setShowForm(true) }
  function openEdit(s: StaffMember, e: React.MouseEvent) {
    e.stopPropagation()
    setForm({ name: s.name, role_category: s.role_category })
    setEditing(s); setFormError(''); setShowForm(true)
  }
  function closeForm() { setShowForm(false); setEditing(null) }

  async function save() {
    if (!form.name.trim()) { setFormError('Name is required'); return }
    setSaving(true); setFormError('')
    if (editing) {
      const { error } = await supabase.from('staff_members').update({
        name: form.name,
        role_category: form.role_category,
      }).eq('id', editing.id)
      if (error) { setFormError(friendlyError(error)); setSaving(false); return }
    } else {
      const { error } = await supabase.from('staff_members').insert({
        name: form.name,
        role_category: form.role_category,
        tenant_id: profile!.tenant_id, branch_id: selectedBranchId,
      })
      if (error) { setFormError(friendlyError(error)); setSaving(false); return }
    }
    setSaving(false); closeForm(); loadStaff()
  }

  async function deactivate(s: StaffMember, e: React.MouseEvent) {
    e.stopPropagation()
    const { count } = await supabase.from('uniform_items')
      .select('id', { count: 'exact', head: true }).eq('current_staff_id', s.id)
    const assignedMsg = (count ?? 0) > 0
      ? `They currently have ${count} uniform(s) assigned — these will be unassigned. Transition history is kept.`
      : `Their uniform history will be kept.`
    if (!confirm(`Remove ${s.name}? ${assignedMsg}`)) return
    await supabase.from('staff_members').update({ is_active: false }).eq('id', s.id)
    if ((count ?? 0) > 0) {
      await supabase.from('uniform_items').update({ current_staff_id: null }).eq('current_staff_id', s.id)
    }
    loadStaff()
  }

  const noUniformsCount = allStaff.filter(s => s.uniform_count === 0).length

  const categoryOptions = staffCategories.length > 0
    ? staffCategories.map(c => ({ value: nameToSlug(c.name), label: c.name }))
    : (FALLBACK_CATEGORIES as RoleCategory[]).map(c => ({ value: c, label: ROLE_CATEGORY_LABELS[c] }))

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" /></div>

  return (
    <div className="px-4 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">
          Staff <span className="text-slate-400 font-normal text-base">({allStaff.length})</span>
        </h1>
        {canEdit && (
          <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium active:bg-slate-800">
            <Plus size={16} /> Add
          </button>
        )}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      <button
        onClick={() => setNoUniformsOnly(v => !v)}
        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${noUniformsOnly ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
      >
        No Uniforms ({noUniformsCount})
      </button>

      {groups.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-8">No staff found</p>
      )}

      {groups.map(group => {
        const isCollapsed = collapsed[group.category]
        return (
          <div key={group.category} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <button
              onClick={() => toggleGroup(group.category)}
              className="w-full flex items-center gap-2 px-4 py-3 border-b border-slate-50"
            >
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CATEGORY_DOT[group.category] }} />
              <span className="text-sm font-semibold text-slate-800">{ROLE_CATEGORY_LABELS[group.category]}</span>
              <span className="text-xs text-slate-400">{group.staff.length} staff</span>
              {isCollapsed
                ? <ChevronDown size={14} className="text-slate-400 ml-auto" />
                : <ChevronUp size={14} className="text-slate-400 ml-auto" />}
            </button>

            {!isCollapsed && group.staff.map((s, i) => (
              <div key={s.id}
                className={`flex items-center gap-3 px-4 py-3.5 ${i < group.staff.length - 1 ? 'border-b border-slate-50' : ''}`}>
                <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => navigate(`/staff/${s.id}`)}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: CATEGORY_DOT[s.role_category] + '22' }}>
                    <span className="text-sm font-semibold" style={{ color: CATEGORY_DOT[s.role_category] }}>
                      {s.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{s.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {s.uniform_count > 0 && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Shirt size={11} /> {s.uniform_count}
                        </span>
                      )}
                      {s.uniform_count === 0 && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">No uniforms</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                </button>
                {canEdit && (
                  <div className="flex gap-0.5 flex-shrink-0">
                    <button onClick={e => openEdit(s, e)} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={e => deactivate(s, e)} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      })}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeForm}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editing ? 'Edit Staff' : 'Add Staff'}</h2>
              <button onClick={closeForm}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                <select value={form.role_category} onChange={e => setForm(f => ({ ...f, role_category: e.target.value as RoleCategory }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900">
                  {categoryOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              {formError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{formError}</p>}
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={closeForm} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-50">
                {saving ? 'Saving…' : editing ? 'Update' : 'Add Staff'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
