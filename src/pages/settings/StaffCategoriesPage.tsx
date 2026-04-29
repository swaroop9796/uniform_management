import { useEffect, useState } from 'react'
import { ArrowLeft, Plus, Pencil, Trash2, X, GripVertical } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { friendlyError } from '@/lib/utils'
import type { StaffCategory } from '@/types'

const PRESET_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#64748b']

interface Form { name: string; color_hex: string }
const emptyForm: Form = { name: '', color_hex: '#6366f1' }

export function StaffCategoriesPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<StaffCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<StaffCategory | null>(null)
  const [form, setForm] = useState<Form>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('staff_categories').select('*').order('sort_order')
    setCategories(data ?? [])
    setLoading(false)
  }

  function openAdd() { setForm(emptyForm); setEditing(null); setError(''); setShowForm(true) }
  function openEdit(c: StaffCategory) { setForm({ name: c.name, color_hex: c.color_hex }); setEditing(c); setError(''); setShowForm(true) }
  function close() { setShowForm(false); setEditing(null) }

  async function save() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    if (editing) {
      const { error: err } = await supabase.from('staff_categories').update({ name: form.name.trim(), color_hex: form.color_hex }).eq('id', editing.id)
      if (err) { setError(friendlyError(err)); setSaving(false); return }
    } else {
      const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : 0
      const { error: err } = await supabase.from('staff_categories').insert({
        name: form.name.trim(), color_hex: form.color_hex,
        sort_order: maxOrder + 1, tenant_id: profile!.tenant_id,
      })
      if (err) { setError(friendlyError(err)); setSaving(false); return }
    }
    setSaving(false); close(); load()
  }

  async function remove(c: StaffCategory) {
    if (!confirm(`Delete "${c.name}"? Staff currently in this category will lose their category assignment.`)) return
    const { error: err } = await supabase.from('staff_categories').delete().eq('id', c.id)
    if (err) { alert(friendlyError(err)); return }
    load()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" /></div>

  return (
    <div className="px-4 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/settings')} className="p-2 -ml-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Staff Categories</h1>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium">
          <Plus size={16} /> Add
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={close}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editing ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={close}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Kitchen Staff"
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setForm(f => ({ ...f, color_hex: color }))}
                      className={`w-8 h-8 rounded-full transition-transform ${form.color_hex === color ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <div className="flex items-center gap-2 ml-1">
                    <input
                      type="color"
                      value={form.color_hex}
                      onChange={e => setForm(f => ({ ...f, color_hex: e.target.value }))}
                      className="w-8 h-8 rounded-full cursor-pointer border-0 p-0.5 bg-transparent"
                    />
                    <span className="text-xs text-slate-400">Custom</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: form.color_hex }} />
                  <span className="text-sm text-slate-700">{form.name || 'Preview'}</span>
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={close} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-50">
                {saving ? 'Saving…' : editing ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {categories.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No categories yet</p>}
        {categories.map((c, i, arr) => (
          <div key={c.id} className={`flex items-center gap-3 px-4 py-3.5 ${i < arr.length - 1 ? 'border-b border-slate-50' : ''}`}>
            <GripVertical size={16} className="text-slate-300 flex-shrink-0" />
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: c.color_hex }} />
            <p className="flex-1 text-sm font-medium text-slate-900">{c.name}</p>
            <div className="flex gap-1">
              <button onClick={() => openEdit(c)} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50"><Pencil size={15} /></button>
              <button onClick={() => remove(c)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
