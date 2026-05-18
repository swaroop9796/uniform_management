import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import JsBarcode from 'jsbarcode'
import { Plus, Download, Printer, ChevronDown, ChevronUp, X, Filter } from 'lucide-react'
import { itemService } from '@/services/itemService'
import { useAuth } from '@/hooks/useAuth'
import { useBranch } from '@/contexts/BranchContext'
import { useCompanyConfig } from '@/contexts/CompanyConfigContext'
import { friendlyError, generateBarcode } from '@/lib/utils'
import { StatusBadge } from '@/components/StatusBadge'
import type { UniformItem, UniformCategory, ItemType, UniformStatus } from '@/types'
import { ITEM_TYPE_LABELS, STATUS_LABELS } from '@/types'

const ITEM_TYPES: ItemType[] = ['shirt', 'pant', 'apron']
const STATUS_FILTERS: (UniformStatus | 'all' | 'unassigned')[] = ['all', 'with_staff', 'unassigned', 'in_laundry', 'in_store', 'damaged', 'lost']

interface GroupedItems { category: UniformCategory; items: UniformItem[]; filtered: UniformItem[] }
const SIZES = ['S', 'M', 'L', 'XL', 'XXL']
const emptyForm = { position_code: '', set_number: '1', item_type: 'shirt' as ItemType, category_id: '', size: '' }

export function UniformsPage() {
  const { profile } = useAuth()
  const { selectedBranchId } = useBranch()
  const { numSets, uniformCategories } = useCompanyConfig()
  const navigate = useNavigate()
  const [groups, setGroups] = useState<GroupedItems[]>([])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [statusFilter, setStatusFilter] = useState<UniformStatus | 'all' | 'unassigned'>('all')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [barcodePreview, setBarcodePreview] = useState<{ item: UniformItem; dataUrl: string } | null>(null)

  const canEdit = profile?.role && ['owner', 'store_manager'].includes(profile.role)

  useEffect(() => {
    if (selectedBranchId && selectedBranchId !== 'all' && uniformCategories.length > 0) loadData()
  }, [selectedBranchId, uniformCategories])

  useEffect(() => {
    setGroups(prev => prev.map(g => ({
      ...g,
      filtered: statusFilter === 'all' ? g.items
        : statusFilter === 'unassigned' ? g.items.filter(i => i.current_status !== 'with_staff')
        : g.items.filter(i => i.current_status === statusFilter),
    })))
  }, [statusFilter])

  async function loadData() {
    const itemsRes = await itemService.list(selectedBranchId)
    const cats = uniformCategories
    const items = (itemsRes.data ?? []) as UniformItem[]
    const grouped: GroupedItems[] = cats
      .map(cat => {
        const catItems = items.filter(i => i.category_id === cat.id)
        return { category: cat, items: catItems, filtered: catItems }
      })
      .filter(g => g.items.length > 0)
    setGroups(grouped)
    if (uniformCategories.length > 0) setForm(f => ({ ...f, category_id: uniformCategories[0].id }))
    setLoading(false)
  }

  function toggleGroup(catId: string) {
    setCollapsed(c => ({ ...c, [catId]: !c[catId] }))
  }

  function makeBarcodeDataUrl(value: string): string {
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, value, {
      format: 'CODE128', width: 2, height: 80,
      displayValue: false, margin: 20,
      background: '#ffffff', lineColor: '#000000',
    })
    return canvas.toDataURL('image/png')
  }

  function openBarcodePreview(item: UniformItem, e: React.MouseEvent) {
    e.stopPropagation()
    setBarcodePreview({ item, dataUrl: makeBarcodeDataUrl(item.barcode) })
  }

  function downloadBarcode(item: UniformItem, e?: React.MouseEvent) {
    e?.stopPropagation()
    const barWidth = 2
    const barcodeCanvas = document.createElement('canvas')
    JsBarcode(barcodeCanvas, item.barcode, {
      format: 'CODE128', width: barWidth, height: 80,
      displayValue: false, margin: barWidth * 10,
      background: '#ffffff', lineColor: '#000000',
    })
    const scale = 3
    const bW = barcodeCanvas.width * scale
    const bH = barcodeCanvas.height * scale
    const canvas = document.createElement('canvas')
    canvas.width = bW
    canvas.height = bH + 80
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(barcodeCanvas, 0, 0, bW, bH)
    ctx.imageSmoothingEnabled = true
    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 28px -apple-system, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${item.position_code} · ${ITEM_TYPE_LABELS[item.item_type].toUpperCase()}`, bW / 2, bH + 28)
    ctx.font = '22px -apple-system, system-ui, sans-serif'
    ctx.fillStyle = '#64748b'
    ctx.fillText(`Set ${item.set_number} · ${item.category?.name ?? ''}`, bW / 2, bH + 52)
    ctx.font = 'bold 20px monospace'
    ctx.fillStyle = '#94a3b8'
    ctx.fillText(item.barcode, bW / 2, bH + 74)
    const link = document.createElement('a')
    link.download = `${item.position_code}-${item.item_type}-set${item.set_number}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  function printCategoryBarcodes(group: GroupedItems, e: React.MouseEvent) {
    e.stopPropagation()
    const win = window.open('', '_blank')
    if (!win) return
    const barcodeUrls = group.items.map(item => makeBarcodeDataUrl(item.barcode))
    const cards = group.items.map((item, idx) => `
      <div class="card">
        <img src="${barcodeUrls[idx]}" style="width:100%;height:60px;object-fit:contain" />
        <div class="label">${item.position_code} · ${ITEM_TYPE_LABELS[item.item_type].toUpperCase()}</div>
        <div class="sub">Set ${item.set_number}</div>
        <div class="code">${item.barcode}</div>
      </div>`).join('')
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Barcode Labels — ${group.category.name}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:-apple-system,sans-serif;background:#fff;padding:16px}
        h1{font-size:15px;color:#0f172a;margin-bottom:12px}
        .grid{display:flex;flex-wrap:wrap;gap:10px}
        .card{width:200px;border:1px solid #e2e8f0;border-radius:10px;padding:10px;text-align:center;page-break-inside:avoid}
        .label{font-size:13px;font-weight:700;color:#0f172a;margin-top:6px}
        .sub{font-size:11px;color:#64748b;margin-top:2px}
        .code{font-size:12px;font-family:monospace;color:#0f172a;margin-top:4px;font-weight:bold}
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
    const { error } = await itemService.insert({
      tenant_id: profile!.tenant_id,
      branch_id: selectedBranchId,
      category_id: form.category_id,
      item_type: form.item_type,
      position_code: form.position_code.trim().toUpperCase(),
      set_number: parseInt(form.set_number),
      barcode: generateBarcode(),
      current_status: 'in_store',
      size: form.size || null,
    })
    setSaving(false)
    if (error) { setFormError(friendlyError(error)); return }
    setShowForm(false)
    setForm(f => ({ ...f, position_code: '', size: '' }))
    loadData()
  }

  async function deleteItem(item: UniformItem, e: React.MouseEvent) {
    e.stopPropagation()
    const staffName = (item.current_staff as { name?: string })?.name
    const assignedMsg = staffName ? ` Currently assigned to ${staffName}.` : ''
    if (!confirm(`Delete ${item.position_code} ${item.item_type} Set ${item.set_number}?${assignedMsg} History is preserved.`)) return
    await itemService.softDelete(item.id)
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
              <button onClick={e => printCategoryBarcodes(group, e)}
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
                        {item.size && (
                          <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">{item.size}</span>
                        )}
                      </p>
                      {item.current_staff && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {(item.current_staff as { name?: string }).name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <StatusBadge status={item.current_status} size="sm" />
                      <button onClick={e => openBarcodePreview(item, e)}
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

      {/* Barcode Preview modal */}
      {barcodePreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setBarcodePreview(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs text-center space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Barcode Label</h3>
              <button onClick={() => setBarcodePreview(null)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4">
              <img src={barcodePreview.dataUrl} alt="Barcode" className="w-full h-16 object-contain" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">
                {barcodePreview.item.position_code} · {ITEM_TYPE_LABELS[barcodePreview.item.item_type].toUpperCase()}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">
                Set {barcodePreview.item.set_number} · {barcodePreview.item.category?.name}
              </p>
              <p className="text-2xl font-bold font-mono text-slate-700 mt-2 tracking-widest">{barcodePreview.item.barcode}</p>
            </div>
            <button onClick={() => downloadBarcode(barcodePreview.item)}
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
                  {uniformCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Size <span className="text-slate-400 font-normal">(optional)</span></label>
                <select value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900">
                  <option value="">No size</option>
                  {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
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
