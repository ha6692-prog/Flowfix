import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/client'

/* ── tiny eye icon ──────────────────────────────────────────────────────── */
const EyeIcon = ({ open }) =>
  open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" />
    </svg>
  )

/* ── Shield SVG logo ─────────────────────────────────────────────────────── */
const ShieldLogo = () => (
  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 mb-6">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
      <path d="M12 1L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4z" />
    </svg>
  </div>
)

/* ── Platform badge icons ────────────────────────────────────────────────── */
const PlatformBadge = ({ name }) => {
  const colors = {
    Zomato: 'from-red-500/20 to-red-600/10 border-red-500/30 text-red-400',
    Swiggy: 'from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-400',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r border ${colors[name] || 'border-slate-500/30 text-slate-400'}`}>
      {name}
    </span>
  )
}

/* ── Quick-login test user chips ────────────────────────────────────────── */
const TEST_USERS = [
  { label: 'Prateek', tier: 'Gold · 4 claims',     platformId: 'ZMT-DRV-0001', platform: 'Zomato',  color: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-400' },
  { label: 'Ananya',  tier: 'Silver · 2 claims',   platformId: 'SWG-DRV-0002', platform: 'Swiggy',  color: 'from-slate-500/20 to-slate-600/10 border-slate-400/30 text-slate-300' },
  { label: 'Kiran',   tier: 'Platinum · 5 claims', platformId: 'ZMT-DRV-0003', platform: 'Zomato',  color: 'from-violet-500/20 to-violet-600/10 border-violet-400/30 text-violet-300' },
]

export default function Login() {
  const navigate = useNavigate()

  const [form, setForm]       = useState({ platform_id: '', password: '' })
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const fill = (platformId) => setForm({ platform_id: platformId, password: 'test123' })

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.platform_id.trim()) { setError('Enter your Platform ID (e.g. ZMT-DRV-0001).'); return }
    if (!form.password)           { setError('Password is required.'); return }

    setLoading(true)
    try {
      const { data } = await authApi.login({ platform_id: form.platform_id.trim(), password: form.password })
      localStorage.setItem('gs_access',  data.access)
      localStorage.setItem('gs_refresh', data.refresh)
      localStorage.setItem('gs_driver',  JSON.stringify(data.driver))
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg =
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        err.response?.data?.platform_id?.[0] ||
        'Invalid Platform ID or password.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20">
      {/* Background glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-violet-500/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md">

        {/* ── Card ── */}
        <div className="glass p-8 rounded-3xl shadow-2xl shadow-black/40">

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <ShieldLogo />
            <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
            <p className="text-slate-400 text-sm">Sign in with your platform credentials</p>
          </div>

          {/* Unified DB info banner */}
          <div className="mb-6 bg-cyan-500/5 border border-cyan-500/20 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400 shrink-0">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Unified Login</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Use the same <strong className="text-slate-300">Platform ID</strong> from your Zomato or Swiggy driver account. 
              Your account status, ride history, and earnings stay synced across platforms.
            </p>
          </div>

          {/* Quick-login chips */}
          <div className="mb-6">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Quick test login</p>
            <div className="flex gap-2 flex-wrap">
              {TEST_USERS.map((u) => (
                <button
                  key={u.platformId}
                  type="button"
                  onClick={() => fill(u.platformId)}
                  className={`flex-1 min-w-[100px] bg-gradient-to-br ${u.color} border rounded-xl px-3 py-2.5 text-left transition-all duration-200 hover:scale-[1.02] active:scale-95`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{u.label}</span>
                    <PlatformBadge name={u.platform} />
                  </div>
                  <div className="text-[10px] opacity-60 mt-0.5 font-mono tracking-tight">{u.platformId}</div>
                  <div className="text-[9px] opacity-50 mt-0.5">{u.tier}</div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-600 mt-2 text-center">Click a chip → auto-fills ID + password <code className="text-slate-400">test123</code></p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-white/[0.06]" />
            <span className="text-xs text-slate-600">or enter manually</span>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-4" noValidate>

            {/* Platform ID */}
            <div>
              <label htmlFor="login-platform-id" className="label">Platform ID</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
                <input
                  id="login-platform-id"
                  type="text"
                  value={form.platform_id}
                  onChange={(e) => setForm(f => ({ ...f, platform_id: e.target.value }))}
                  placeholder="e.g. ZMT-DRV-0001"
                  className="input pl-11"
                  autoComplete="username"
                />
              </div>
              <p className="text-[11px] text-slate-600 mt-1.5 ml-1">Your Zomato / Swiggy driver Platform ID</p>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="label">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Enter your password"
                  className="input pr-12"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  <EyeIcon open={showPw} />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm animate-pulse">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5 text-base flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4z" />
                  </svg>
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 flex flex-col items-center gap-2 text-sm text-slate-500">
            <Link to="/" className="hover:text-slate-400 transition-colors text-xs">
              ← Back to home
            </Link>
          </div>
        </div>

        {/* Info note */}
        <p className="text-center text-xs text-slate-600 mt-4">
          Secured with AES-256 · DPDPA compliant · No data sold
        </p>
      </div>
    </div>
  )
}
