import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { policiesApi, monitoringApi, formatINR } from '../api/client'
import { TierBadge } from '../components/TrustCounter'
import { useState, useEffect } from 'react'

function CountdownTimer({ targetDate }) {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => {
      const diff = new Date(targetDate) - Date.now()
      if (diff <= 0) { setTime('Now'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setTime(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`)
    }
    tick()
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [targetDate])
  return <span className="font-mono text-cyan-400 font-semibold">{time}</span>
}

function EDZGauge({ score }) {
  const pct = Math.min(100, Math.round((score || 0) * 100))
  const color = pct >= 78 ? '#ef4444' : pct >= 50 ? '#f59e0b' : '#10b981'
  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10"/>
        <circle cx="60" cy="60" r="50" fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${pct * 3.14} 314`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease-out, stroke 0.5s' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-white">{pct} / 100</span>
        <span className="text-xs text-slate-500">Risk Level</span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const driver = JSON.parse(localStorage.getItem('gs_driver') || '{}')

  const { data: policy, isLoading: policyLoading } = useQuery({
    queryKey: ['my-policy'],
    queryFn: () => policiesApi.myPolicy().then(r => r.data),
    retry: false,
  })

  const { data: edz, isLoading: edzLoading } = useQuery({
    queryKey: ['zone-edz'],
    queryFn: () => monitoringApi.zoneEdz().then(r => r.data),
    refetchInterval: 60_000,
  })

  const { data: pool, isLoading: poolLoading } = useQuery({
    queryKey: ['pool-health'],
    queryFn: () => analyticsApi.poolHealth().then(r => r.data),
    refetchInterval: 300_000, // 5 min
  })

  const wallet = policy?.wallet

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="animate-slide-up">
          <h1 className="text-3xl font-black text-white">
            Welcome back, <span className="gradient-text">{driver.name?.split(' ')[0] || 'Driver'}</span> 👋
          </h1>
          <p className="text-slate-400 mt-1">Your insurance plan dashboard</p>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Policy Card ── */}
          <div className="lg:col-span-2 glass p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-slate-400 text-sm uppercase tracking-wider mb-1">Your Insurance Plan</p>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white">
                    {policyLoading ? '…' : policy?.plan?.name + ' Plan' || 'No Plan'}
                  </h2>
                  {policy && <TierBadge tier={wallet?.tier || 'bronze'} />}
                </div>
              </div>
              <div className={`w-3 h-3 rounded-full ${policy?.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            </div>

            {policy ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Daily Payout', value: formatINR(policy.plan?.daily_payout_rate) },
                  { label: 'Coverage Days', value: `${policy.plan?.max_coverage_days} days` },
                  { label: 'Plan Started', value: new Date(policy.activated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) },
                  { label: 'Status', value: policy.is_active ? '✅ Active' : '❌ Inactive' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                    <p className="text-xs text-slate-500 mb-1">{label}</p>
                    <p className="font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400 mb-4">You don't have an active plan yet</p>
                <span className="text-slate-500 text-sm">Contact your platform manager to activate a plan</span>
              </div>
            )}

            {policy?.cooldown_active && (
              <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-400">
                ✅ Your next payout will be available after{' '}
                <strong>{new Date(policy.cooldown_ends_at).toLocaleDateString('en-IN')}</strong>
              </div>
            )}
          </div>

          {/* ── EDZ Zone Score ── */}
          <div className="glass p-6 flex flex-col items-center animate-slide-up text-center">
            <p className="text-slate-400 text-sm uppercase tracking-wider mb-4">Area Risk Level</p>
            {edzLoading ? (
              <div className="w-36 h-36 rounded-full border-8 border-white/5 animate-pulse" />
            ) : edz ? (
              <>
                <EDZGauge score={edz.final_edz_score} />
                <p className="text-xs text-slate-400 mt-2">
                  {edz.final_edz_score >= 0.78 ? "Your area has high disruption risk right now" :
                   edz.final_edz_score >= 0.50 ? "Your area has moderate risk right now" :
                   "Your area is currently safe"}
                </p>
                <div className={`mt-4 text-xs px-3 py-1.5 rounded-full font-semibold uppercase tracking-wider
                  ${edz.status === 'disruption_active' ? 'bg-red-500/20 text-red-400' :
                    edz.status === 'calibration_mode' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-emerald-500/20 text-emerald-400'}`}>
                  {edz.status === 'disruption_active' ? '⚠️ Bad Weather Detected' :
                   edz.status === 'calibration_mode' ? '🔬 Calibration Mode' :
                   '☀️ Normal Conditions'}
                </div>
                <p className="text-slate-600 text-xs mt-2 text-center">
                  Checked automatically every 10 minutes
                </p>
              </>
            ) : (
              <p className="text-slate-500 text-sm text-center mt-8">No risk level data yet</p>
            )}
          </div>
        </div>

        {/* ── Reserve Wallet ── */}
        {wallet && (
          <div className="glass p-6 animate-slide-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <p className="text-slate-400 text-sm uppercase tracking-wider mb-2">Your Savings Buffer</p>
                <div className="text-5xl font-black gradient-text">{formatINR(wallet.balance)}</div>
                <p className="text-slate-500 text-sm mt-2">
                  Your savings can fund <span className="text-white font-semibold">{wallet.extra_days_available} extra days right now</span>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="glass p-4 text-center min-w-[120px]">
                  <p className="text-xs text-slate-500 mb-1">Added Every Week</p>
                  <p className="text-2xl font-bold text-emerald-400">+₹{wallet.weekly_credit}</p>
                  <p className="text-xs text-slate-600 mt-1">every Monday</p>
                </div>
                <div className="glass p-4 text-center min-w-[120px]">
                  <p className="text-xs text-slate-500 mb-1">Next Top-Up In</p>
                  <p className="text-lg font-bold text-cyan-400">
                    {policy?.next_credit_at
                      ? <CountdownTimer targetDate={policy.next_credit_at} />
                      : '—'}
                  </p>
                </div>
                <div className="glass p-4 text-center min-w-[120px]">
                  <p className="text-xs text-slate-500 mb-1">Total Saved So Far</p>
                  <p className="text-xl font-bold text-violet-400">{formatINR(wallet.total_ever_earned)}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap">
              {['bronze', 'silver', 'gold', 'platinum'].map((tier, i) => (
                <div key={tier} className="inline-flex flex-col items-center mr-4 mb-3">
                  <span className={`tier-badge mb-1 ${wallet.tier === tier ? `tier-${tier} ring-2 ring-offset-2 ring-offset-navy-900 ring-current` : `tier-${tier} opacity-40`}`}>
                    {['🥉', '🥈', '🥇', '💎'][i]} {tier}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {['New member', '3+ months', '6+ months', '12+ months'][i]}
                  </span>
                </div>
              ))}
              {wallet.next_tier && (
                <p className="text-xs text-slate-500 mt-2 w-full">
                  → Stay subscribed {wallet.next_tier.months_needed - (driver.months_active || 0)} more months to reach {wallet.next_tier.tier} level
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Quick Links ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up">
          {[
            { to: '/claim/active', icon: '⚡', label: 'Payout Tracker' },
            { to: '/wallet', icon: '💰', label: 'My Savings' },
            { to: '/claims', icon: '📋', label: 'Payments' },
            { to: '/', icon: '📊', label: 'View Plans' },
          ].map(({ to, icon, label }) => (
            <Link key={label} to={to} className="glass-hover p-4 text-center rounded-xl transition-all duration-200">
              <div className="text-2xl mb-2">{icon}</div>
              <p className="text-sm text-slate-300 font-medium">{label}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
