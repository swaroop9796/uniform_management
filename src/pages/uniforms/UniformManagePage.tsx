import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { Plus, Download, Printer, ChevronDown, ChevronUp, X, QrCode } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { StatusBadge } from '@/components/StatusBadge'
import type { UniformItem, UniformCategory, ItemType } from '@/types'
import { ITEM_TYPE_LABELS } from '@/types'

const ITEM_TYPES: ItemType[] = ['shirt', 'pant', 'apron']

interface GroupedItems { category: UniformCategory; items: UniformItem[] }

const emptyForm = {
  position_code: '',
  set_number: '1' as '1' | '2',
  item_type: 'shirt' as ItemType,
  category_id: '',
}

export function UniformManagePage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [groups, setGroups] = useState<GroupedItems[]>([])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [categories, setCategories] = useState<UniformCategory[]>([])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [qrPreview, setQrPreview] = useState<{ item: UniformItem; dataUrl: string } | null>(null)

  const canEdit = profile?.role && ['owner', 'hr_admin', 'branch_manager'].includes(profile.role)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [itemsRes, catsRes] = await Promise.all([
      supabase.from('uniform_items')
        .select('*, category:category_id(*)')
        .order('position_code').order('set_number').order('item_type'),
      supabase.from('uniform_categories').select('*').order('name'),
    ])
    const cats = catsRes.data ?? []
    const items = (itemsRes.data ?? []) as UniformItem[]
    const grouped: GroupedItems[] = cats.map(cat => ({
      category: cat,
      items: items.filter(i => i.category_id === cat.id),
    })).filter(g => g.items.length > 0)
    setGroups(grouped)
    setCategories(cats)
    if (cats.length > 0) setForm(f => ({ ...f, category_id: cats[0].id }))
    setLoading(false)
  }

  function toggleGroup(catId: string) {
    setCollapsed(c => ({ ...c, [catId]: !c[catId] }))
  }

  async function openQrPreview(item: UniformItem) {
    const dataUrl = await generateQrDataUrl(item)
    setQrPreview({ item, dataUrl })
  }

  async function generateQrDataUrl(item: UniformItem): Promise<string> {
    return QRCode.toDataURL(item.qr_code, {
      width: 240,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
  }

  async function downloadQR(item: UniformItem) {
    const canvas = document.createElement('canvas')
    const size = 320
    canvas.width = size
    canvas.height = size + 80
    const ctx = canvas.getContext('2d')!

    // White background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // QR code
    const qrCanvas = document.createElement('canvas')
    await QRCode.toCanvas(qrCanvas, item.qr_code, {
      width: size - 20,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
    ctx.drawImage(qrCanvas, 10, 10)

    // Label: position_code + item_type
    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 22px -apple-system, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${item.position_code} · ${ITEM_TYPE_LABELS[item.item_type].toUpperCase()}`, size / 2, size + 30)

    // Set number
    ctx.font = '15px -apple-system, system-ui, sans-serif'
    ctx.fillStyle = '#64748b'
    ctx.fillText(`Set ${item.set_number} · ${item.category?.name ?? ''}`, size / 2, size + 52)

    // Short QR ID for reference
    ctx.font = '10px monospace'
    ctx.fillStyle = '#94a3b8'
    ctx.fillText(item.qr_code.substring(0, 20) + '…', size / 2, size + 74)

    const link = document.createElement('a')
    link.download = `${item.position_code}-${item.item_type}-set${item.set_number}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  async function printCategoryQRs(group: GroupedItems) {
    const win = window.open('', '_blank')
    if (!win) return

    // Generate all QR data URLs
    const qrUrls = await Promise.all(group.items.map(item =>
      QRCode.toDataURL(item.qr_code, { width: 180, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
    ))

    const cards = group.items.map((item, idx) => `
      <div class="card">
        <img src="${qrUrls[idx]}" width="160" height="160" />
        <div class="label">${item.position_code} · ${ITEM_TYPE_LABELS[item.item_type].toUpperCase()}</div>
        <div class="sub">Set ${item.set_number}</div>
        <div class="code">${item.qr_code.substring(0, 16)}…</div>
      </div>
    `).join('')

    win.document.write(`
      <!DOCTYPE html><html><head>
      <title>QR Labels — ${group.category.name}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, sans-serif; background: #fff; padding: 16px; }
        h1 { font-size: 16px; color: #0f172a; margin-bottom: 16px; }
        .grid { display: flex; flex-wrap: wrap; gap: 12px; }
        .card { width: 180px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; text-align: center; page-break-inside: avoid; }
        .label { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 6px; }
        .sub { font-size: 11px; color: #64748b; margin-top: 2px; }
        .code { font-size: 8px; font-family: monospace; color: #94a3b8; margin-top: 4px; }
        @media print { body { padding: 0; } h1 { display: none; } }
      </style></head>
      <body>
        <h1>${group.category.name} — ${group.items.length} QR Labels</h1>
        <div class="grid">${cards}</div>
        <script>window.onload = () => window.print()</script>
      </body></html>
    `)
    win.document.close()
  }

  async function addItem() {
    if (!form.position_code.trim() || !form.category_id) { setFormError('Position code and category are required'); return }
    setSaving(true); setFormError('')
    const { error } = await supabase.from('uniform_items').insert({
      tenant_id: profile!.tenant_id,
      branch_id: profile!.branch_id!,
      category_id: form.category_id,
      item_type: form.item_type,
      position_code: form.position_code.trim().toUpperCase(),
      set_number: parseInt(form.set_number),
      qr_code: crypto.randomUUID(),
      current_status: 'in_store',
    })
    setSaving(false)
    if (error) { setFormError(error.message); return }
    setShowForm(false)
    setForm(f => ({ ...f, position_code: '' }))
    loadData()
  }

  async function deleteItem(item: UniformItem, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Delete ${item.position_code} ${item.item_type} Set ${item.set_number}? History will be lost.`)) return
    await supabase.from('uniform_items').delete().eq('id', item.id)
    loadData()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" /></div>

  return (
    <div className="px-4 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Uniforms</h1>
        {canEdit && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium active:bg-slate-800">
            <Plus size={16} /> Add item
          </button>
        )}
      </div>

      {/* Groups by category */}
      {groups.map(group => (
        <div key={group.category.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {/* Category header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
            <button className="flex items-center gap-2 flex-1" onClick={() => toggleGroup(group.category.id)}>
              <div className="w-3 h-3 rounded-full" style={{ background: group.category.color_hex }} />
              <span className="text-sm font-semibold text-slate-800">{group.category.name}</span>
              <span className="text-xs text-slate-400">{group.items.length} items</span>
              {collapsed[group.category.id] ? <ChevronDown size={14} className="text-slate-400 ml-auto" /> : <ChevronUp size={14} className="text-slate-400 ml-auto" />}
            </button>
            <button
              onClick={() => printCategoryQRs(group)}
              className="ml-3 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0"
            >
              <Printer size={13} /> Print QRs
            </button>
          </div>

          {/* Items */}
          {!collapsed[group.category.id] && group.items.map((item, i) => (
            <div key={item.id}
              className={`flex items-center gap-3 px-4 py-3 ${i < group.items.length - 1 ? 'border-b border-slate-50' : ''}`}>
              <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => navigate(`/items/${item.id}`)}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    {item.position_code}
                    <span className="text-slate-400 font-normal ml-1.5">·</span>
                    <span className="text-slate-600 font-normal ml-1.5 capitalize">{ITEM_TYPE_LABELS[item.item_type]}</span>
                    <span className="text-slate-400 font-normal ml-1.5">Set {item.set_number}</span>
                  </p>
                  <p className="text-xs font-mono text-slate-300 mt-0.5 truncate">{item.qr_code.substring(0, 24)}…</p>
                </div>
                <StatusBadge status={item.current_status} size="sm" />
              </button>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => openQrPreview(item)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  title="View QR"
                >
                  <QrCode size={15} />
                </button>
                <button
                  onClick={() => downloadQR(item)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  title="Download QR"
                >
                  <Download size={15} />
                </button>
                {canEdit && (
                  <button
                    onClick={e => deleteItem(item, e)}
                    className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* QR Preview modal */}
      {qrPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setQrPreview(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs text-center space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">QR Label</h3>
              <button onClick={() => setQrPreview(null)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 inline-block mx-auto">
              <img src={qrPreview.dataUrl} alt="QR code" className="w-48 h-48" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">
                {qrPreview.item.position_code} · {ITEM_TYPE_LABELS[qrPreview.item.item_type].toUpperCase()}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">Set {qrPreview.item.set_number} · {qrPreview.item.category?.name}</p>
              <p className="text-xs font-mono text-slate-300 mt-2 break-all">{qrPreview.item.qr_code}</p>
            </div>
            <button
              onClick={() => downloadQR(qrPreview.item)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold active:bg-slate-800"
            >
              <Download size={16} /> Download PNG
            </button>
          </div>
        </div>
      )}

      {/* Add item bottom sheet */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
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
                <p className="text-xs text-slate-400 mt-1">Identifies which staff position this uniform belongs to</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Item Type</label>
                <div className="flex gap-2">
                  {ITEM_TYPES.map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, item_type: t }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors capitalize ${form.item_type === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
                      {ITEM_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Set Number</label>
                <div className="flex gap-2">
                  {(['1', '2'] as const).map(n => (
                    <button key={n} onClick={() => setForm(f => ({ ...f, set_number: n }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${form.set_number === n ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
                      Set {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                <p className="text-xs text-slate-500">A unique QR code will be automatically generated for this item when saved.</p>
              </div>
              {formError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{formError}</p>}
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600">Cancel</button>
              <button onClick={addItem} disabled={saving} className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-50">
                {saving ? 'Saving…' : 'Add & Generate QR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
