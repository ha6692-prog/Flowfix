import { useQuery } from '@tanstack/react-query'
import { analyticsApi, formatINR } from '../api/client'
import { useState, useEffect } from 'react'

const TIER_CONFIG = {
  bronze:   { color: 'tier-bronze',   icon: '🥉', label: 'Bronze' },
  silver:   { color: 'tier-silver',   icon: '🥈', label: 'Silver' },
  gold:     { color: 'tier-gold',     icon: '🥇', label: 'Gold' },
  platinum: { color: 'tier-platinum', icon: '💎', label: 'Platinum' },
}

export function TierBadge({ tier }) {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.bronze
  return (
    <span className={`tier-badge ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

function AnimatedNumber({ value, prefix = '' }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const target = Number(value)
    if (isNaN(target)) return
    const step = target / 30
    let current = 0
    const timer = setInterval(() => {
      current += step
      if (current >= target) { setDisplay(target); clearInterval(timer) }
      else setDisplay(Math.floor(current))
    }, 30)
    return () => clearInterval(timer)
  }, [value])
  return <span>{prefix}{display.toLocaleString('en-IN')}</span>
}

export function TrustCounter() {
  const { data, isLoading } = useQuery({
    queryKey: ['public-stats'],
    queryFn: () => analyticsApi.publicStats().then(r => r.data),
    refetchInterval: 30_000,
    staleTime: 30_000,
  })

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        {
          label: 'Total Paid Out',
          value: isLoading ? '—' : formatINR(data?.total_payout_amount || 0),
          icon: '💸',
          color: 'text-emerald-400',
        },
        {
          label: 'Drivers Helped',
          value: isLoading ? '—' : (data?.total_drivers_helped || 0).toLocaleString('en-IN'),
          icon: '🛵',
          color: 'text-cyan-400',
        },
        {
          label: 'Active Drivers',
          value: isLoading ? '—' : (data?.total_active_drivers || 0).toLocaleString('en-IN'),
          icon: '✅',
          color: 'text-violet-400',
        },
        {
          label: 'Events Covered',
          value: isLoading ? '—' : (data?.total_events_covered || 0).toLocaleString('en-IN'),
          icon: '⛈️',
          color: 'text-amber-400',
        },
      ].map(({ label, value, icon, color }) => (
        <div key={label} className="glass p-5 text-center animate-slide-up">
          <div className="text-3xl mb-2">{icon}</div>
          <div className={`text-xl font-bold ${color} count-anim`}>{value}</div>
          <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{label}</div>
        </div>
      ))}
    </div>
  )
}
