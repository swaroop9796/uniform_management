import { useEffect, useState } from 'react'
import { ArrowLeft, UserPlus, Mail, GitBranch } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Profile, Branch, UserBranch } from '@/types'

interface UserWithBranches extends Profile {
  branches: Branch[]
}

export function UsersPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserWithBranches[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const [profilesRes, branchesRes, ubRes] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('branches').select('*'),
      supabase.from('user_branches').select('*'),
    ])
    const allBranches: Branch[] = branchesRes.data ?? []
    const ub: UserBranch[] = ubRes.data ?? []
    const profiles: Profile[] = profilesRes.data ?? []
    const enriched: UserWithBranches[] = profiles.map(p => ({
      ...p,
      branches: allBranches.filter(b => ub.some(u => u.user_id === p.id && u.branch_id === b.id)),
    }))
    setUsers(enriched)
    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" /></div>

  const owners = users.filter(u => u.role === 'owner')
  const managers = users.filter(u => u.role === 'store_manager')

  return (
    <div className="px-4 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/settings')} className="p-2 -ml-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Users & Access</h1>
        </div>
        <button
          disabled
          title="Invite flow coming soon"
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium opacity-40 cursor-not-allowed"
        >
          <UserPlus size={16} /> Invite
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
        <p className="text-xs text-amber-700 font-medium">Invite flow coming soon</p>
        <p className="text-xs text-amber-600 mt-0.5">You'll be able to invite store managers via email. For now, create accounts directly in Supabase Auth.</p>
      </div>

      {owners.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">Owner</p>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {owners.map((u, i, arr) => (
              <div key={u.id} className={`flex items-center gap-3 px-4 py-3.5 ${i < arr.length - 1 ? 'border-b border-slate-50' : ''}`}>
                <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-white">{u.full_name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{u.full_name}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1"><Mail size={10} /> {u.id === profile?.id ? 'You' : 'Owner'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {managers.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">Store Managers</p>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {managers.map((u, i, arr) => (
              <div key={u.id} className={`flex items-center gap-3 px-4 py-3.5 ${i < arr.length - 1 ? 'border-b border-slate-50' : ''}`}>
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-slate-600">{u.full_name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{u.full_name}</p>
                  {u.branches.length > 0 ? (
                    <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                      <GitBranch size={10} /> {u.branches.map(b => b.name).join(', ')}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-500">No branch assigned</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {users.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-8">No users found</p>
      )}
    </div>
  )
}
