import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { StaffMember, RoleCategory, Shift } from '@/types'
import { ROLE_CATEGORY_LABELS } from '@/types'

const CATEGORIES: RoleCategory[] = ['chef', 'counter', 'cashier', 'supervisor', 'hk_boys', 'hk_ladies']
const SHIFTS: { value: Shift; label: string }[] = [
  { value: '1', label: 'Shift 1' },
  { value: '2', label: 'Shift 2' },
  { value: 'both', label: 'Both Shifts' },
]

const emptyForm = { name: '', employee_code: '', role_category: 'chef' as RoleCategory, shift: '1' as Shift }

export function StaffSettingsPage() {
  const { profile } = useAuth()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<StaffMember | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const canEdit = profile?.role && ['owner', 'hr_admin', 'branch_manager'].includes(profile.role)

  useEffect(() => { loadStaff() }, [])

  async function loadStaff() {
    const { data } = await supabase.from('staff_members').select('*').order('employee_code', { ascending: true })
    setStaff(data ?? [])
    setLoading(false)
  }

  function openAdd() { setForm(emptyForm); setEditing(null); setError(''); setShowForm(true) }
  function openEdit(s: StaffMember) {
    setForm({ name: s.name, employee_code: s.employee_code, role_category: s.role_category, shift: s.shift })
    setEditing(s); setError(''); setShowForm(true)
  }
  function close() { setShowForm(false); setEditing(null) }

  async function save() {
    if (!form.name.trim() || !form.employee_code.trim()) { setError('Name and employee code are required'); return }
    setSaving(true); setError('')
    if (editing) {
      const { error: err } = await supabase.from('staff_members').update({
        name: form.name, employee_code: form.employee_code,
        role_category: form.role_category, shift: form.shift,
      }).eq('id', editing.id)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase.from('staff_members').insert({
        name: form.name, employee_code: form.employee_code,
        role_category: form.role_category, shift: form.shift,
        tenant_id: profile!.tenant_id, branch_id: profile!.branch_id!,
      })
      if (err) { setError(err.message); setSaving(false); return }
    }
    setSaving(false); close(); loadStaff()
  }

  async function remove(s: StaffMember) {
    if (!confirm(`Remove ${s.name}? This cannot be undone.`)) return
    await supabase.from('staff_members').update({ is_active: false }).eq('id', s.id)
    loadStaff()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" /></div>

  return (
    <div className="px-4 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Staff</h1>
        {canEdit && (
          <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium">
            <Plus size={16} /> Add staff
          </button>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={close}>
          <div className="bg-white rounded-t-3xl w-full max-w-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editing ? 'Edit Staff' : 'Add Staff'}</h2>
              <button onClick={close}><X size={20} className="text-slate-400" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Employee Code</label>
                <input value={form.employee_code} onChange={e => setForm(f => ({ ...f, employee_code: e.target.value }))}
                  placeholder="e.g. 28"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                <select value={form.role_category} onChange={e => setForm(f => ({ ...f, role_category: e.target.value as RoleCategory }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900">
                  {CATEGORIES.map(c => <option key={c} value={c}>{ROLE_CATEGORY_LABELS[c]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Shift</label>
                <select value={form.shift} onChange={e => setForm(f => ({ ...f, shift: e.target.value as Shift }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900">
                  {SHIFTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={close} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-50">
                {saving ? 'Saving…' : editing ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff list */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {staff.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No staff yet</p>}
        {staff.filter(s => s.is_active).map((s, i, arr) => (
          <div key={s.id} className={`flex items-center gap-3 px-4 py-3.5 ${i < arr.length - 1 ? 'border-b border-slate-50' : ''}`}>
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-slate-600">{s.name.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{s.name}</p>
              <p className="text-xs text-slate-400">#{s.employee_code} · {ROLE_CATEGORY_LABELS[s.role_category]} · Shift {s.shift}</p>
            </div>
            {canEdit && (
              <div className="flex gap-1">
                <button onClick={() => openEdit(s)} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50"><Pencil size={15} /></button>
                <button onClick={() => remove(s)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 size={15} /></button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
