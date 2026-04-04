import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { authApi, policiesApi } from '../api/client'

/* ── SHA-256 client-side hash (SubtleCrypto) ── */
async function sha256hex(text) {
  if (!text) return ''
  const msgBuf = new TextEncoder().encode(text)
  const hashBuf = await crypto.subtle.digest('SHA-256', msgBuf)
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/* ── Device fingerprint (captured silently on mount) ── */
function getDeviceFingerprint() {
  const nav = window.navigator
  return btoa([
    nav.userAgent,
    nav.language,
    nav.hardwareConcurrency,
    screen.width, screen.height, screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    nav.platform || '',
  ].join('|')).slice(0, 200)
}

const STEPS = ['Phone & Name', 'Identity Verify', 'Choose Plan', 'Set Password']

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [deviceFp] = useState(() => getDeviceFingerprint())

  const [form, setForm] = useState({
    phone: '', name: '',
    aadhaarRaw: '', panRaw: '',
    plan_id: null, city_id: 1, zone_id: 1,
    password: '', confirmPassword: '',
    consentGiven: false,
  })

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => policiesApi.listPlans().then(r => r.data.results || r.data),
  })

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const nextStep = () => { setError(''); setStep(s => s + 1) }

  const handleSubmit = async () => {
    if (!form.consentGiven) { setError('DPDPA consent is required to register.'); return }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return }
    if (form.password.length < 6)  { setError('Password must be at least 6 characters.'); return }

    setLoading(true); setError('')
    try {
      // Hash Aadhaar/PAN client-side before sending — raw values NEVER sent
      const aadhaarHash = await sha256hex(form.aadhaarRaw.replace(/\s/g, ''))
      const panHash     = form.panRaw ? await sha256hex(form.panRaw.toUpperCase().trim()) : ''

      const payload = {
        phone: form.phone,
        name: form.name,
        password: form.password,
        city_id: form.city_id,
        zone_id: form.zone_id,
        aadhaar_hash: aadhaarHash,
        pan_hash: panHash || undefined,
        device_fingerprint: deviceFp,
        consent_given: true,
      }

      const { data } = await authApi.register(payload)
      localStorage.setItem('gs_access', data.access)
      localStorage.setItem('gs_refresh', data.refresh)
      localStorage.setItem('gs_driver', JSON.stringify(data.driver))

      // Activate selected plan immediately after registration
      if (form.plan_id) {
        try {
          const api = (await import('../api/client')).default
          api.defaults.headers.Authorization = `Bearer ${data.access}`
          await (await import('../api/client')).policiesApi.activate({ plan_id: form.plan_id })
        } catch (_) {}
      }

      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data
      if (typeof msg === 'object') {
        setError(Object.values(msg).flat().join(' '))
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const PLAN_NAMES = { Basic: '🛡️ Basic', Standard: '⚡ Standard', Full: '💎 Full' }

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 flex items-start justify-center">
      <div className="w-full max-w-lg animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M12 1L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Join FlowFix</h1>
          <p className="text-slate-400">Your income cushion, set up in 2 minutes.</p>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all duration-300 
                ${i < step ? 'step-done' : i === step ? 'step-active' : 'step-pending'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] hidden md:block text-center ${i === step ? 'text-cyan-400' : 'text-slate-600'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Step panels */}
        <div className="glass p-6 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Step 0: Phone & Name */}
          {step === 0 && (
            <>
              <div>
                <label className="label">Mobile Number</label>
                <input id="register-phone" className="input" type="tel" placeholder="9xxxxxxxxx"
                  value={form.phone} onChange={e => set('phone', e.target.value)} maxLength={10} />
              </div>
              <div>
                <label className="label">Full Name</label>
                <input id="register-name" className="input" type="text" placeholder="Ravi Kumar"
                  value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <button className="btn-primary w-full"
                disabled={form.phone.length < 10 || !form.name.trim()}
                onClick={nextStep}>
                Continue →
              </button>
            </>
          )}

          {/* Step 1: Identity */}
          {step === 1 && (
            <>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-400 leading-relaxed">
                🔐 Your Aadhaar/PAN is hashed (SHA-256) <strong>in your browser</strong> before 
                sending. The raw number is never transmitted or stored.
              </div>
              <div>
                <label className="label">Aadhaar Number</label>
                <input id="register-aadhaar" className="input" type="password" placeholder="XXXX XXXX XXXX"
                  value={form.aadhaarRaw}
                  onChange={e => set('aadhaarRaw', e.target.value)}
                  autoComplete="off" />
              </div>
              <div>
                <label className="label">PAN (optional)</label>
                <input id="register-pan" className="input" type="password" placeholder="ABCDE1234F"
                  value={form.panRaw}
                  onChange={e => set('panRaw', e.target.value)}
                  autoComplete="off" />
              </div>
              <div className="flex gap-3">
                <button className="btn-ghost flex-1" onClick={() => setStep(0)}>← Back</button>
                <button className="btn-primary flex-1" disabled={form.aadhaarRaw.length < 12} onClick={nextStep}>Continue →</button>
              </div>
            </>
          )}

          {/* Step 2: Plan Selection */}
          {step === 2 && (
            <>
              <p className="text-slate-400 text-sm">Choose your protection fund tier:</p>
              <div className="space-y-3">
                {(plans.length ? plans : [
                  { id: 1, name: 'Basic',    weekly_premium: 20, daily_payout_rate: 200, max_coverage_days: 3, seasonal_multiplier: 1 },
                  { id: 2, name: 'Standard', weekly_premium: 50, daily_payout_rate: 300, max_coverage_days: 5, seasonal_multiplier: 1 },
                  { id: 3, name: 'Full',     weekly_premium: 99, daily_payout_rate: 400, max_coverage_days: 7, seasonal_multiplier: 1 },
                ]).map(plan => {
                  const effective = (plan.weekly_premium * plan.seasonal_multiplier).toFixed(0)
                  return (
                    <button key={plan.id} id={`plan-${plan.name.toLowerCase()}`}
                      onClick={() => set('plan_id', plan.id)}
                      className={`w-full text-left glass-hover p-4 rounded-xl border transition-all duration-200
                        ${form.plan_id === plan.id
                          ? 'border-cyan-500/50 bg-cyan-500/10'
                          : 'border-white/8'
                        }`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-white">{PLAN_NAMES[plan.name]}</span>
                          <span className="text-slate-500 text-sm ml-2">
                            ₹{effective}/week · ₹{plan.daily_payout_rate}/day · {plan.max_coverage_days} days
                          </span>
                        </div>
                        {form.plan_id === plan.id && <span className="text-cyan-400">✓</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-3">
                <button className="btn-ghost flex-1" onClick={() => setStep(1)}>← Back</button>
                <button className="btn-primary flex-1" disabled={!form.plan_id} onClick={nextStep}>Continue →</button>
              </div>
            </>
          )}

          {/* Step 3: Password + Consent */}
          {step === 3 && (
            <>
              <div>
                <label className="label">Create Password</label>
                <input id="register-password" className="input" type="password" placeholder="Min 6 characters"
                  value={form.password} onChange={e => set('password', e.target.value)} />
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input id="register-confirm-password" className="input" type="password" placeholder="Repeat password"
                  value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} />
              </div>

              {/* DPDPA Consent — required */}
              <label id="consent-checkbox-label" className="flex items-start gap-3 cursor-pointer group">
                <div className={`w-5 h-5 mt-0.5 rounded flex-shrink-0 border-2 transition-all flex items-center justify-center
                  ${form.consentGiven ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600 group-hover:border-cyan-500/50'}`}
                  onClick={() => set('consentGiven', !form.consentGiven)}>
                  {form.consentGiven && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span className="text-sm text-slate-400 leading-relaxed">
                  I consent to my data being processed for income protection services under <strong className="text-slate-300">DPDPA 2023</strong>. 
                  I understand my reserve wallet balance is forfeited to the zone pool upon cancellation.
                  <span className="text-red-400 ml-1">*Required</span>
                </span>
              </label>

              <div className="flex gap-3">
                <button className="btn-ghost flex-1" onClick={() => setStep(2)}>← Back</button>
                <button id="register-submit-btn" className="btn-primary flex-1" onClick={handleSubmit}
                  disabled={loading || !form.consentGiven || form.password.length < 6}>
                  {loading ? 'Creating account…' : '🛡️ Activate Protection'}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-slate-600 text-sm mt-6">
          Already registered?{' '}
          <Link to="/dashboard" className="text-cyan-400 hover:text-cyan-300">Go to Dashboard</Link>
        </p>
      </div>
    </div>
  )
}
