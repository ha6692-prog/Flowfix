import { useQuery } from '@tanstack/react-query'
import { claimsApi, formatINR, isNotFoundError } from '../api/client'
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getDemoProfile } from '../data/demoProfiles'

/* ── STATUS CONFIG ── */
const STATUS_CONFIG = {
  pending_fraud_check: { label: 'Under Review',  color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: '🔍' },
  approved:            { label: 'Approved',      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: '✅' },
  rejected:            { label: 'Not Approved',  color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: '⛔' },
  paid:                { label: '✅ Paid',       color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', icon: '💸' },
  queued:              { label: 'Queued',        color: 'bg-violet-500/10 text-violet-400 border-violet-500/20', icon: '⏳' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-white/5 text-slate-400 border-white/10', icon: '●' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

/* ── FLOATING GLOW DOTS BACKGROUND ── */
function BackgroundDots() {
  const dots = useMemo(() => Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100 + '%',
    top: Math.random() * 100 + '%',
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 2,
  })), [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
      {dots.map(dot => (
        <motion.div
          key={dot.id}
          className="absolute w-2 h-2 rounded-full bg-cyan-400 blur-sm mix-blend-screen"
          style={{ left: dot.left, top: dot.top }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{
            duration: dot.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: dot.delay,
          }}
        />
      ))}
    </div>
  )
}

/* ── CSS SPINNER ── */
function LoadingState() {
  return (
    <div className="flex justify-center p-12">
      <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-cyan-400 animate-spin" />
    </div>
  )
}

/* ── ANIMATION VARIANTS ── */
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
}

const listContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
}

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
}

export default function Claims() {
  const driver = JSON.parse(localStorage.getItem('gs_driver') || '{}')
  const accessToken = localStorage.getItem('gs_access') || ''
  const hasLiveToken = !!accessToken && !accessToken.startsWith('demo-access-')
  const demoProfile = getDemoProfile(driver.platform_id)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('All')
  const [selectedClaim, setSelectedClaim] = useState(null)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['my-claims', page],
    queryFn: async () => {
      try {
        const r = await claimsApi.myClaims(page)
        return r.data
      } catch (err) {
        if (isNotFoundError(err)) return demoProfile?.claims || { results: [] }
        throw err
      }
    },
    keepPreviousData: true,
    enabled: hasLiveToken,
    retry: false,
  })

  // Data processing
  const allClaims = data?.results || data || []
  const filteredClaims = useMemo(() => {
    if (filter === 'All') return allClaims
    if (filter === 'Paid') return allClaims.filter(c => c.status === 'paid')
    if (filter === 'Not Approved') return allClaims.filter(c => c.status === 'rejected')
    return allClaims
  }, [allClaims, filter])

  const hasNext = !!data?.next
  const hasPrev = page > 1
  const totalCount = data?.count || allClaims.length

  // Modal handlers
  const openModal = (claim) => {
    document.body.style.overflow = 'hidden' // prevent body scroll behind modal
    setSelectedClaim(claim)
  }
  const closeModal = () => {
    document.body.style.overflow = ''
    setSelectedClaim(null)
  }

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 relative">
      <BackgroundDots />

      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* ── HEADER ── */}
        <motion.div
           variants={fadeInUp}
           initial="hidden"
           animate="visible"
        >
          <h1 className="text-3xl font-black text-white">
            Payment <span className="gradient-text">History</span> 📋
          </h1>
          <p className="text-slate-400 mt-1">All the money FlowFix has paid you</p>
        </motion.div>

        {/* ── FILTER BAR ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          className="glass p-2 flex gap-2 rounded-xl"
        >
          {['All', 'Paid', 'Not Approved'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-colors duration-200
                ${filter === f 
                  ? 'bg-white/10 text-white' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              {f}
            </button>
          ))}
        </motion.div>

        {/* ── ACTIVE CLAIM BANNER ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
        >
          <Link
            to="/claim/active"
            className="p-4 flex items-center gap-4 group bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-2xl transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <span className="text-lg">⚡</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">
                Check Your Current Payout
              </p>
              <p className="text-xs text-slate-500">Updates automatically</p>
            </div>
            <svg className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </motion.div>

        {/* ── LIST VIEWS ── */}
        {isLoading ? (
          <LoadingState />
        ) : filteredClaims.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass p-12 text-center"
          >
            <span className="text-5xl block mb-4">🌤️</span>
            <h3 className="text-xl font-bold text-white mb-2">No payments found</h3>
            <p className="text-slate-400 mb-2">
              When bad weather is detected in your area, a payout request will be created automatically.
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={listContainer}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {filteredClaims.map(claim => {
              const totalAmount = Number(claim.total_payout_amount || 0)
              return (
                <motion.button
                  key={claim.id}
                  variants={cardVariant}
                  onClick={() => openModal(claim)}
                  className="w-full text-left p-5 flex items-center gap-4 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] rounded-2xl transition-all duration-300 group"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 transition-colors
                    ${claim.status === 'paid' ? 'bg-emerald-500/10 border border-emerald-500/20' :
                      claim.status === 'rejected' ? 'bg-red-500/10 border border-red-500/20' :
                      'bg-white/[0.04] border border-white/[0.08]'}`}>
                    {STATUS_CONFIG[claim.status]?.icon || '●'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <StatusBadge status={claim.status} />
                      <span className="text-xs text-slate-600 font-mono">
                        #{claim.id?.slice(0, 8)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                      {new Date(claim.created_at).toLocaleDateString('en-IN', {
                        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
                      })}
                      {claim.zone_name && <> · <span className="text-slate-300">{claim.zone_name}</span></>}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className={`text-lg font-bold ${claim.status === 'paid' ? 'text-emerald-400' : claim.status === 'rejected' ? 'text-red-400 line-through' : 'text-white'}`}>
                      {formatINR(totalAmount)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {claim.days_covered ? `${claim.days_covered} day${claim.days_covered !== 1 ? 's' : ''}` : 'Processing'}
                    </p>
                  </div>
                </motion.button>
              )
            })}
          </motion.div>
        )}

        {/* ── PAGINATION ── */}
        {(hasNext || hasPrev) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
            className="flex items-center justify-between pt-4"
          >
            <button
              className="bg-white/[0.05] hover:bg-white/[0.1] active:bg-white/[0.15] text-white py-2 px-5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!hasPrev || isFetching}
              onClick={() => setPage(p => p - 1)}
            >
              ← Previous
            </button>
            <span className="text-xs text-slate-500 font-medium">
              Page {page} · {totalCount} total claim{totalCount !== 1 ? 's' : ''}
            </span>
            <button
              className="bg-white/[0.05] hover:bg-white/[0.1] active:bg-white/[0.15] text-white py-2 px-5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!hasNext || isFetching}
              onClick={() => setPage(p => p + 1)}
            >
              Next →
            </button>
          </motion.div>
        )}

      </div>

      {/* ── DETAIL MODAL ── */}
      <AnimatePresence>
        {selectedClaim && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-navy-950/80 backdrop-blur-md"
              onClick={closeModal}
            />
            
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ duration: 0.3, type: "spring", bounce: 0.1 }}
              className="relative w-full max-w-lg glass border border-white/10 p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Payment Detail</h3>
                  <p className="text-sm text-slate-400 font-mono mt-1">#{selectedClaim.id?.slice(0,8)}</p>
                </div>
                <button 
                  onClick={closeModal}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Payout breakdown */}
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Payout Breakdown</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                      <p className="text-xs text-slate-500 mb-1">Base Plan</p>
                      <p className="font-semibold text-cyan-400">{formatINR(selectedClaim.base_payout_amount || 0)}</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                      <p className="text-xs text-slate-500 mb-1">Your Savings Bonus</p>
                      <p className="font-semibold text-violet-400">{formatINR(selectedClaim.wallet_contribution || 0)}</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                      <p className="text-xs text-slate-500 mb-1">Total</p>
                      <p className="font-bold text-emerald-400">{formatINR(selectedClaim.total_payout_amount || 0)}</p>
                    </div>
                  </div>
                </div>

                {/* Verification scores */}
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Verification Scores</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                      <p className="text-xs text-slate-500 mb-1">Verification Score</p>
                      <p className={`text-sm font-semibold ${selectedClaim.fraud_score >= 0.4 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {selectedClaim.fraud_score != null ? `${(selectedClaim.fraud_score * 100).toFixed(0)} / 100` : '—'}
                      </p>
                    </div>
                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                      <p className="text-xs text-slate-500 mb-1">Work Confirmation</p>
                      <p className={`text-sm font-semibold ${selectedClaim.intent_score <= 0.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {selectedClaim.intent_score != null ? `${(selectedClaim.intent_score * 100).toFixed(0)} / 100` : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status & Timing */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {selectedClaim.edz_score != null && (
                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                      <p className="text-slate-500 mb-1">Risk Level at Trigger</p>
                      <p className="text-white font-semibold">{(selectedClaim.edz_score * 100).toFixed(0)} / 100</p>
                    </div>
                  )}
                  {selectedClaim.approved_at && (
                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                      <p className="text-slate-500 mb-1">Approved At</p>
                      <p className="text-white font-semibold">
                        {new Date(selectedClaim.approved_at).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
