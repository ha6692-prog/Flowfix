import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi, detectPlatform } from '../api/client'

/* ── tiny eye icon (reused from Login) ──────────────────────────────────── */
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

/* ── Shield SVG logo (same as Login) ─────────────────────────────────────── */
const ShieldLogo = () => (
  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 mb-6">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
      <path d="M12 1L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4z" />
    </svg>
  </div>
)

/* ── Platform colour map (same as Login PlatformBadge) ─────────────────── */
const PLATFORM_COLORS = {
  Zomato:  'from-red-500/20 to-red-600/10 border-red-500/30 text-red-400',
  Swiggy:  'from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-400',
  Blinkit: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-400',
  Admin:   'from-violet-500/20 to-violet-600/10 border-violet-500/30 text-violet-400',
}

export default function Signup() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    platform_id: '',
    phone: '',
    password: '',
    confirm_password: '',
  })
  const [showPw, setShowPw]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')

  const platform = detectPlatform(form.platform_id)

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.name.trim())           { setError('Full name is required.'); return }
    if (!form.platform_id.trim())    { setError('Platform ID is required (e.g. ZMT-DRV-0042).'); return }
    if (!form.phone.trim())          { setError('Phone number is required.'); return }
    if (form.password.length < 6)    { setError('Password must be at least 6 characters.'); return }
    if (form.password !== form.confirm_password) { setError('Passwords do not match.'); return }

    setLoading(true)
    try {
      await authApi.simpleRegister({
        name:        form.name.trim(),
        platform_id: form.platform_id.trim(),
        phone:       form.phone.trim(),
        password:    form.password,
      })
      setSuccess('Account created! Redirecting to login…')
      setTimeout(() => navigate('/login'), 1800)
    } catch (err) {
      const d = err.response?.data || {}
      const msg =
        d.platform_id?.[0] ||
        d.phone?.[0] ||
        d.name?.[0] ||
        d.password?.[0] ||
        d.non_field_errors?.[0] ||
        d.detail ||
        'Registration failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12">
      {/* Background glow blobs — identical to Login */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-violet-500/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md">

        {/* ── Card — same glass class as Login ── */}
        <div className="glass p-8 rounded-3xl shadow-2xl shadow-black/40">

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <ShieldLogo />
            <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
            <p className="text-slate-400 text-sm">Join FlowFix — protect your income</p>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-4" noValidate>

            {/* Name */}
            <div>
              <label htmlFor="signup-name" className="label">Full Name</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  id="signup-name"
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="e.g. Priya Devi"
                  className="input pl-11"
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Platform ID */}
            <div>
              <label htmlFor="signup-platform-id" className="label flex items-center gap-2">
                Platform ID
                {platform && (
                  <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r border ${PLATFORM_COLORS[platform] || 'border-slate-500/30 text-slate-400'}`}>
                    {platform}
                  </span>
                )}
              </label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
                <input
                  id="signup-platform-id"
                  type="text"
                  value={form.platform_id}
                  onChange={set('platform_id')}
                  placeholder="e.g. ZMT-DRV-0042"
                  className="input pl-11"
                  autoComplete="username"
                />
              </div>
              <p className="text-[11px] text-slate-600 mt-1.5 ml-1">Your Zomato / Swiggy / Blinkit driver Platform ID</p>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="signup-phone" className="label">Phone Number</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.78a16 16 0 0 0 6.29 6.29l1.87-1.87a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <input
                  id="signup-phone"
                  type="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="e.g. 9876543210"
                  className="input pl-11"
                  autoComplete="tel"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="signup-password" className="label">Password</label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Min. 6 characters"
                  className="input pr-12"
                  autoComplete="new-password"
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

            {/* Confirm Password */}
            <div>
              <label htmlFor="signup-confirm" className="label">Confirm Password</label>
              <div className="relative">
                <input
                  id="signup-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirm_password}
                  onChange={set('confirm_password')}
                  placeholder="Re-enter password"
                  className="input pr-12"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label="Toggle confirm password visibility"
                >
                  <EyeIcon open={showConfirm} />
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

            {/* Success */}
            {success && (
              <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                {success}
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
                  Creating account…
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4z" />
                  </svg>
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 flex flex-col items-center gap-2 text-sm text-slate-500">
            <Link to="/login" className="hover:text-slate-400 transition-colors text-xs">
              Already have an account? <span className="text-cyan-400">Sign in</span>
            </Link>
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
