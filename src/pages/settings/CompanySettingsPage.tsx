import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Camera } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useCompanyConfig } from '@/contexts/CompanyConfigContext'
import { friendlyError } from '@/lib/utils'

export function CompanySettingsPage() {
  const { profile } = useAuth()
  const { reloadCompanyName, reloadLogo, logoUrl } = useCompanyConfig()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!profile) return
    supabase.from('tenants').select('name').eq('id', profile.tenant_id).single().then(({ data }) => {
      if (data) setName(data.name)
      setLoading(false)
    })
  }, [profile?.tenant_id])

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploading(true)
    setUploadError('')
    const path = `${profile.tenant_id}/logo`
    const { error: uploadErr } = await supabase.storage.from('logos').upload(path, file, { upsert: true, contentType: file.type })
    if (uploadErr) { setUploadError(friendlyError(uploadErr)); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
    const publicUrlWithBust = `${publicUrl}?t=${Date.now()}`
    const { error: updateErr } = await supabase.from('tenants').update({ logo_url: publicUrlWithBust }).eq('id', profile.tenant_id)
    if (updateErr) { setUploadError(friendlyError(updateErr)); setUploading(false); return }
    await reloadLogo()
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function save() {
    if (!name.trim()) { setError('Company name is required'); return }
    setSaving(true); setError(''); setSaved(false)
    const { error: err } = await supabase.from('tenants').update({ name: name.trim() }).eq('id', profile!.tenant_id)
    setSaving(false)
    if (err) { setError(friendlyError(err)); return }
    await reloadCompanyName()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" /></div>

  return (
    <div className="px-4 py-5 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/settings')} className="p-2 -ml-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Company Details</h1>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Company Name</label>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setSaved(false) }}
            placeholder="e.g. Bengaluru Cafe"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
        {saved && <p className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">Saved successfully</p>}
        <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
        <p className="text-xs font-medium text-slate-600">Company Logo</p>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 bg-slate-50">
            {logoUrl
              ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              : <span className="text-2xl font-bold text-slate-300">{name.charAt(0) || '?'}</span>
            }
          </div>
          <div className="flex-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Camera size={15} />
              {uploading ? 'Uploading…' : logoUrl ? 'Change Logo' : 'Upload Logo'}
            </button>
            <p className="text-xs text-slate-400 mt-1.5">PNG, JPG or SVG · Max 2 MB</p>
          </div>
        </div>
        {uploadError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{uploadError}</p>}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
      </div>
    </div>
  )
}
