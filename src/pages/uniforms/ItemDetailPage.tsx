import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useBranch } from '@/contexts/BranchContext'
import { useCompanyConfig } from '@/contexts/CompanyConfigContext'
import { useUniformTransition } from '@/hooks/useUniformTransition'
import { StatusBadge } from '@/components/StatusBadge'
import type { UniformItem, UniformTransition, StaffMember, UniformStatus } from '@/types'
import { ITEM_TYPE_LABELS, STATUS_LABELS } from '@/types'
import { StaffPicker } from '@/components/StaffPicker'

const TRANSITION_STATES: UniformStatus[] = ['with_staff', 'in_laundry', 'in_store', 'damaged', 'lost']

export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { selectedBranchId } = useBranch()
  const { numSets } = useCompanyConfig()
  const { transition, loading: transitioning } = useUniformTransition()

  const [item, setItem] = useState<UniformItem | null>(null)
  const [history, setHistory] = useState<UniformTransition[]>([])
  const [allStaff, setAllStaff] = useState<StaffMember[]>([])
  const [showTransition, setShowTransition] = useState(false)
  const [newStatus, setNewStatus] = useState<UniformStatus | ''>('')
  const [selectedStaff, setSelectedStaff] = useState('')
  const [notes, setNotes] = useState('')
  const [transitionError, setTransitionError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (id) loadData(id) }, [id])

  async function loadData(itemId: string) {
    const [itemRes, histRes, staffRes] = await Promise.all([
      supabase.from('uniform_items')
        .select('*, category:category_id(*), current_staff:current_staff_id(*)')
        .eq('id', itemId).single(),
      supabase.from('uniform_transitions')
        .select('*, staff:staff_id(name), performer:performed_by(full_name)')
        .eq('uniform_item_id', itemId)
        .order('created_at', { ascending: false }),
      supabase.from('staff_members').select('*').eq('is_active', true).eq('branch_id', selectedBranchId).order('name'),
    ])
    setItem(itemRes.data as UniformItem)
    setHistory(histRes.data ?? [])
    setAllStaff(staffRes.data ?? [])
    if (itemRes.data) {
      setNewStatus(itemRes.data.current_status)
      setSelectedStaff(itemRes.data.current_staff_id ?? '')
    }
    setLoading(false)
  }

  async function handleTransition() {
    if (!item || !newStatus || !profile) return
    setTransitionError('')

    if (newStatus === 'with_staff' && selectedStaff) {
      const { data: existing } = await supabase
        .from('uniform_items')
        .select('id')
        .eq('current_staff_id', selectedStaff)
        .eq('item_type', item.item_type)
        .neq('id', item.id)
      if ((existing?.length ?? 0) >= numSets) {
        const staffName = allStaff.find(s => s.id === selectedStaff)?.name ?? 'This staff member'
        setTransitionError(`${staffName} already has ${existing!.length} ${item.item_type}(s) assigned — max ${numSets} per set. Return one first.`)
        return
      }
    }

    const ok = await transition({
      itemId: item.id,
      newStatus,
      staffId: selectedStaff || null,
      performedBy: profile.id,
      notes: notes || undefined,
    })
    if (ok) {
      setShowTransition(false)
      setNotes('')
      loadData(item.id)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" /></div>
  if (!item) return <div className="p-4 text-slate-500">Item not found</div>

  return (
    <div className="px-4 py-5 space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-500 text-sm active:text-slate-800">
        <ChevronLeft size={16} /> Back
      </button>

      {/* Item card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl font-bold text-slate-900">{item.position_code}</p>
            <p className="text-slate-500 text-sm mt-0.5 capitalize">
              {ITEM_TYPE_LABELS[item.item_type]} · Set {item.set_number} · {item.category?.name}
            </p>
          </div>
          <StatusBadge status={item.current_status} />
        </div>

        {item.current_staff && (
          <div className="mt-4 pt-4 border-t border-slate-50">
            <p className="text-xs text-slate-400 mb-0.5">Currently with</p>
            <button
              onClick={() => navigate(`/staff/${item.current_staff_id}`)}
              className="text-sm font-semibold text-slate-900 flex items-center gap-1"
            >
              {(item.current_staff as StaffMember).name}
              <ArrowRight size={14} className="text-slate-400" />
            </button>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-50">
          <p className="text-xs text-slate-400 mb-0.5">QR Code</p>
          <p className="text-xs font-mono text-slate-600 break-all">{item.qr_code}</p>
        </div>

        <div className="mt-4 flex gap-2">
          {item.current_status !== 'with_staff' && (
            <button
              onClick={() => { setNewStatus('with_staff'); setShowTransition(true) }}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold active:bg-emerald-700"
            >
              Assign to Staff
            </button>
          )}
          <button
            onClick={() => setShowTransition(!showTransition)}
            className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold active:bg-slate-800"
          >
            Change State
          </button>
        </div>
      </div>

      {/* Transition panel */}
      {showTransition && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Move to</p>
          <div className="grid grid-cols-2 gap-2">
            {TRANSITION_STATES.map(s => (
              <button
                key={s}
                onClick={() => { setNewStatus(s); setTransitionError('') }}
                className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${newStatus === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {newStatus && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                {newStatus === 'with_staff' ? 'Assign to' : 'Staff (optional)'}
              </label>
              <StaffPicker staff={allStaff} value={selectedStaff} onChange={setSelectedStaff} />
            </div>
          )}

          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />

          {transitionError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{transitionError}</p>
          )}

          <div className="flex gap-2">
            <button onClick={() => { setShowTransition(false); setTransitionError('') }} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600">Cancel</button>
            <button
              onClick={handleTransition}
              disabled={!newStatus || (newStatus === 'with_staff' && !selectedStaff) || transitioning}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-50"
            >
              {transitioning ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">History</h2>
        {history.length === 0
          ? <p className="text-sm text-slate-400 text-center py-4">No history yet</p>
          : (
            <div className="relative pl-4">
              <div className="absolute left-1.5 top-2 bottom-2 w-px bg-slate-200" />
              <div className="space-y-3">
                {history.map(t => (
                  <div key={t.id} className="relative bg-white rounded-xl border border-slate-100 px-4 py-3 ml-2">
                    <div className="absolute -left-5 top-3.5 w-3 h-3 rounded-full border-2 border-white bg-slate-300 ring-2 ring-slate-200" />
                    <div className="flex items-center gap-2 flex-wrap">
                      {t.from_status && <StatusBadge status={t.from_status} size="sm" />}
                      {t.from_status && <ArrowRight size={12} className="text-slate-400" />}
                      <StatusBadge status={t.to_status} size="sm" />
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      {t.staff && <span className="text-xs text-slate-500">{(t.staff as { name?: string })?.name}</span>}
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-400">
                        {new Date(t.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {t.notes && <p className="text-xs text-slate-400 mt-1 italic">{t.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )
        }
      </div>
    </div>
  )
}
