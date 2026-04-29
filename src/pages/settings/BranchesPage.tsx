import { useEffect, useState } from 'react'
import { ArrowLeft, Plus, Pencil, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useBranch } from '@/contexts/BranchContext'
import { friendlyError } from '@/lib/utils'
import type { Branch } from '@/types'

export function BranchesPage() {
  const { profile } = useAuth()
  const { reloadBranches } = useBranch()
  const navigate = useNavigate()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Branch | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('branches').select('*').order('name')
    setBranches(data ?? [])
    setLoading(false)
  }

  function openAdd() { setName(''); setEditing(null); setError(''); setShowForm(true) }
  function openEdit(b: Branch) { setName(b.name); setEditing(b); setError(''); setShowForm(true) }
  function close() { setShowForm(false); setEditing(null) }

  async function save() {
    if (!name.trim()) { setError('Branch name is required'); return }
    setSaving(true); setError('')
    if (editing) {
      const { error: err } = await supabase.from('branches').update({ name: name.trim() }).eq('id', editing.id)
      if (err) { setError(friendlyError(err)); setSaving(false); return }
    } else {
      const { error: err } = await supabase.from('branches').insert({ name: name.trim(), tenant_id: profile!.tenant_id })
      if (err) { setError(friendlyError(err)); setSaving(false); return }
    }
    setSaving(false); close(); load(); reloadBranches()
  }

  async function remove(b: Branch) {
    if (!confirm(`Delete "${b.name}"? This cannot be undone and will fail if any staff or uniforms are linked to it.`)) return
    const { error: err } = await supabase.from('branches').delete().eq('id', b.id)
    if (err) { alert(friendlyError(err)); return }
    load(); reloadBranches()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" /></div>

  return (
    <div className="px-4 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/settings')} className="p-2 -ml-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Branches</h1>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium">
          <Plus size={16} /> Add
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={close}>
          <div className="bg-white rounded-t-3xl w-full max-w-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editing ? 'Edit Branch' : 'Add Branch'}</h2>
              <button onClick={close}><X size={20} className="text-slate-400" /></button>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Branch Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Koramangala"
                autoFocus
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
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
        {branches.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No branches yet</p>}
        {branches.map((b, i, arr) => (
          <div key={b.id} className={`flex items-center gap-3 px-4 py-3.5 ${i < arr.length - 1 ? 'border-b border-slate-50' : ''}`}>
            <p className="flex-1 text-sm font-medium text-slate-900">{b.name}</p>
            <div className="flex gap-1">
              <button onClick={() => openEdit(b)} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50"><Pencil size={15} /></button>
              <button onClick={() => remove(b)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
