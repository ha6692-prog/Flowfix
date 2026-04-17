import { useQuery } from '@tanstack/react-query'
import { claimsApi, formatINR } from '../api/client'
import useWebSocket from '../hooks/useWebSocket'
import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'

/* ── Step definitions for the claim pipeline ── */
const PIPELINE_STEPS = [
  { key: 'claim_created',       label: '✅ Bad Weather Detected',   icon: '⚡', description: 'Our system detected that you cannot earn in your area' },
  { key: 'fraud_check_started', label: 'Eligibility Check',       icon: '🔍', description: 'We are confirming you were trying to work' },
  { key: 'claim_approved',      label: '✅ Payout Approved',          icon: '✅', description: 'We calculated how much you will receive' },
  { key: 'payout_queued',       label: '₹50 Sent to Your UPI',   icon: '💸', description: 'First payment of ₹50 has been sent to your account' },
  { key: 'payout_success',      label: 'Payout Complete',   icon: '🎉', description: 'Full amount transferred' },
]

const STATUS_TO_STEP_INDEX = {
  pending_fraud_check: 0,
  fraud_check:         1,
  approved:            2,
  queued:              3,
  paid:                4,
  payout_success:      4,
}

function getStepIndex(status, wsEvents) {
  // WebSocket events take priority for real-time feel
  if (wsEvents.length > 0) {
    const lastEvent = wsEvents[wsEvents.length - 1]
    const idx = PIPELINE_STEPS.findIndex(s => s.key === lastEvent.type)
    if (idx !== -1) return idx
  }
  return STATUS_TO_STEP_INDEX[status] ?? -1
}

function StepProgress({ currentStep, wsEvents, claimData }) {
  return (
    <div className="space-y-1">
      {PIPELINE_STEPS.map((step, i) => {
        const isDone = i < currentStep
        const isActive = i === currentStep
        const isPending = i > currentStep

        // Try to get payload from WS events for this step
        const wsEvent = wsEvents.find(e => e.type === step.key)
        const payload = wsEvent?.payload || {}

        return (
          <div key={step.key} className="flex items-start gap-4">
            {/* ── Timeline line + dot ── */}
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg
                transition-all duration-500 flex-shrink-0
                ${isDone ? 'step-done' : isActive ? 'step-active animate-pulse-slow' : 'step-pending'}`}>
                {isDone ? '✓' : step.icon}
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div className={`w-0.5 h-12 transition-all duration-700
                  ${isDone ? 'bg-emerald-500/50' : isActive ? 'bg-cyan-500/30' : 'bg-white/[0.06]'}`} />
              )}
            </div>

            {/* ── Step content ── */}
            <div className={`pb-8 transition-opacity duration-300 ${isPending ? 'opacity-40' : ''}`}>
              <h3 className={`font-semibold text-base
                ${isDone ? 'text-emerald-400' : isActive ? 'text-cyan-400' : 'text-slate-500'}`}>
                {step.label}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">{step.description}</p>

              {/* Dynamic payload info */}
              {(isDone || isActive) && (
                <div className="mt-2 space-y-1">
                  {step.key === 'claim_created' && payload.edz_score && (
                    <p className="text-xs text-slate-400">
                      Risk Level: <span className="text-red-400 font-semibold">{(payload.edz_score * 100).toFixed(0)} / 100</span>
                      {payload.zone && <> · Zone: <span className="text-white">{payload.zone}</span></>}
                    </p>
                  )}
                  {step.key === 'claim_approved' && (payload.total_amount || claimData?.total_payout_amount) && (
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 text-emerald-400 font-semibold">
                        {formatINR(payload.total_amount || claimData?.total_payout_amount || 0)}
                      </span>
                      {(payload.days || claimData?.days_covered) && (
                        <span className="text-xs text-slate-400">{payload.days || claimData?.days_covered} days covered</span>
                      )}
                    </div>
                  )}
                  {step.key === 'payout_queued' && (
                    <p className="text-xs text-slate-400">
                      Batch #{payload.batch_number || '—'} · Signal: <span className="text-emerald-400 font-semibold">{formatINR(50)}</span>
                    </p>
                  )}
                  {step.key === 'payout_success' && (payload.amount || claimData?.total_payout_amount) && (
                    <div className="space-y-1">
                      <p className="text-sm text-emerald-400 font-bold">
                        {formatINR(payload.amount || claimData?.total_payout_amount || 0)} deposited
                      </p>
                      {payload.razorpay_id && (
                        <p className="text-xs text-slate-600 font-mono">Ref: {payload.razorpay_id}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Failure state */}
              {wsEvent?.type === 'payout_failed' && step.key === 'payout_success' && (
                <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-red-400">
                  ⚠️ Attempt {payload.attempt || '?'} failed — retrying in {payload.retry_in_seconds || 60}s
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ConnectionBadge({ connected }) {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
      ${connected
        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
        : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
      <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
      {connected ? 'Live connected' : 'Updating…'}
    </div>
  )
}

export default function ActiveClaim() {
  const driver = JSON.parse(localStorage.getItem('gs_driver') || '{}')
  const [wsEvents, setWsEvents] = useState([])
  const [failedEvent, setFailedEvent] = useState(null)

  const { data: claim, isLoading, error, refetch } = useQuery({
    queryKey: ['active-claim'],
    queryFn: () => claimsApi.activeClaim().then(r => r.data),
    refetchInterval: 30_000,
    retry: false,
  })

  const onMessage = useCallback((event) => {
    if (event.type === 'payout_failed') {
      setFailedEvent(event)
    } else {
      setWsEvents(prev => {
        // Prevent duplicates
        if (prev.some(e => e.type === event.type)) return prev
        return [...prev, event]
      })
    }
    // Refetch claim data to stay in sync
    refetch()
  }, [refetch])

  const { connected } = useWebSocket(driver.id, onMessage)

  // Reset WS events when claim data changes (new claim)
  useEffect(() => {
    if (claim?.id) {
      setWsEvents([])
      setFailedEvent(null)
    }
  }, [claim?.id])

  const currentStep = getStepIndex(claim?.status, wsEvents)

  /* ── No active claim state ── */
  if (!isLoading && (!claim || error)) {
    return (
      <div className="min-h-screen pt-28 pb-16 px-4 flex items-start justify-center">
        <div className="w-full max-w-lg text-center animate-slide-up">
          <div className="glass p-10 flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
              <span className="text-4xl">☀️</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">No Active Payout Request</h2>
              <p className="text-slate-400 leading-relaxed">
                Everything is running smoothly in your zone. When bad weather 
                is detected, your payout will trigger and appear here in real time.
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <Link to="/dashboard" className="btn-ghost flex-1 text-center">Home</Link>
              <Link to="/claims" className="btn-primary flex-1 text-center">Payments</Link>
            </div>
          </div>

          {/* How it works mini */}
          <div className="glass p-6 mt-6 text-left">
            <p className="text-sm text-slate-400 uppercase tracking-wider mb-4 font-semibold">How auto-trigger works</p>
            <div className="space-y-3">
              {[
                { emoji: '⛈️', text: 'Weather disruption detected by 2+ sources' },
                { emoji: '📊', text: 'Risk level crosses threshold' },
                { emoji: '⚡', text: 'Payout request auto-created — no forms needed' },
                { emoji: '🔍', text: 'Eligibility check runs in parallel' },
                { emoji: '💸', text: 'Instant ₹50 signal, then full payment' },
              ].map(({ emoji, text }) => (
                <div key={text} className="flex items-center gap-3 text-sm">
                  <span className="text-lg">{emoji}</span>
                  <span className="text-slate-300">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-28 pb-16 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-slide-up">
          <div>
            <h1 className="text-3xl font-black text-white">Your Payout Status</h1>
            <p className="text-slate-400 mt-1">
              Payout Request #{claim?.id?.slice(0, 8) || '…'}
            </p>
          </div>
          <ConnectionBadge connected={connected} />
        </div>

        {/* Summary card */}
        {claim && (
          <div className="glass p-6 animate-slide-up">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Status', value: claim.status === 'pending_fraud_check' ? 'VERIFYING YOUR ELIGIBILITY...' : claim.status?.replace(/_/g, ' ')?.toUpperCase(), color: 'text-cyan-400' },
                { label: 'Base Amount', value: formatINR(claim.base_payout_amount || 0), color: 'text-white' },
                { label: 'Your Savings Bonus', value: formatINR(claim.wallet_contribution || 0), color: 'text-violet-400' },
                { label: 'Total', value: formatINR(claim.total_payout_amount || 0), color: 'text-emerald-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className={`font-semibold text-sm ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pipeline progress */}
        <div className="glass p-6 animate-slide-up">
          <p className="text-sm text-slate-400 uppercase tracking-wider mb-6 font-semibold">
            What's Happening Now
          </p>
          {isLoading ? (
            <div className="space-y-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/[0.04] animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/[0.04] rounded w-1/3 animate-pulse" />
                    <div className="h-3 bg-white/[0.04] rounded w-2/3 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <StepProgress
              currentStep={currentStep}
              wsEvents={wsEvents}
              claimData={claim}
            />
          )}
        </div>

        {/* Rejected state */}
        {claim?.status === 'rejected' && (
          <div className="glass p-6 border-red-500/20 border animate-slide-up">
            <div className="flex items-start gap-4">
              <span className="text-3xl">⛔</span>
              <div>
                <h3 className="text-lg font-bold text-red-400 mb-1">Request Not Approved</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  This request did not pass our eligibility verification.
                  {claim.fraud_score > 0.4 && (
                    <> Verification score: <span className="text-red-400 font-semibold">{(claim.fraud_score * 100).toFixed(0)} / 100</span> (threshold: 40 / 100)</>
                  )}
                  {claim.intent_score < 0.5 && (
                    <> Work confirmation: <span className="text-amber-400 font-semibold">{(claim.intent_score * 100).toFixed(0)} / 100</span> (minimum: 50 / 100)</>
                  )}
                  {claim.cluster_fraud_flag && (
                    <> Multiple rapid requests detected in your area.</>
                  )}
                </p>
                <p className="text-xs text-slate-600 mt-2">
                  This is an automated decision. If you believe this is incorrect, contact support.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Failed payout retry */}
        {failedEvent && (
          <div className="glass p-6 border-amber-500/20 border animate-slide-up">
            <div className="flex items-start gap-4">
              <span className="text-3xl">⚠️</span>
              <div>
                <h3 className="text-lg font-bold text-amber-400 mb-1">Payout Retry</h3>
                <p className="text-sm text-slate-400">
                  Attempt {failedEvent.payload?.attempt || '?'} failed. 
                  Retrying in {failedEvent.payload?.retry_in_seconds || 60} seconds.
                  Max 3 attempts.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bottom links */}
        <div className="flex gap-3 animate-fade-in">
          <Link to="/dashboard" className="btn-ghost flex-1 text-center">← Home</Link>
          <Link to="/claims" className="btn-ghost flex-1 text-center">Payments</Link>
        </div>
      </div>
    </div>
  )
}
