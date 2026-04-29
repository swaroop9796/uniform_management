import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCompanyConfig } from '@/contexts/CompanyConfigContext'
import { StatusBadge } from '@/components/StatusBadge'
import type { UniformItem, UniformStatus } from '@/types'
import { ITEM_TYPE_LABELS } from '@/types'

export function InventoryPage() {
  const navigate = useNavigate()
  const { uniformCategories } = useCompanyConfig()
  const [items, setItems] = useState<UniformItem[]>([])
  const [filterStatus, setFilterStatus] = useState<UniformStatus | 'all'>('all')
  const [filterCat, setFilterCat] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (uniformCategories.length > 0) loadData()
  }, [uniformCategories])

  async function loadData() {
    const { data } = await supabase.from('uniform_items')
      .select('*, category:category_id(*), current_staff:current_staff_id(name)')
      .order('position_code')
      .order('set_number')
    setItems(data as UniformItem[] ?? [])
    setLoading(false)
  }

  const filtered = items.filter(i => {
    if (filterStatus !== 'all' && i.current_status !== filterStatus) return false
    if (filterCat !== 'all' && i.category_id !== filterCat) return false
    return true
  })

  const statuses: (UniformStatus | 'all')[] = ['all', 'with_staff', 'in_laundry', 'in_store', 'damaged', 'lost']

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" /></div>

  return (
    <div className="px-4 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Inventory</h1>
        <span className="text-sm text-slate-400">{filtered.length} items</span>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <Filter size={14} className="text-slate-400 flex-shrink-0" />
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${filterStatus === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
            >
              {s === 'all' ? 'All status' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilterCat('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterCat === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            All categories
          </button>
          {uniformCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterCat(cat.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterCat === cat.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Items list */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {filtered.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">No items match the filters</p>
        )}
        {filtered.map((item, i) => (
          <button
            key={item.id}
            onClick={() => navigate(`/items/${item.id}`)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50 ${i < filtered.length - 1 ? 'border-b border-slate-50' : ''}`}
          >
            <div
              className="w-2 h-8 rounded-full flex-shrink-0"
              style={{ background: item.category?.color_hex ?? '#ccc' }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">
                {item.position_code}
                <span className="font-normal text-slate-500 ml-1 capitalize">{ITEM_TYPE_LABELS[item.item_type]}</span>
                <span className="text-slate-400 ml-1">S{item.set_number}</span>
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {item.category?.name}
                {item.current_staff && ` · ${(item.current_staff as { name?: string }).name}`}
              </p>
            </div>
            <StatusBadge status={item.current_status} size="sm" />
          </button>
        ))}
      </div>
    </div>
  )
}
