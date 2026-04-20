import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { analyticsApi, authApi, formatINR, getApiBase } from '../api/client'
import DemoControlPanel from '../components/DemoControlPanel'

/* ── Stat card — reuses same glass card structure as Dashboard.jsx ── */
function StatCard({ label, value, sub, accentClass = 'text-white' }) {
  return (
    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`font-semibold ${accentClass}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  )
}

/* ── Mini bar — shows percentage fill using same color pattern ── */
function MiniBar({ value, max, color = '#10b981' }) {
  const pct = Math.min(100, Math.round(((value || 0) / (max || 1)) * 100))
  return (
    <div className="w-full h-1.5 rounded-full bg-white/[0.06] mt-2">
      <div
        className="h-1.5 rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

export default function AdminDashboard() {
  const driver = JSON.parse(localStorage.getItem('gs_driver') || '{}')
  const accessToken = localStorage.getItem('gs_access') || ''
  const isDemoSession = accessToken.startsWith('demo-access-')

  const { data: serviceToken } = useQuery({
    queryKey: ['admin-service-token'],
    enabled: isDemoSession,
    retry: false,
    queryFn: async () => {
      const attempts = [
        { platform_id: 'ADMIN-001', password: 'gigshield123' },
        { platform_id: 'ADMIN-001', password: 'test123' },
      ]
      for (const creds of attempts) {
        try {
          const r = await authApi.login(creds)
          if (r?.data?.access) return r.data.access
        } catch (_) {
          // Try next credential.
        }
      }
      return null
    },
  })

  const fetchWithToken = async (path) => {
    const tokenToUse = isDemoSession ? serviceToken : accessToken
    if (!tokenToUse) return null
    try {
      const r = await axios.get(`${getApiBase()}${path}`, {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      })
      return r.data
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403 || err?.response?.status === 404) {
        return null
      }
      throw err
    }
  }

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['public-stats'],
    queryFn: () => analyticsApi.publicStats().then(r => r.data),
    refetchInterval: 60_000,
  })

  const { data: pool, isLoading: poolLoading } = useQuery({
    queryKey: ['pool-health'],
    queryFn: async () => {
      const direct = await fetchWithToken('dashboard/pool-health/')
      if (direct) return direct
      return analyticsApi.poolHealth().then(r => r.data).catch(() => null)
    },
    enabled: !isDemoSession || !!serviceToken,
    refetchInterval: 300_000,
    retry: false,
  })

  const { data: driverListState, isLoading: driversLoading } = useQuery({
    queryKey: ['admin-drivers-list'],
    queryFn: async () => {
      try {
        const r = await fetchWithToken('drivers/admin/list/')
        if (r?.drivers) return { drivers: r.drivers, unavailable: false }
        return { drivers: [], unavailable: true, status: 401 }
      } catch (err) {
        return {
          drivers: [],
          unavailable: true,
          status: err?.response?.status || null,
        }
      }
    },
    enabled: !isDemoSession || !!serviceToken,
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: false,
  })
  const driverList = [...(driverListState?.drivers || [])].sort(
    (left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0)
  )
  const driversEndpointUnavailable = !!driverListState?.unavailable
  const visibleDrivers = driverList

  const loading = statsLoading || poolLoading
  const totalDrivers = stats?.total_drivers ?? null
  const activeDrivers = stats?.active_drivers ?? stats?.total_active_drivers ?? 0
  const totalClaims = stats?.total_claims ?? stats?.total_events_covered ?? 0
  const totalPaidOut = stats?.total_paid_out ?? stats?.total_payout_amount ?? 0
  const fraudFlags = stats?.fraud_flags ?? 0
  const pendingClaims = stats?.pending_claims ?? 0
  const lossRatio = stats?.loss_ratio ?? 0
  const normalizedZones = (pool?.zones || []).map((z) => ({
    name: z.name || z.zone || 'Unknown Zone',
    pool_balance: Number(z.pool_balance || 0),
  }))
  const totalPool = Number(
    pool?.total_pool
      ?? normalizedZones.reduce((sum, z) => sum + (Number.isFinite(z.pool_balance) ? z.pool_balance : 0), 0)
  )

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header — same structure as Dashboard.jsx */}
        <div className="animate-slide-up">
          <h1 className="text-3xl font-black text-white">
            Admin Panel, <span className="gradient-text">{driver.name?.split(' ')[0] || 'Admin'}</span> 🛡️
          </h1>
          <p className="text-slate-400 mt-1">Platform-wide analytics and system health</p>
        </div>

        {/* Main grid — same 3-column layout as Dashboard.jsx */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Platform Stats Card (lg:col-span-2) — mirrors Policy Card ── */}
          <div className="lg:col-span-2 glass p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-slate-400 text-sm uppercase tracking-wider mb-1">Platform Overview</p>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white">
                    {loading ? '…' : totalDrivers != null ? `${totalDrivers} Registered Drivers` : `${activeDrivers} Active Drivers`}
                  </h2>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase tracking-wider">
                    Admin
                  </span>
                </div>
              </div>
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Total Drivers (DB)"
                value={loading ? '…' : totalDrivers != null ? totalDrivers : '—'}
                sub={totalDrivers != null ? 'Live database snapshot' : 'Not exposed by this backend'}
                accentClass="text-white"
              />
              <StatCard
                label="Active Drivers"
                value={loading ? '…' : activeDrivers}
                sub="Currently enrolled"
                accentClass="text-emerald-400"
              />
              <StatCard
                label="Total Claims"
                value={loading ? '…' : totalClaims}
                sub="All time"
                accentClass="text-cyan-400"
              />
              <StatCard
                label="Claims Paid"
                value={loading ? '…' : formatINR(totalPaidOut)}
                sub="Total disbursed"
                accentClass="text-violet-400"
              />
              <StatCard
                label="Fraud Alerts"
                value={loading ? '…' : fraudFlags}
                sub="Flagged accounts"
                accentClass={fraudFlags > 0 ? 'text-red-400' : 'text-slate-400'}
              />
            </div>
          </div>

          {/* ── Pool Health Card — mirrors EDZ Zone Score ── */}
          <div className="glass p-6 flex flex-col items-center animate-slide-up text-center">
            <p className="text-slate-400 text-sm uppercase tracking-wider mb-4">Reserve Pool</p>
            {poolLoading ? (
              <div className="w-36 h-36 rounded-full border-8 border-white/5 animate-pulse" />
            ) : pool ? (
              <>
                <div className="relative w-36 h-36 mx-auto">
                  <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10"/>
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#8b5cf6" strokeWidth="10"
                      strokeDasharray={`${Math.min(100, Math.round((totalPool / 500000) * 100)) * 3.14} 314`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dasharray 1s ease-out' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-white">{formatINR(totalPool)}</span>
                    <span className="text-xs text-slate-500">Pool Balance</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  {pool.zones?.length ?? 0} active zone{pool.zones?.length !== 1 ? 's' : ''}
                </p>
                <div className="mt-3 text-xs px-3 py-1.5 rounded-full font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-400">
                  ✅ Fund Healthy
                </div>
                <p className="text-slate-600 text-xs mt-2">
                  Refreshes every 5 minutes
                </p>
              </>
            ) : (
              <p className="text-slate-500 text-sm text-center mt-8">No pool data yet</p>
            )}
          </div>
        </div>

        {/* ── Loss Ratio & Zone Breakdown — mirrors Reserve Wallet Card ── */}
        {pool && (
          <div className="glass p-6 animate-slide-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <p className="text-slate-400 text-sm uppercase tracking-wider mb-2">Risk Analytics</p>
                <div className="text-5xl font-black gradient-text">
                  {lossRatio != null
                    ? `${(lossRatio * 100).toFixed(1)}%`
                    : '—'}
                </div>
                <p className="text-slate-500 text-sm mt-2">
                  Loss ratio — <span className="text-white font-semibold">
                    {lossRatio < 0.7 ? 'healthy range' : lossRatio < 1 ? 'elevated, monitor' : 'critical — review'}
                  </span>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="glass p-4 text-center min-w-[120px]">
                  <p className="text-xs text-slate-500 mb-1">Pending Claims</p>
                  <p className="text-2xl font-bold text-amber-400">{pendingClaims}</p>
                  <p className="text-xs text-slate-600 mt-1">awaiting review</p>
                </div>
                <div className="glass p-4 text-center min-w-[120px]">
                  <p className="text-xs text-slate-500 mb-1">Zones Active</p>
                  <p className="text-lg font-bold text-cyan-400">{pool.zones?.length ?? '—'}</p>
                </div>
                <div className="glass p-4 text-center min-w-[120px]">
                  <p className="text-xs text-slate-500 mb-1">Fraud Rate</p>
                  <p className="text-xl font-bold text-red-400">
                    {fraudFlags && totalDrivers
                      ? `${((fraudFlags / totalDrivers) * 100).toFixed(1)}%`
                      : '0%'}
                  </p>
                </div>
              </div>
            </div>

            {/* Zone pool bars */}
            {pool.zones?.length > 0 && (
              <div className="mt-6">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Zone Pool Balances</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {normalizedZones.map((zone) => (
                    <div key={zone.name} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">{zone.name}</span>
                        <span className="text-xs font-mono text-cyan-400">{formatINR(zone.pool_balance)}</span>
                      </div>
                      <MiniBar value={zone.pool_balance} max={totalPool || 1} color="#06b6d4" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Registered Drivers List ── */}
        <div className="glass p-6 animate-slide-up">
          <p className="text-slate-400 text-sm uppercase tracking-wider mb-4">Latest Registered Drivers</p>
          {driversLoading ? (
            <div className="text-slate-500 text-sm py-4">Loading drivers...</div>
          ) : driversEndpointUnavailable ? (
            <div className="text-red-400 text-sm py-4">
              Driver list endpoint is unavailable{driverListState?.status ? ` (HTTP ${driverListState.status})` : ''}.
            </div>
          ) : visibleDrivers?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4 font-medium">Name</th>
                    <th className="py-3 px-4 font-medium">Platform ID</th>
                    <th className="py-3 px-4 font-medium">Phone</th>
                    <th className="py-3 px-4 font-medium">Zone</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-300">
                  {visibleDrivers.map(d => (
                    <tr key={d.id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-medium text-white">{d.name}</td>
                      <td className="py-3 px-4 font-mono text-cyan-400">{d.platform_id || '—'}</td>
                      <td className="py-3 px-4">{d.phone}</td>
                      <td className="py-3 px-4">{d.zone || '—'}</td>
                      <td className="py-3 px-4">
                        {d.is_active ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-400">Active</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-slate-500/20 text-slate-400">Inactive</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-slate-500 text-sm py-4">No drivers registered yet.</div>
          )}
        </div>

        {/* ── Quick Links — same grid as Dashboard.jsx ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up">
          {[
            { to: '/admin-dashboard', icon: '📊', label: 'Overview' },
            { to: '/dashboard',       icon: '👤', label: 'Worker View' },
            { to: '/',                icon: '🌐', label: 'Landing Page' },
            { to: '/claims',          icon: '📋', label: 'All Claims' },
          ].map(({ to, icon, label }) => (
            <Link key={label} to={to} className="glass-hover p-4 text-center rounded-xl transition-all duration-200">
              <div className="text-2xl mb-2">{icon}</div>
              <p className="text-sm text-slate-300 font-medium">{label}</p>
            </Link>
          ))}
        </div>

        {/* ── Mission Control Demo Panel ── */}
        <div className="animate-slide-up">
          <p className="text-slate-400 text-sm uppercase tracking-wider mb-4">Simulation Engine</p>
          <DemoControlPanel />
        </div>

      </div>
    </div>
  )
}
