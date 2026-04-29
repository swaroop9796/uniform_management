import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import type { StaffMember } from '@/types'

interface Props {
  staff: StaffMember[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
}

export function StaffPicker({ staff, value, onChange, placeholder = 'Search staff…' }: Props) {
  const selected = staff.find(s => s.id === value) ?? null
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.employee_code.includes(query)
  )

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function select(s: StaffMember) {
    onChange(s.id)
    setOpen(false)
    setQuery('')
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      {selected && !open ? (
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-200 bg-white">
          <div>
            <span className="text-sm font-medium text-slate-800">{selected.name}</span>
            <span className="text-xs text-slate-400 ml-2">#{selected.employee_code}</span>
          </div>
          <button onClick={clear} className="text-slate-400 hover:text-slate-600">
            <X size={15} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
          />
        </div>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No staff found</p>
          ) : (
            filtered.map(s => (
              <button
                key={s.id}
                onMouseDown={() => select(s)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                <span className="text-sm text-slate-800">{s.name}</span>
                <span className="text-xs text-slate-400">#{s.employee_code}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
