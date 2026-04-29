import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && user) navigate('/dashboard', { replace: true })
  }, [user, authLoading])

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    setLoading(false)
    if (err) setError(err.message)
    else setStep('otp')
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.verifyOtp({
      email,
      token: otp.trim(),
      type: 'email',
    })
    setLoading(false)
    if (err) setError(err.message)
    else navigate('/dashboard', { replace: true })
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">U</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Uniform Manager</h1>
          <p className="text-slate-500 text-sm mt-1">
            {step === 'email' ? 'Sign in or sign up' : 'Check your email'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 active:bg-slate-950 disabled:opacity-60 transition-colors"
              >
                {loading ? 'Sending…' : 'Send code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Login code</label>
                <p className="text-xs text-slate-400 mb-3">Sent to {email}</p>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="––––––––"
                  required
                  autoFocus
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-200 text-2xl font-mono tracking-widest text-center text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || otp.length < 1}
                className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 active:bg-slate-950 disabled:opacity-60 transition-colors"
              >
                {loading ? 'Verifying…' : 'Verify & sign in'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('email'); setOtp(''); setError('') }}
                className="w-full text-sm text-slate-500 hover:text-slate-700 py-1"
              >
                Use a different email
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
