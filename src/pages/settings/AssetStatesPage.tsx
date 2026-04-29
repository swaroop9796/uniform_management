import { useEffect, useState } from 'react'
import { ArrowLeft, Plus, Pencil, Trash2, X, GripVertical } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { friendlyError } from '@/lib/utils'
import type { AssetState } from '@/types'

const PRESET_COLORS = ['#22c55e', '#eab308', '#3b82f6', '#ef4444', '#64748b', '#f97316', '#8b5cf6', '#14b8a6', '#ec4899', '#6366f1']

interface Form { name: string; color_hex: string; is_assigned_state: boolean; is_initial_state: boolean }
const emptyForm: Form = { name: '', color_hex: '#22c55e', is_assigned_state: false, is_initial_state: false }

export function AssetStatesPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [states, setStates] = useState<AssetState[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<AssetState | null>(null)
  const [form, setForm] = useState<Form>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('asset_states').select('*').order('sort_order')
    setStates(data ?? [])
    setLoading(false)
  }

  function openAdd() { setForm(emptyForm); setEditing(null); setError(''); setShowForm(true) }
  function openEdit(s: AssetState) {
    setForm({ name: s.name, color_hex: s.color_hex, is_assigned_state: s.is_assigned_state, is_initial_state: s.is_initial_state })
    setEditing(s); setError(''); setShowForm(true)
  }
  function close() { setShowForm(false); setEditing(null) }

  async function save() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')

    if (form.is_assigned_state && (!editing || !editing.is_assigned_state)) {
      await supabase.from('asset_states').update({ is_assigned_state: false }).neq('id', editing?.id ?? '')
    }
    if (form.is_initial_state && (!editing || !editing.is_initial_state)) {
      await supabase.from('asset_states').update({ is_initial_state: false }).neq('id', editing?.id ?? '')
    }

    if (editing) {
      const { error: err } = await supabase.from('asset_states').update({
        name: form.name.trim(), color_hex: form.color_hex,
        is_assigned_state: form.is_assigned_state, is_initial_state: form.is_initial_state,
      }).eq('id', editing.id)
      if (err) { setError(friendlyError(err)); setSaving(false); return }
    } else {
      const maxOrder = states.length > 0 ? Math.max(...states.map(s => s.sort_order)) : 0
      const { error: err } = await supabase.from('asset_states').insert({
        name: form.name.trim(), color_hex: form.color_hex,
        is_assigned_state: form.is_assigned_state, is_initial_state: form.is_initial_state,
        sort_order: maxOrder + 1, tenant_id: profile!.tenant_id,
      })
      if (err) { setError(friendlyError(err)); setSaving(false); return }
    }
    setSaving(false); close(); load()
  }

  async function remove(s: AssetState) {
    if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return
    const { error: err } = await supabase.from('asset_states').delete().eq('id', s.id)
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
          <h1 className="text-xl font-bold text-slate-900">Asset States</h1>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium">
          <Plus size={16} /> Add
        </button>
      </div>

      <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2.5">
        <strong>Assigned state</strong> — items in this state are counted as "with a staff member" and show the staff picker when scanning.<br />
        <strong>Initial state</strong> — default state when a new uniform item is created.
      </p>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={close}>
          <div className="bg-white rounded-t-3xl w-full max-w-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editing ? 'Edit State' : 'Add State'}</h2>
              <button onClick={close}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. With Staff"
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
              </div>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_assigned_state}
                    onChange={e => setForm(f => ({ ...f, is_assigned_state: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-800">Assigned state</p>
                    <p className="text-xs text-slate-400">Items in this state are linked to a staff member</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_initial_state}
                    onChange={e => setForm(f => ({ ...f, is_initial_state: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-800">Initial state</p>
                    <p className="text-xs text-slate-400">Default state for newly created items</p>
                  </div>
                </label>
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
        {states.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No states yet</p>}
        {states.map((s, i, arr) => (
          <div key={s.id} className={`flex items-center gap-3 px-4 py-3.5 ${i < arr.length - 1 ? 'border-b border-slate-50' : ''}`}>
            <GripVertical size={16} className="text-slate-300 flex-shrink-0" />
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: s.color_hex }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{s.name}</p>
              <div className="flex gap-2 mt-0.5">
                {s.is_assigned_state && <span className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">Assigned</span>}
                {s.is_initial_state && <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">Initial</span>}
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => openEdit(s)} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50"><Pencil size={15} /></button>
              <button onClick={() => remove(s)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
