import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useBranch } from '@/contexts/BranchContext'
import { useCompanyConfig } from '@/contexts/CompanyConfigContext'
import { StatusBadge } from '@/components/StatusBadge'
import type { UniformCategory, UniformTransition } from '@/types'

interface StatusCounts { with_staff: number; in_laundry: number; in_store: number; damaged: number; lost: number; total: number }
interface CategoryStat { category: UniformCategory; counts: StatusCounts }

export function DashboardPage() {
  const { profile } = useAuth()
  const { selectedBranchId } = useBranch()
  const { uniformCategories } = useCompanyConfig()
  const navigate = useNavigate()
  const [overall, setOverall] = useState<StatusCounts | null>(null)
  const [byCategory, setByCategory] = useState<CategoryStat[]>([])
  const [recentActivity, setRecentActivity] = useState<UniformTransition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile && selectedBranchId && selectedBranchId !== 'all' && uniformCategories.length > 0) loadData()
  }, [profile, selectedBranchId, uniformCategories])

  async function loadData() {
    const itemsRes = await supabase.from('uniform_items')
      .select('id, current_status, category_id').eq('branch_id', selectedBranchId)

    const items = itemsRes.data ?? []
    const cats = uniformCategories
    const itemIds = items.map(i => i.id)

    const activityRes = itemIds.length > 0
      ? await supabase.from('uniform_transitions')
          .select('*, staff:staff_id(name, role_category), uniform_item:uniform_item_id(position_code, item_type, set_number)')
          .in('uniform_item_id', itemIds)
          .order('created_at', { ascending: false })
          .limit(10)
      : { data: [] }

    // Overall counts
    const counts: StatusCounts = { with_staff: 0, in_laundry: 0, in_store: 0, damaged: 0, lost: 0, total: items.length }
    items.forEach(i => { const k = i.current_status as keyof StatusCounts; if (k in counts) counts[k]++ })
    setOverall(counts)

    // Per category
    const stats: CategoryStat[] = cats.map(cat => {
      const catItems = items.filter(i => i.category_id === cat.id)
      const c: StatusCounts = { with_staff: 0, in_laundry: 0, in_store: 0, damaged: 0, lost: 0, total: catItems.length }
      catItems.forEach(i => { const k = i.current_status as keyof StatusCounts; if (k in c) c[k]++ })
      return { category: cat, counts: c }
    }).filter(s => s.counts.total > 0)
    setByCategory(stats)

    setRecentActivity((activityRes.data ?? []) as UniformTransition[])
    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" /></div>

  const pct = (n: number) => overall?.total ? Math.round((n / overall.total) * 100) : 0

  return (
    <div className="px-4 py-5 space-y-6">
      {/* Summary cards */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Overview</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 col-span-2">
            <p className="text-sm text-slate-500">Total Uniform Pieces</p>
            <p className="text-3xl font-bold text-slate-900 mt-0.5">{overall?.total ?? 0}</p>
            <div className="flex gap-1 mt-3 h-2 rounded-full overflow-hidden bg-slate-100">
              <div className="bg-emerald-500 rounded-l-full transition-all" style={{ width: `${pct(overall?.with_staff ?? 0)}%` }} />
              <div className="bg-amber-400 transition-all" style={{ width: `${pct(overall?.in_laundry ?? 0)}%` }} />
              <div className="bg-blue-500 rounded-r-full transition-all" style={{ width: `${pct(overall?.in_store ?? 0)}%` }} />
            </div>
            <div className="flex gap-4 mt-2">
              {[
                { label: 'With Staff', val: overall?.with_staff ?? 0, color: 'bg-emerald-500' },
                { label: 'Laundry',    val: overall?.in_laundry ?? 0, color: 'bg-amber-400' },
                { label: 'In Store',   val: overall?.in_store ?? 0,   color: 'bg-blue-500' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                  <span className="text-xs text-slate-600">{s.label} <strong>{s.val}</strong></span>
                </div>
              ))}
            </div>
          </div>

          {overall && overall.damaged + overall.lost > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
              <p className="text-xs text-red-600 font-medium">Needs attention</p>
              <p className="text-2xl font-bold text-red-700 mt-0.5">{overall.damaged + overall.lost}</p>
              <p className="text-xs text-red-500">{overall.damaged} damaged · {overall.lost} lost</p>
            </div>
          )}
        </div>
      </div>

      {/* By category */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">By Category</h2>
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {byCategory.map((s, i) => (
            <div key={s.category.id} className={`px-4 py-3 ${i < byCategory.length - 1 ? 'border-b border-slate-50' : ''}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.category.color_hex }} />
                  <span className="text-sm font-medium text-slate-800">{s.category.name}</span>
                </div>
                <span className="text-xs text-slate-400">{s.counts.total} items</span>
              </div>
              <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden bg-slate-100">
                <div className="bg-emerald-500" style={{ width: `${pct(s.counts.with_staff)}%` }} />
                <div className="bg-amber-400" style={{ width: `${pct(s.counts.in_laundry)}%` }} />
                <div className="bg-blue-500" style={{ width: `${pct(s.counts.in_store)}%` }} />
              </div>
              <div className="flex gap-3 mt-1">
                <span className="text-xs text-slate-500">Staff: {s.counts.with_staff}</span>
                <span className="text-xs text-slate-500">Laundry: {s.counts.in_laundry}</span>
                <span className="text-xs text-slate-500">Store: {s.counts.in_store}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-slate-400" />
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Recent Activity</h2>
        </div>
        <div className="space-y-2">
          {recentActivity.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No activity yet</p>
          )}
          {recentActivity.map(t => (
            <div
              key={t.id}
              className="bg-white rounded-xl border border-slate-100 px-4 py-3 cursor-pointer active:bg-slate-50"
              onClick={() => navigate(`/items/${t.uniform_item_id}`)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {(t.uniform_item as { position_code?: string })?.position_code ?? '—'}
                    {' '}
                    <span className="font-normal text-slate-500 capitalize">
                      {(t.uniform_item as { item_type?: string })?.item_type}
                    </span>
                    {' '}Set {(t.uniform_item as { set_number?: number })?.set_number}
                  </p>
                  {t.staff && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {(t.staff as { name?: string })?.name}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={t.to_status} size="sm" />
                  <span className="text-xs text-slate-400">
                    {new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-1">
        <TrendingUp size={12} />
        <span>{profile?.branch_id ? 'Branch view' : 'All branches'}</span>
      </div>
    </div>
  )
}
