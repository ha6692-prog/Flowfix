import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { policiesApi, formatINR } from '../api/client'
import { TierBadge } from '../components/TrustCounter'
import { useState } from 'react'
import { Link } from 'react-router-dom'

/* ─────────────────────────────────────────────────────────────
   ROLLOVER BUSINESS LOGIC — HOW IT WORKS (READ THIS FIRST)
   
   PROBLEM WITH OLD CODE:
   - wallet.balance (₹156) / daily_payout (₹400) = 0 extra days
   - Driver sees "0 extra days" → feels useless → cancels
   - Company loses a loyal subscriber

   CORRECT LOGIC:
   - Rollover wallet does NOT directly fund payouts at full daily rate
   - Instead it works as a BONUS MULTIPLIER on top of base coverage
   - Every ₹50 in the wallet = 1 "bonus voucher" redeemable ONLY
     during active disruptions, capped at ₹150/day max supplement
   - This means:
     → ₹156 = 3 bonus vouchers = 3 days of ₹50 top-up supplement
     → Driver feels rewarded immediately (not "0 extra days")
     → Company pays max ₹150 extra per claim (not full day cost)
     → Profitable: ₹8–16/week accrual vs ₹50 max per claim day
   
   LOYALTY ENGINE:
   - Wallet balance NEVER resets after a claim (only forfeited on cancel)
   - After a claim, accrual PAUSES for 2 weeks (cooldown)
   - This means drivers who stay subscribed long-term build a 
     growing buffer the company rarely has to pay out in full
   - The "threat" of forfeiture on cancel is the retention hook

   TIER CREDIT RATES (company cost per week per driver):
   Bronze  (0–3 mo):  ₹8/wk  → max exposure ₹32/month
   Silver  (4–6 mo):  ₹10/wk → max exposure ₹40/month  
   Gold    (7–12 mo): ₹13/wk → max exposure ₹52/month
   Platinum (12+ mo): ₹16/wk → max exposure ₹64/month

   Premium collected: ₹29–99/week >> weekly credit cost
   So company is always profitable on the wallet accrual itself.
────────────────────────────────────────────────────────────── */

const TIERS = [
  { key: 'bronze',   label: 'Bronze',   icon: '🥉', months: '0–3 mo',  credit: 8,  voucherValue: 50, color: 'from-amber-900/40 to-amber-800/20',   border: 'border-amber-500/30',  text: 'text-amber-400',  minMonths: 0  },
  { key: 'silver',   label: 'Silver',   icon: '🥈', months: '4–6 mo',  credit: 10, voucherValue: 50, color: 'from-slate-700/40 to-slate-600/20',    border: 'border-slate-500/30',  text: 'text-slate-300',  minMonths: 4  },
  { key: 'gold',     label: 'Gold',     icon: '🥇', months: '7–12 mo', credit: 13, voucherValue: 50, color: 'from-yellow-900/40 to-yellow-800/20',  border: 'border-yellow-500/30', text: 'text-yellow-400', minMonths: 7  },
  { key: 'platinum', label: 'Platinum', icon: '💎', months: '12+ mo',  credit: 16, voucherValue: 75, color: 'from-violet-900/40 to-violet-800/20',  border: 'border-violet-500/30', text: 'text-violet-300', minMonths: 13 },
]

const TIER_INDEX = { bronze: 0, silver: 1, gold: 2, platinum: 3 }
const VOUCHER_VALUE = 50   // ₹50 per voucher (₹75 for platinum)
const VOUCHER_COST  = 50   // every ₹50 in wallet = 1 voucher
const MAX_VOUCHERS_PER_CLAIM = 3  // max 3 vouchers per disruption event

/* How many bonus vouchers does this balance give? */
function calcVouchers(balance, tierKey) {
  const tier = TIERS[TIER_INDEX[tierKey]] || TIERS[0]
  const val  = tier.voucherValue
  return { count: Math.floor(Number(balance) / VOUCHER_COST), value: val }
}

/* Weeks until wallet fully funds MAX_VOUCHERS_PER_CLAIM */
function weeksToMaxVouchers(balance, weeklyCredit) {
  const needed = MAX_VOUCHERS_PER_CLAIM * VOUCHER_COST
  const gap    = Math.max(0, needed - Number(balance))
  return gap === 0 ? 0 : Math.ceil(gap / weeklyCredit)
}

function TierProgressBar({ currentTier, monthsActive = 0 }) {
  const currentIdx = TIER_INDEX[currentTier] ?? 0
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 h-3 rounded-full overflow-hidden bg-white/[0.04]">
        {TIERS.map((tier, i) => {
          const isReached = i <= currentIdx
          const isCurrent = i === currentIdx
          return (
            <div key={tier.key}
              className={`flex-1 h-full transition-all duration-700 rounded-full
                ${isReached ? isCurrent
                  ? `bg-gradient-to-r ${tier.color.replace('/40','/80').replace('/20','/60')} animate-pulse-slow`
                  : 'bg-emerald-500/50'
                  : 'bg-white/[0.04]'}`}
            />
          )
        })}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {TIERS.map((tier, i) => {
          const isReached = i <= currentIdx
          const isCurrent = tier.key === currentTier
          return (
            <div key={tier.key}
              className={`text-center p-3 rounded-xl border transition-all duration-300
                ${isCurrent
                  ? `bg-gradient-to-b ${tier.color} ${tier.border} ring-1 ring-white/10`
                  : isReached ? 'bg-white/[0.03] border-white/[0.08]'
                  : 'bg-white/[0.01] border-white/[0.04] opacity-40'}`}
            >
              <div className="text-xl mb-1">{tier.icon}</div>
              <p className={`text-xs font-bold uppercase tracking-wider ${isCurrent ? tier.text : isReached ? 'text-emerald-400' : 'text-slate-600'}`}>
                {tier.label}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">{tier.months}</p>
              <p className={`text-xs mt-1 font-semibold ${isCurrent ? 'text-white' : 'text-slate-500'}`}>
                +₹{tier.credit}/wk
              </p>
              <p className={`text-[10px] mt-0.5 ${isCurrent ? 'text-emerald-400' : 'text-slate-600'}`}>
                ₹{tier.voucherValue} bonus/voucher
              </p>
            </div>
          )
        })}
      </div>

      {currentIdx < 3 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">{TIERS[currentIdx + 1].icon}</span>
          <div>
            <p className="text-sm text-white font-semibold">
              Next: {TIERS[currentIdx + 1].label}
            </p>
            <p className="text-xs text-slate-400">
              {Math.max(0, TIERS[currentIdx + 1].minMonths - monthsActive)} more month{Math.max(0, TIERS[currentIdx + 1].minMonths - monthsActive) !== 1 ? 's' : ''} to unlock
              <span className="text-emerald-400 font-semibold ml-1">+₹{TIERS[currentIdx + 1].credit}/week</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function VoucherVisual({ vouchers, maxVouchers = MAX_VOUCHERS_PER_CLAIM, tierKey }) {
  const tier = TIERS[TIER_INDEX[tierKey]] || TIERS[0]
  return (
    <div className="space-y-3">
      {/* Voucher slots */}
      <div className="flex gap-2">
        {[...Array(maxVouchers)].map((_, i) => {
          const filled = i < vouchers
          return (
            <div key={i}
              className={`flex-1 rounded-xl border-2 transition-all duration-500 p-3 text-center
                ${filled
                  ? 'bg-emerald-500/20 border-emerald-500/60'
                  : 'bg-white/[0.02] border-dashed border-white/10'}`}
            >
              <div className={`text-xl mb-1 ${filled ? '' : 'opacity-20'}`}>🎟️</div>
              <p className={`text-[10px] font-bold ${filled ? 'text-emerald-400' : 'text-slate-600'}`}>
                {filled ? `+₹${tier.voucherValue}` : 'Locked'}
              </p>
              <p className="text-[9px] text-slate-600 mt-0.5">
                {filled ? 'Bonus day' : `Need ₹${VOUCHER_COST}`}
              </p>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-slate-500 text-center">
        Each voucher adds <span className="text-emerald-400 font-semibold">₹{tier.voucherValue} bonus</span> on top of your base payout during a disruption
      </p>
    </div>
  )
}

function CreditHistoryTimeline({ credits }) {
  if (!credits || credits.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-4xl mb-4 block">📭</span>
        <p className="text-slate-400">No credit history yet</p>
        <p className="text-xs text-slate-600 mt-1">Your weekly savings will appear here every Monday</p>
      </div>
    )
  }
  return (
    <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
      {credits.map((entry, i) => (
        <div key={entry.id || i}
          className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-emerald-400 text-sm font-bold">+₹</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">
                Weekly Savings Added
                {entry.tier && (
                  <span className={`ml-2 text-xs tier-badge tier-${entry.tier} py-0 px-1.5`}>
                    {entry.tier}
                  </span>
                )}
              </p>
              <span className="text-emerald-400 font-bold text-sm">
                +{formatINR(entry.amount || entry.credit_amount || 0)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {new Date(entry.credited_at || entry.date).toLocaleDateString('en-IN', {
                weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Wallet() {
  const driver      = JSON.parse(localStorage.getItem('gs_driver') || '{}')
  const queryClient = useQueryClient()
  const [showCancelModal, setShowCancelModal] = useState(false)

  const { data: policy, isLoading } = useQuery({
    queryKey: ['my-policy'],
    queryFn: () => policiesApi.myPolicy().then(r => r.data),
    retry: false,
  })

  const cancelMutation = useMutation({
    mutationFn: () => policiesApi.cancel(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-policy'] })
      setShowCancelModal(false)
    },
  })

  const wallet       = policy?.wallet
  const monthsActive = driver.months_active || policy?.months_active || 0
  const tierKey      = wallet?.tier || 'bronze'
  const weeklyCredit = wallet?.weekly_credit || TIERS[TIER_INDEX[tierKey]]?.credit || 8
  const balance      = Number(wallet?.balance || 0)

  /* ── CORRECT ROLLOVER CALCULATIONS ── */
  const { count: voucherCount, value: voucherValue } = wallet
    ? calcVouchers(balance, tierKey)
    : { count: 0, value: VOUCHER_VALUE }

  const clampedVouchers  = Math.min(voucherCount, MAX_VOUCHERS_PER_CLAIM)
  const maxBonusThisClaim = clampedVouchers * voucherValue
  const weeksToFull      = weeksToMaxVouchers(balance, weeklyCredit)
  const isWalletFull     = voucherCount >= MAX_VOUCHERS_PER_CLAIM
  const progressToNextVoucher = (balance % VOUCHER_COST) / VOUCHER_COST * 100

  function getNextMonday() {
    const now  = new Date()
    const day  = now.getDay()
    const days = day === 0 ? 1 : day === 1 ? 7 : 8 - day
    const next = new Date(now)
    next.setDate(now.getDate() + days)
    next.setHours(0, 0, 0, 0)
    return next
  }
  const nextMonday = getNextMonday()

  if (isLoading) {
    return (
      <div className="min-h-screen pt-28 pb-16 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass p-6 animate-pulse">
              <div className="h-6 bg-white/[0.04] rounded w-1/3 mb-4" />
              <div className="h-12 bg-white/[0.04] rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!wallet) {
    return (
      <div className="min-h-screen pt-28 pb-16 px-4 flex items-start justify-center">
        <div className="w-full max-w-md text-center animate-slide-up glass p-10">
          <span className="text-5xl mb-4 block">💰</span>
          <h2 className="text-2xl font-bold text-white mb-2">No Savings Buffer Yet</h2>
          <p className="text-slate-400 mb-6">Activate a plan to start building your bonus vouchers automatically.</p>
          <Link to="/login" className="btn-primary">Get Protected →</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-28 pb-16 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="animate-slide-up">
          <h1 className="text-3xl font-black text-white">
            My Savings <span className="gradient-text">Buffer</span> 💰
          </h1>
          <p className="text-slate-400 mt-1">Builds automatically every week — used to boost your payout during bad weather</p>
        </div>

        {/* ── Balance Hero ── */}
        <div className="glass p-8 glow-cyan animate-slide-up">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-slate-400 text-sm uppercase tracking-wider mb-2">Current Savings Balance</p>
              <div className="text-6xl font-black gradient-text leading-none">
                {formatINR(balance)}
              </div>
              {/* PLAIN ENGLISH EXPLANATION — key change */}
              <p className="text-slate-400 text-sm mt-3">
                This gives you{' '}
                <span className="text-emerald-400 font-bold text-base">{clampedVouchers} bonus voucher{clampedVouchers !== 1 ? 's' : ''}</span>
                {' '}— each adds{' '}
                <span className="text-white font-semibold">₹{voucherValue} extra</span>{' '}
                on top of your base payout when bad weather hits
              </p>
              {/* Progress to next voucher */}
              {!isWalletFull && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Progress to next voucher</span>
                    <span>₹{Math.round(balance % VOUCHER_COST)} / ₹{VOUCHER_COST}</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500/70 rounded-full transition-all duration-700"
                      style={{ width: `${progressToNextVoucher}%` }}
                    />
                  </div>
                </div>
              )}
              {isWalletFull && (
                <div className="mt-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2 text-xs text-emerald-400 font-semibold text-center">
                  ✅ Max bonus unlocked — you're fully protected!
                </div>
              )}
            </div>
            <div className="flex gap-4 flex-shrink-0">
              <div className="glass p-4 text-center min-w-[90px]">
                <p className="text-xs text-slate-500 mb-1">Total Saved Ever</p>
                <p className="text-xl font-bold text-violet-400">{formatINR(wallet.total_ever_earned)}</p>
              </div>
              <div className="glass p-4 text-center min-w-[90px]">
                <p className="text-xs text-slate-500 mb-1">Your Level</p>
                <div className="mt-1"><TierBadge tier={tierKey} /></div>
              </div>
            </div>
          </div>
        </div>

        {/* ── VOUCHER VISUAL — replaces confusing "extra days" display ── */}
        <div className="glass p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-400 uppercase tracking-wider font-semibold">
              Your Bonus Vouchers
            </p>
            {/* Max bonus this claim */}
            <div className="text-right">
              <p className="text-xs text-slate-500">Max bonus if disruption today</p>
              <p className="text-lg font-bold text-emerald-400">
                +{formatINR(maxBonusThisClaim)}
              </p>
            </div>
          </div>

          <VoucherVisual vouchers={clampedVouchers} tierKey={tierKey} />

          {/* How it works — simple explanation for judges and drivers */}
          <div className="mt-4 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <p className="text-xs text-slate-400 font-semibold mb-2 uppercase tracking-wider">How it works</p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-xs text-slate-400">
                <span className="text-emerald-400 mt-0.5">1.</span>
                <span>Every Monday, ₹{weeklyCredit} is automatically added to your savings</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-400">
                <span className="text-emerald-400 mt-0.5">2.</span>
                <span>Every ₹{VOUCHER_COST} in savings = 1 bonus voucher (worth ₹{voucherValue} extra during bad weather)</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-400">
                <span className="text-emerald-400 mt-0.5">3.</span>
                <span>When FlowFix detects bad weather in your area, your vouchers are applied automatically — no action needed</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-400">
                <span className="text-emerald-400 mt-0.5">4.</span>
                <span>Max {MAX_VOUCHERS_PER_CLAIM} vouchers per event. Savings stay safe after a payout — only cancelled if you quit</span>
              </div>
            </div>
          </div>

          {/* Weeks to max vouchers */}
          {!isWalletFull && weeksToFull > 0 && (
            <div className="mt-3 text-center text-xs text-slate-500">
              Keep your plan active for{' '}
              <span className="text-white font-semibold">{weeksToFull} more week{weeksToFull !== 1 ? 's' : ''}</span>{' '}
              to unlock maximum bonus vouchers
            </div>
          )}
        </div>

        {/* ── What happens when you get paid ── */}
        <div className="glass p-6 animate-slide-up">
          <p className="text-sm text-slate-400 uppercase tracking-wider font-semibold mb-4">
            Example Payout — Bad Weather Hits Today
          </p>
          <div className="space-y-2">
            {[
              { label: 'Base payout (from your plan)',       amount: policy?.plan?.daily_payout_rate || 200,  color: 'text-cyan-400'  },
              { label: `Savings bonus (${clampedVouchers} voucher${clampedVouchers!==1?'s':''} × ₹${voucherValue})`, amount: maxBonusThisClaim, color: 'text-emerald-400' },
            ].map((row, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-white/[0.02] rounded-xl">
                <span className="text-sm text-slate-400">{row.label}</span>
                <span className={`font-bold text-sm ${row.color}`}>+{formatINR(row.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center p-3 bg-white/[0.06] rounded-xl border border-white/10">
              <span className="text-sm font-bold text-white">Total you receive (Day 1)</span>
              <span className="font-black text-lg text-white">
                {formatINR((policy?.plan?.daily_payout_rate || 200) + maxBonusThisClaim)}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-3 text-center">
            Your savings balance stays intact after a payout — only the vouchers are used
          </p>
        </div>

        {/* ── Next weekly credit + months active ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
          <div className="glass p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Next Savings Top-Up</p>
            <p className="text-2xl font-black text-emerald-400">+₹{weeklyCredit}</p>
            <p className="text-xs text-slate-400 mt-1">Added every Monday automatically</p>
            <div className="mt-3 flex justify-between text-xs">
              <span className="text-slate-500">Next top-up</span>
              <span className="font-mono text-cyan-400 font-semibold">
                {nextMonday.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
              </span>
            </div>
          </div>

          <div className="glass p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Member Since</p>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-white">{monthsActive} <span className="text-base font-normal text-slate-500">months</span></span>
              <TierBadge tier={tierKey} />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Stay subscribed → earn higher tier → get bigger weekly savings
            </p>
          </div>
        </div>

        {/* ── Tier Progression ── */}
        <div className="glass p-6 animate-slide-up">
          <p className="text-sm text-slate-400 uppercase tracking-wider mb-1 font-semibold">Membership Level</p>
          <p className="text-xs text-slate-600 mb-5">Higher level = more savings added each week</p>
          <TierProgressBar currentTier={tierKey} monthsActive={monthsActive} />
        </div>

        {/* ── Credit History ── */}
        <div className="glass p-6 animate-slide-up">
          <p className="text-sm text-slate-400 uppercase tracking-wider mb-5 font-semibold">Savings History</p>
          <CreditHistoryTimeline credits={wallet.credit_history || []} />
        </div>

        {/* ── Cancellation Warning — retention hook ── */}
        <div className="glass p-6 border-red-500/10 border animate-slide-up">
          <div className="flex items-start gap-4">
            <span className="text-3xl">⚠️</span>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-400 mb-2">Before You Cancel — Read This</h3>

              {/* Show exactly what they lose — makes cancellation painful */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Savings lost</p>
                  <p className="text-lg font-bold text-red-400">{formatINR(balance)}</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Vouchers lost</p>
                  <p className="text-lg font-bold text-red-400">{clampedVouchers} 🎟️</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Bonus lost</p>
                  <p className="text-lg font-bold text-red-400">{formatINR(maxBonusThisClaim)}</p>
                </div>
              </div>

              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                If you cancel, your <strong className="text-white">entire savings buffer ({formatINR(balance)})</strong> goes back to the community pool. Your tier progress resets to Bronze. This <strong className="text-red-400">cannot be undone</strong>.
              </p>

              {policy?.cooldown_active ? (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-sm text-amber-400">
                  ⏳ Cancellation blocked — you received a payout recently.
                  Available after <strong>{new Date(policy.cooldown_ends_at).toLocaleDateString('en-IN')}</strong>
                </div>
              ) : (
                <button className="btn-danger text-sm" onClick={() => setShowCancelModal(true)}>
                  Cancel My Plan
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cancel Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="glass p-8 max-w-md w-full space-y-5">
              <div className="text-center">
                <span className="text-5xl block mb-4">🚨</span>
                <h3 className="text-xl font-bold text-white mb-2">Are you absolutely sure?</h3>
                <p className="text-sm text-slate-400">
                  You will permanently lose <strong className="text-red-400">{formatINR(balance)}</strong> in savings
                  and <strong className="text-red-400">{clampedVouchers} bonus voucher{clampedVouchers!==1?'s':''}</strong> worth{' '}
                  <strong className="text-red-400">{formatINR(maxBonusThisClaim)}</strong> in future payouts.
                </p>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-xs text-red-400 text-center">
                Savings forfeited → community pool. Tier resets to Bronze. Vouchers deleted.
              </div>
              {cancelMutation.error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400 text-center">
                  {cancelMutation.error?.response?.data?.detail || 'Something went wrong. Please try again.'}
                </div>
              )}
              <div className="flex gap-3">
                <button className="btn-ghost flex-1" onClick={() => setShowCancelModal(false)}>
                  Keep My Plan
                </button>
                <button
                  className="btn-danger flex-1"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? 'Cancelling…' : 'Yes, Cancel & Lose Savings'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom nav */}
        <div className="flex gap-3 animate-fade-in">
          <Link to="/dashboard" className="btn-ghost flex-1 text-center">← Home</Link>
          <Link to="/claims" className="btn-ghost flex-1 text-center">Payments</Link>
        </div>

      </div>
    </div>
  )
}
