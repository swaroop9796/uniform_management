import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { Plus, Download, Printer, ChevronDown, ChevronUp, X, QrCode, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useBranch } from '@/contexts/BranchContext'
import { useCompanyConfig } from '@/contexts/CompanyConfigContext'
import { friendlyError } from '@/lib/utils'
import { StatusBadge } from '@/components/StatusBadge'
import type { UniformItem, UniformCategory, ItemType, UniformStatus } from '@/types'
import { ITEM_TYPE_LABELS, STATUS_LABELS } from '@/types'

const ITEM_TYPES: ItemType[] = ['shirt', 'pant', 'apron']
const STATUS_FILTERS: (UniformStatus | 'all' | 'unassigned')[] = ['all', 'with_staff', 'unassigned', 'in_laundry', 'in_store', 'damaged', 'lost']

interface GroupedItems { category: UniformCategory; items: UniformItem[]; filtered: UniformItem[] }
const emptyForm = { position_code: '', set_number: '1', item_type: 'shirt' as ItemType, category_id: '' }

export function UniformsPage() {
  const { profile } = useAuth()
  const { selectedBranchId } = useBranch()
  const { numSets } = useCompanyConfig()
  const navigate = useNavigate()
  const [groups, setGroups] = useState<GroupedItems[]>([])
  const [categories, setCategories] = useState<UniformCategory[]>([])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [statusFilter, setStatusFilter] = useState<UniformStatus | 'all' | 'unassigned'>('all')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [qrPreview, setQrPreview] = useState<{ item: UniformItem; dataUrl: string } | null>(null)

  const canEdit = profile?.role && ['owner', 'store_manager'].includes(profile.role)

  useEffect(() => { if (selectedBranchId && selectedBranchId !== 'all') loadData() }, [selectedBranchId])

  useEffect(() => {
    setGroups(prev => prev.map(g => ({
      ...g,
      filtered: statusFilter === 'all' ? g.items
        : statusFilter === 'unassigned' ? g.items.filter(i => i.current_status !== 'with_staff')
        : g.items.filter(i => i.current_status === statusFilter),
    })))
  }, [statusFilter])

  async function loadData() {
    const [itemsRes, catsRes] = await Promise.all([
      supabase.from('uniform_items')
        .select('*, category:category_id(*), current_staff:current_staff_id(name, employee_code)')
        .eq('branch_id', selectedBranchId)
        .order('position_code').order('set_number').order('item_type'),
      supabase.from('uniform_categories').select('*').order('name'),
    ])
    const cats = catsRes.data ?? []
    const items = (itemsRes.data ?? []) as UniformItem[]
    const grouped: GroupedItems[] = cats
      .map(cat => {
        const catItems = items.filter(i => i.category_id === cat.id)
        return { category: cat, items: catItems, filtered: catItems }
      })
      .filter(g => g.items.length > 0)
    setGroups(grouped)
    setCategories(cats)
    if (cats.length > 0) setForm(f => ({ ...f, category_id: cats[0].id }))
    setLoading(false)
  }

  function toggleGroup(catId: string) {
    setCollapsed(c => ({ ...c, [catId]: !c[catId] }))
  }

  async function openQrPreview(item: UniformItem, e: React.MouseEvent) {
    e.stopPropagation()
    const dataUrl = await QRCode.toDataURL(item.qr_code, {
      width: 240, margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
    setQrPreview({ item, dataUrl })
  }

  async function downloadQR(item: UniformItem, e?: React.MouseEvent) {
    e?.stopPropagation()
    const canvas = document.createElement('canvas')
    const size = 300
    canvas.width = size
    canvas.height = size + 80
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const qrCanvas = document.createElement('canvas')
    await QRCode.toCanvas(qrCanvas, item.qr_code, {
      width: size - 20, margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
    ctx.drawImage(qrCanvas, 10, 10)

    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 20px -apple-system, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${item.position_code} · ${ITEM_TYPE_LABELS[item.item_type].toUpperCase()}`, size / 2, size + 28)
    ctx.font = '14px -apple-system, system-ui, sans-serif'
    ctx.fillStyle = '#64748b'
    ctx.fillText(`Set ${item.set_number} · ${item.category?.name ?? ''}`, size / 2, size + 50)
    ctx.font = '9px monospace'
    ctx.fillStyle = '#94a3b8'
    ctx.fillText(item.qr_code.substring(0, 24) + '…', size / 2, size + 72)

    const link = document.createElement('a')
    link.download = `${item.position_code}-${item.item_type}-set${item.set_number}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  async function printCategoryQRs(group: GroupedItems, e: React.MouseEvent) {
    e.stopPropagation()
    const win = window.open('', '_blank')
    if (!win) return
    const qrUrls = await Promise.all(
      group.items.map(item => QRCode.toDataURL(item.qr_code, {
        width: 180, margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      }))
    )
    const cards = group.items.map((item, idx) => `
      <div class="card">
        <img src="${qrUrls[idx]}" width="160" height="160" />
        <div class="label">${item.position_code} · ${ITEM_TYPE_LABELS[item.item_type].toUpperCase()}</div>
        <div class="sub">Set ${item.set_number}</div>
        <div class="code">${item.qr_code.substring(0, 18)}…</div>
      </div>`).join('')
    win.document.write(`<!DOCTYPE html><html><head>
      <title>QR Labels — ${group.category.name}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:-apple-system,sans-serif;background:#fff;padding:16px}
        h1{font-size:15px;color:#0f172a;margin-bottom:12px}
        .grid{display:flex;flex-wrap:wrap;gap:10px}
        .card{width:180px;border:1px solid #e2e8f0;border-radius:10px;padding:10px;text-align:center;page-break-inside:avoid}
        .label{font-size:13px;font-weight:700;color:#0f172a;margin-top:6px}
        .sub{font-size:11px;color:#64748b;margin-top:2px}
        .code{font-size:8px;font-family:monospace;color:#94a3b8;margin-top:4px}
        @media print{body{padding:0}h1{display:none}}
      </style></head><body>
      <h1>${group.category.name} — ${group.items.length} labels</h1>
      <div class="grid">${cards}</div>
      <script>window.onload=()=>window.print()</script>
    </body></html>`)
    win.document.close()
  }

  async function addItem() {
    if (!form.position_code.trim() || !form.category_id) { setFormError('Position code and category are required'); return }
    setSaving(true); setFormError('')
    const { error } = await supabase.from('uniform_items').insert({
      tenant_id: profile!.tenant_id,
      branch_id: selectedBranchId,
      category_id: form.category_id,
      item_type: form.item_type,
      position_code: form.position_code.trim().toUpperCase(),
      set_number: parseInt(form.set_number),
      qr_code: crypto.randomUUID(),
      current_status: 'in_store',
    })
    setSaving(false)
    if (error) { setFormError(friendlyError(error)); return }
    setShowForm(false)
    setForm(f => ({ ...f, position_code: '' }))
    loadData()
  }

  async function deleteItem(item: UniformItem, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Delete ${item.position_code} ${item.item_type} Set ${item.set_number}?`)) return
    await supabase.from('uniform_items').delete().eq('id', item.id)
    loadData()
  }

  const totalShown = groups.reduce((n, g) => n + g.filtered.length, 0)

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" /></div>

  return (
    <div className="px-4 py-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">
          Uniforms
          <span className="text-slate-400 font-normal text-base ml-2">({totalShown})</span>
        </h1>
        {canEdit && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium active:bg-slate-800">
            <Plus size={16} /> Add item
          </button>
        )}
      </div>

      {/* Status filter */}
      <div className="overflow-x-auto pb-1 scrollbar-none w-full">
        <div className="flex items-center gap-2 w-max">
          <Filter size={13} className="text-slate-400" />
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${statusFilter === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
              {s === 'all' ? 'All' : s === 'unassigned' ? 'Not With Staff' : STATUS_LABELS[s as UniformStatus]}
            </button>
          ))}
        </div>
      </div>

      {/* Groups */}
      {groups.map(group => {
        const isCollapsed = collapsed[group.category.id]
        const visibleItems = group.filtered
        if (statusFilter !== 'all' && visibleItems.length === 0) return null
        return (
          <div key={group.category.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {/* Category header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-50">
              <button className="flex items-center gap-2 flex-1 min-w-0" onClick={() => toggleGroup(group.category.id)}>
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: group.category.color_hex }} />
                <span className="text-sm font-semibold text-slate-800">{group.category.name}</span>
                <span className="text-xs text-slate-400">
                  {statusFilter === 'all' ? group.items.length : `${visibleItems.length} / ${group.items.length}`} items
                </span>
                {isCollapsed
                  ? <ChevronDown size={14} className="text-slate-400 ml-auto" />
                  : <ChevronUp size={14} className="text-slate-400 ml-auto" />}
              </button>
              <button onClick={e => printCategoryQRs(group, e)}
                className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                <Printer size={12} /> Print QRs
              </button>
            </div>

            {/* Items */}
            {!isCollapsed && (
              visibleItems.length === 0
                ? <p className="text-xs text-slate-400 text-center py-4">No items match filter</p>
                : visibleItems.map((item, i) => (
                  <button key={item.id} onClick={() => navigate(`/items/${item.id}`)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left active:bg-slate-50 transition-colors ${i < visibleItems.length - 1 ? 'border-b border-slate-50' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {item.position_code}
                        <span className="text-slate-400 mx-1">·</span>
                        <span className="text-slate-600 font-normal capitalize">{ITEM_TYPE_LABELS[item.item_type]}</span>
                        <span className="text-slate-400 ml-1.5 text-xs">S{item.set_number}</span>
                      </p>
                      {item.current_staff && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {(item.current_staff as { name?: string }).name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <StatusBadge status={item.current_status} size="sm" />
                      <button onClick={e => openQrPreview(item, e)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
                        <QrCode size={14} />
                      </button>
                      <button onClick={e => downloadQR(item, e)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
                        <Download size={14} />
                      </button>
                      {canEdit && (
                        <button onClick={e => deleteItem(item, e)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </button>
                ))
            )}
          </div>
        )
      })}

      {/* QR Preview modal */}
      {qrPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setQrPreview(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs text-center space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">QR Label</h3>
              <button onClick={() => setQrPreview(null)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 inline-flex mx-auto">
              <img src={qrPreview.dataUrl} alt="QR code" className="w-48 h-48" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">
                {qrPreview.item.position_code} · {ITEM_TYPE_LABELS[qrPreview.item.item_type].toUpperCase()}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">
                Set {qrPreview.item.set_number} · {qrPreview.item.category?.name}
              </p>
              <p className="text-xs font-mono text-slate-300 mt-2 break-all">{qrPreview.item.qr_code}</p>
            </div>
            <button onClick={() => downloadQR(qrPreview.item)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold active:bg-slate-800">
              <Download size={16} /> Download PNG
            </button>
          </div>
        </div>
      )}

      {/* Add item bottom sheet */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Add Uniform Item</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Position Code</label>
                <input value={form.position_code} onChange={e => setForm(f => ({ ...f, position_code: e.target.value }))}
                  placeholder="e.g. CH15, C7, HK13"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
                <p className="text-xs text-slate-400 mt-1">Which staff position this uniform belongs to</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Item Type</label>
                <div className="flex gap-2">
                  {ITEM_TYPES.map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, item_type: t }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${form.item_type === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
                      {ITEM_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Set Number</label>
                <div className="flex gap-2">
                  {Array.from({ length: numSets }, (_, i) => String(i + 1)).map(n => (
                    <button key={n} onClick={() => setForm(f => ({ ...f, set_number: n }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${form.set_number === n ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
                      Set {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                <p className="text-xs text-slate-500">A unique QR code is auto-generated when saved. Download and print the label to attach to the garment.</p>
              </div>
              {formError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{formError}</p>}
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600">Cancel</button>
              <button onClick={addItem} disabled={saving}
                className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-50">
                {saving ? 'Saving…' : 'Add & Generate QR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
