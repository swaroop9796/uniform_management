import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, User, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { StatusBadge } from '@/components/StatusBadge'
import type { StaffMember, UniformItem, UniformTransition } from '@/types'
import { ROLE_CATEGORY_LABELS, ITEM_TYPE_LABELS } from '@/types'

export function StaffDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [staff, setStaff] = useState<StaffMember | null>(null)
  const [items, setItems] = useState<UniformItem[]>([])
  const [history, setHistory] = useState<UniformTransition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (id) loadData(id) }, [id])

  async function loadData(staffId: string) {
    // Step 1: staff profile + items currently assigned + items linked via any transition
    const [staffRes, assignedRes, linkedTransRes] = await Promise.all([
      supabase.from('staff_members').select('*').eq('id', staffId).single(),
      supabase.from('uniform_items')
        .select('*, category:category_id(*)')
        .eq('current_staff_id', staffId)
        .order('position_code'),
      supabase.from('uniform_transitions')
        .select('uniform_item_id')
        .eq('staff_id', staffId),
    ])

    // Step 2: fetch items found via transitions (may overlap with assigned)
    const linkedIds = [...new Set((linkedTransRes.data ?? []).map((t: { uniform_item_id: string }) => t.uniform_item_id))]
    const linkedRes = linkedIds.length > 0
      ? await supabase.from('uniform_items')
          .select('*, category:category_id(*)')
          .in('id', linkedIds)
          .order('position_code')
      : { data: [] }

    // Merge + deduplicate items
    const merged = [...(assignedRes.data ?? []), ...(linkedRes.data ?? [])]
    const seen = new Set<string>()
    const unique = merged.filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true })

    // Step 3: fetch ALL transitions for these items (not just staff_id = staffId)
    const allItemIds = unique.map(i => i.id)
    const historyRes = allItemIds.length > 0
      ? await supabase.from('uniform_transitions')
          .select('*, uniform_item:uniform_item_id(position_code, item_type, set_number)')
          .in('uniform_item_id', allItemIds)
          .order('created_at', { ascending: false })
          .limit(40)
      : { data: [] }

    setStaff(staffRes.data)
    setItems(unique)
    setHistory(historyRes.data ?? [])
    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" /></div>
  if (!staff) return <div className="p-4 text-slate-500">Staff not found</div>

  const set1 = items.filter(i => i.set_number === 1)
  const set2 = items.filter(i => i.set_number === 2)

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Back + header */}
      <div>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-500 text-sm mb-4 active:text-slate-800">
          <ChevronLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <User size={24} className="text-slate-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{staff.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-slate-500">{ROLE_CATEGORY_LABELS[staff.role_category]}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Uniforms */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
          <p className="text-slate-400 text-sm">No uniforms linked to this staff member</p>
        </div>
      ) : (
        [{ label: 'Set 1', data: set1 }, { label: 'Set 2', data: set2 }]
          .filter(s => s.data.length > 0)
          .map(({ label, data }) => (
            <div key={label}>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{label}</h2>
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                {data.map((item, i) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/items/${item.id}`)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left active:bg-slate-50 ${i < data.length - 1 ? 'border-b border-slate-50' : ''}`}
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {item.position_code} — {ITEM_TYPE_LABELS[item.item_type]}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.category?.name}</p>
                    </div>
                    <StatusBadge status={item.current_status} size="sm" />
                  </button>
                ))}
              </div>
            </div>
          ))
      )}

      {/* History */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-slate-400" />
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">History</h2>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No history yet</p>
        ) : (
          <div className="space-y-2">
            {history.map(t => {
              const item = t.uniform_item as { position_code?: string; item_type?: string; set_number?: number }
              return (
                <div key={t.id} className="bg-white rounded-xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {item?.position_code} <span className="capitalize font-normal text-slate-500">{item?.item_type}</span> Set {item?.set_number}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {t.from_status && <StatusBadge status={t.from_status} size="sm" />}
                        <span className="text-slate-400 text-xs">→</span>
                        <StatusBadge status={t.to_status} size="sm" />
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  {t.notes && <p className="text-xs text-slate-400 mt-1">{t.notes}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
