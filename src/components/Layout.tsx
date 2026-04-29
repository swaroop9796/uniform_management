import { useNavigate, NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, ScanLine, Layers, LogOut, Building2, ChevronDown, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useBranch } from '@/contexts/BranchContext'
import { useCompanyConfig } from '@/contexts/CompanyConfigContext'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/staff',     icon: Users,           label: 'Staff'     },
  { to: '/scan',      icon: ScanLine,        label: 'Scan'      },
  { to: '/uniforms',  icon: Layers,          label: 'Uniforms'  },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth()
  const { branches, selectedBranchId, setSelectedBranchId, selectedBranch } = useBranch()
  const navigate = useNavigate()

  const isOwner = profile?.role === 'owner'
  const { companyName, logoUrl } = useCompanyConfig()
  const locationLabel = selectedBranch?.name ?? (isOwner ? 'All Branches' : branches[0]?.name ?? '…')
  const roleLabel = profile?.role === 'owner' ? 'Owner' : 'Store Manager'
  const canSwitchBranch = isOwner && branches.length > 0

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* ── Sidebar (desktop) ────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-slate-100 fixed inset-y-0 z-20">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            {logoUrl
              ? <img src={logoUrl} alt={companyName} className="w-8 h-8 rounded-lg object-contain bg-white border border-slate-100 flex-shrink-0" />
              : <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">{companyName.charAt(0) || 'B'}</span>
                </div>
            }
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 truncate">{companyName}</p>
              {canSwitchBranch ? (
                <div className="relative mt-0.5">
                  <select
                    value={selectedBranchId === 'all' ? (branches[0]?.id ?? '') : selectedBranchId}
                    onChange={e => setSelectedBranchId(e.target.value)}
                    className="appearance-none w-full bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 pl-2 pr-6 py-0.5 focus:outline-none cursor-pointer truncate"
                  >
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              ) : (
                <p className="text-xs text-slate-400 truncate flex items-center gap-1 mt-0.5">
                  <Building2 size={10} /> {locationLabel}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}>
              <Icon size={18} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
          {isOwner && (
            <NavLink to="/settings"
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}>
              <Settings size={18} strokeWidth={1.75} />
              Settings
            </NavLink>
          )}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-slate-600">
                {profile?.full_name?.charAt(0) ?? '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{profile?.full_name}</p>
              <p className="text-xs text-slate-400">{roleLabel}</p>
            </div>
            <button onClick={handleSignOut}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:ml-60 min-h-screen min-w-0 w-0">

        {/* Mobile header */}
        <header className="md:hidden bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-400 font-medium">{companyName}</p>
            {canSwitchBranch ? (
              <div className="relative inline-flex items-center">
                <select
                  value={selectedBranchId === 'all' ? (branches[0]?.id ?? '') : selectedBranchId}
                  onChange={e => setSelectedBranchId(e.target.value)}
                  className="appearance-none text-base font-bold text-slate-900 bg-slate-100 border border-slate-200 rounded-xl pl-2.5 pr-7 py-0.5 focus:outline-none cursor-pointer"
                >
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            ) : (
              <h1 className="text-base font-bold text-slate-900 leading-tight">{locationLabel}</h1>
            )}
          </div>
          <button onClick={handleSignOut}
            className="ml-3 p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0">
            <LogOut size={18} />
          </button>
        </header>

        {/* Desktop page header */}
        <div className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-slate-100 sticky top-0 z-10">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{companyName}</p>
            <h1 className="text-base font-bold text-slate-900">{locationLabel}</h1>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-8 md:px-4 md:py-2 max-w-3xl w-full md:mx-auto">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 py-1 z-10">
          <ul className="flex items-end justify-around">
            {navItems.map(({ to, icon: Icon, label }) => (
              <li key={to} className="flex-1">
                <NavLink to={to}
                  className={({ isActive }) => cn(
                    'flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl transition-colors w-full',
                    isActive ? 'text-slate-900' : 'text-slate-400'
                  )}>
                  <Icon size={20} strokeWidth={1.75} />
                  <span className="text-xs font-medium">{label}</span>
                </NavLink>
              </li>
            ))}
            {isOwner && (
              <li className="flex-1">
                <NavLink to="/settings"
                  className={({ isActive }) => cn(
                    'flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl transition-colors w-full',
                    isActive ? 'text-slate-900' : 'text-slate-400'
                  )}>
                  <Settings size={20} strokeWidth={1.75} />
                  <span className="text-xs font-medium">Settings</span>
                </NavLink>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </div>
  )
}
