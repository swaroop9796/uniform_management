import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { X, Search, Camera, CameraOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useBranch } from '@/contexts/BranchContext'
import { useCompanyConfig } from '@/contexts/CompanyConfigContext'
import { useUniformTransition } from '@/hooks/useUniformTransition'
import { StatusBadge } from '@/components/StatusBadge'
import { StaffPicker } from '@/components/StaffPicker'
import type { UniformItem, StaffMember, UniformStatus } from '@/types'
import { STATUS_LABELS, ITEM_TYPE_LABELS } from '@/types'

const TRANSITION_STATES: UniformStatus[] = ['with_staff', 'in_laundry', 'in_store', 'damaged', 'lost']
const SCANNER_ID = 'qr-scanner-viewport'

export function ScanPage() {
  const { profile } = useAuth()
  const { selectedBranchId } = useBranch()
  const { numSets } = useCompanyConfig()
  const navigate = useNavigate()
  const { transition, loading: transitioning } = useUniformTransition()
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [item, setItem] = useState<UniformItem | null>(null)
  const [allStaff, setAllStaff] = useState<StaffMember[]>([])
  const [newStatus, setNewStatus] = useState<UniformStatus | ''>('')
  const [selectedStaff, setSelectedStaff] = useState('')
  const [notes, setNotes] = useState('')
  const [lookupError, setLookupError] = useState('')
  const [transitionError, setTransitionError] = useState('')
  const [success, setSuccess] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [searchResults, setSearchResults] = useState<{ qr_code: string; position_code: string; item_type: string; set_number: string; current_status: string; category: { name: string } | null }[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (selectedBranchId && selectedBranchId !== 'all') {
      supabase.from('staff_members').select('*').eq('is_active', true).eq('branch_id', selectedBranchId).order('name')
        .then(({ data }) => setAllStaff(data ?? []))
    }
    return () => { stopScanner() }
  }, [selectedBranchId])

  async function startScanner() {
    setCameraError('')
    setLookupError('')
    try {
      const cameras = await Html5Qrcode.getCameras()
      if (!cameras.length) { setCameraError('No camera found on this device.'); return }
      const cameraId = cameras.find(c => /back|rear|environment/i.test(c.label))?.id ?? cameras[cameras.length - 1].id
      // Show the div before starting — iOS won't render video that starts inside display:none
      flushSync(() => setScanning(true))
      const scanner = new Html5Qrcode(SCANNER_ID)
      scannerRef.current = scanner
      await scanner.start(
        cameraId,
        { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
        handleScan,
        () => {}
      )
    } catch {
      setScanning(false)
      setCameraError('Camera permission denied. Allow camera access in your browser settings, then try again.')
    }
  }

  async function stopScanner() {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop().catch(() => {})
    }
    setScanning(false)
  }

  async function handleScan(qrCode: string) {
    await stopScanner()
    await lookupItem(qrCode)
  }

  async function lookupItem(qrCode: string) {
    setLookupError('')
    const { data } = await supabase
      .from('uniform_items')
      .select('*, category:category_id(*), current_staff:current_staff_id(*)')
      .eq('qr_code', qrCode.trim())
      .single()
    if (!data) {
      setLookupError('QR code not recognised. Make sure you scanned a uniform label from this system.')
      return
    }
    setItem(data as UniformItem)
    setNewStatus(data.current_status)
    setSelectedStaff(data.current_staff_id ?? '')
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
      setSuccess(true)
      setTimeout(() => navigate(`/items/${item.id}`), 1400)
    }
  }

  async function handleManualInput(value: string) {
    setManualCode(value)
    setSearchResults([])
    if (value.trim().length < 4) return
    setSearching(true)
    const { data } = await supabase
      .from('uniform_items')
      .select('qr_code, position_code, item_type, set_number, current_status, category:category_id(name)')
      .eq('branch_id', selectedBranchId)
      .ilike('qr_code', `%${value.trim()}%`)
      .limit(8)
    setSearching(false)
    setSearchResults((data ?? []) as unknown as typeof searchResults)
  }

  function reset() {
    setItem(null); setNewStatus(''); setSelectedStaff('')
    setNotes(''); setLookupError(''); setSuccess(false); setManualCode(''); setSearchResults([])
  }

  return (
    <div className="px-4 py-5 space-y-5">
      <h1 className="text-xl font-bold text-slate-900">Scan Uniform</h1>

      {/* Camera viewport — always in DOM so Html5Qrcode can attach to it */}
      <div className={scanning ? 'block' : 'hidden'}>
        <div className="relative rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '1' }}>
          <div id={SCANNER_ID} className="w-full h-full" />
          {/* Scan frame overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-52 h-52 border-2 border-white rounded-2xl opacity-70" />
          </div>
          {/* Stop button */}
          <button
            onClick={stopScanner}
            className="absolute top-3 right-3 bg-black/50 text-white p-2 rounded-full"
          >
            <CameraOff size={18} />
          </button>
        </div>
        <p className="text-center text-sm text-slate-400 mt-2">
          Point camera at a uniform QR label
        </p>
      </div>

      {/* Start scan button — shown when not scanning and no item loaded */}
      {!scanning && !item && !success && (
        <div className="space-y-4">
          <button
            onClick={startScanner}
            className="w-full flex items-center justify-center gap-3 py-5 bg-slate-900 text-white rounded-2xl text-base font-semibold active:bg-slate-800 transition-colors"
          >
            <Camera size={22} />
            Open Camera & Scan
          </button>

          {cameraError && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-800">
              {cameraError}
            </div>
          )}

          {/* Manual search by partial QR code */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Or search by QR code
            </p>
            <div className="relative">
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-slate-900">
                <Search size={16} className="text-slate-400 flex-shrink-0" />
                <input
                  value={manualCode}
                  onChange={e => handleManualInput(e.target.value)}
                  placeholder="First or last 4 chars of code…"
                  className="flex-1 text-sm focus:outline-none bg-transparent"
                />
                {searching && <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin flex-shrink-0" />}
              </div>
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-20">
                  {searchResults.map(r => (
                    <button
                      key={r.qr_code}
                      onClick={() => { setManualCode(''); setSearchResults([]); lookupItem(r.qr_code) }}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{r.position_code}</p>
                        <p className="text-xs text-slate-400 capitalize">{r.item_type} · Set {r.set_number} · {r.category?.name}</p>
                      </div>
                      <span className="text-xs text-slate-400 font-mono ml-3 flex-shrink-0">{r.qr_code.slice(0, 4)}…{r.qr_code.slice(-4)}</span>
                    </button>
                  ))}
                </div>
              )}
              {manualCode.length >= 4 && !searching && searchResults.length === 0 && (
                <p className="text-xs text-slate-400 mt-2 px-1">No items matched — try a different part of the code</p>
              )}
            </div>
          </div>
        </div>
      )}

      {lookupError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-700">
          {lookupError}
          <button onClick={reset} className="block mt-2 text-red-600 font-medium underline text-xs">
            Try again
          </button>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
          <div className="text-3xl mb-2">✓</div>
          <p className="text-emerald-800 font-semibold">State updated</p>
          <p className="text-emerald-600 text-sm mt-0.5">Redirecting to item…</p>
        </div>
      )}

      {item && !success && (
        <div className="space-y-4">
          {/* Item summary card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-2xl font-bold text-slate-900">{item.position_code}</p>
                <p className="text-sm text-slate-500 mt-0.5 capitalize">
                  {ITEM_TYPE_LABELS[item.item_type]} · Set {item.set_number} · {item.category?.name}
                </p>
              </div>
              <StatusBadge status={item.current_status} />
            </div>
            {item.current_staff && (
              <p className="text-sm text-slate-600 mt-3 pt-3 border-t border-slate-50">
                Currently with <strong>{(item.current_staff as StaffMember).name}</strong>
              </p>
            )}
          </div>

          {/* New state picker */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
            <p className="text-sm font-semibold text-slate-700">Move to</p>
            <div className="grid grid-cols-2 gap-2">
              {TRANSITION_STATES.map(s => (
                <button
                  key={s}
                  onClick={() => { setNewStatus(s); setTransitionError('') }}
                  className={`py-3 px-3 rounded-xl text-sm font-medium border transition-all ${
                    newStatus === s
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 active:bg-slate-50'
                  }`}
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

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Notes <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Button missing, sent for repair…"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {transitionError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{transitionError}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600"
            >
              <X size={16} /> Cancel
            </button>
            <button
              onClick={handleTransition}
              disabled={!newStatus || (newStatus === 'with_staff' && !selectedStaff) || transitioning}
              className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-40 active:bg-slate-800"
            >
              {transitioning ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
