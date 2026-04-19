import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { policiesApi, getRole } from '../api/client'

const FALLBACK_PLANS = [
  {
    key: 'basic',
    id: null,
    name: 'Basic Shield',
    price: 20,
    days: 3,
    payout: 200,
    features: [
      { text: '3 days disruption buffer', inc: true },
      { text: '₹200/day payout', inc: true },
      { text: 'Instant ₹50 UPI signal', inc: true },
      { text: 'Savings wallet accrual', inc: false },
      { text: 'Premium tier multipliers', inc: false }
    ],
    elevated: false
  },
  {
    key: 'standard',
    id: null,
    name: 'Standard Shield',
    price: 50,
    days: 5,
    payout: 300,
    features: [
      { text: '5 days disruption buffer', inc: true },
      { text: '₹300/day payout', inc: true },
      { text: 'Instant ₹50 UPI signal', inc: true },
      { text: 'Savings wallet build (₹8/wk)', inc: true },
      { text: 'Premium tier multipliers', inc: false }
    ],
    elevated: true
  },
  {
    key: 'full',
    id: null,
    name: 'Full Shield',
    price: 99,
    days: 7,
    payout: 400,
    features: [
      { text: '7 days full buffer', inc: true },
      { text: '₹400/day payout', inc: true },
      { text: 'Instant ₹50 UPI signal', inc: true },
      { text: 'Max savings accrual (₹16/wk)', inc: true },
      { text: 'Premium tier multipliers', inc: true }
    ],
    elevated: false
  }
]

const normalizePlanName = (name = '') => name.toLowerCase().replace(/\s+/g, '-')

const toCardPlan = (plan) => {
  const normalized = normalizePlanName(plan.name)
  const key =
    normalized.includes('standard') ? 'standard'
      : normalized.includes('full') ? 'full'
        : 'basic'
  const baseFeatures = [
    { text: `${plan.max_coverage_days} days disruption buffer`, inc: true },
    { text: `₹${plan.daily_payout_rate}/day payout`, inc: true },
    { text: `Weekly premium ₹${plan.effective_weekly_premium ?? plan.weekly_premium}`, inc: true },
    { text: 'Instant ₹50 UPI signal', inc: true },
    { text: 'Platform co-funding support', inc: !!plan.platform_cofund_optional },
  ]

  return {
    id: plan.id,
    key,
    name: `${plan.name} Shield`,
    price: Number(plan.effective_weekly_premium ?? plan.weekly_premium),
    days: plan.max_coverage_days,
    payout: plan.daily_payout_rate,
    features: baseFeatures,
    elevated: key === 'standard',
  }
}

export default function Plans() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [billing, setBilling] = useState('weekly')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { data: plansData } = useQuery({
    queryKey: ['policy-plans'],
    queryFn: () => policiesApi.listPlans().then((r) => r.data),
    retry: 1,
  })

  const plans = useMemo(() => {
    if (!Array.isArray(plansData) || plansData.length === 0) return FALLBACK_PLANS
    return plansData.map(toCardPlan)
  }, [plansData])

  const activateMutation = useMutation({
    mutationFn: (planId) => policiesApi.activate({ plan_id: planId }),
    onSuccess: (res) => {
      setError('')
      setSuccess(res?.data?.message || 'Plan activated successfully.')
      queryClient.invalidateQueries({ queryKey: ['my-policy'] })
      window.setTimeout(() => navigate('/dashboard'), 600)
    },
    onError: (err) => {
      const d = err.response?.data || {}
      const msg =
        d.non_field_errors?.[0] ||
        d.detail ||
        d.plan_id?.[0] ||
        'Unable to activate this plan right now.'
      setError(msg)
    },
  })

  const handleSelectPlan = (plan) => {
    setError('')
    setSuccess('')

    if (!localStorage.getItem('gs_access')) {
      navigate('/login')
      return
    }

    if (getRole() === 'admin') {
      setError('Admin accounts cannot activate worker protection plans.')
      return
    }

    if (!plan.id) {
      setError('Plan sync in progress. Please retry in a moment.')
      return
    }

    activateMutation.mutate(plan.id)
  }

  return (
    <section id="protection-plans" className="w-full max-w-6xl mx-auto px-4 py-24 relative z-10">
      
      {/* Header & Toggle */}
      <div className="flex flex-col items-center mb-16 text-center">
        <h2 className="font-[--font-display] text-[48px] md:text-[72px] text-[--mist] leading-[1.1] mb-8">
          Pick your shield.
        </h2>
        
        <div className="flex items-center gap-1 bg-[rgba(255,255,255,0.04)] border border-[--night-border] rounded-full p-1">
          <button
            onClick={() => setBilling('weekly')}
            className={`font-[--font-mono] text-[13px] px-[20px] py-[8px] rounded-full transition-all duration-200 ${
              billing === 'weekly'
                ? 'bg-[rgba(249,115,22,0.12)] border border-[rgba(249,115,22,0.35)] text-[--orange]'
                : 'text-[--mist-ghost] border border-transparent'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setBilling('monthly')}
            className={`font-[--font-mono] text-[13px] px-[20px] py-[8px] rounded-full transition-all duration-200 ${
              billing === 'monthly'
                ? 'bg-[rgba(249,115,22,0.12)] border border-[rgba(249,115,22,0.35)] text-[--orange]'
                : 'text-[--mist-ghost] border border-transparent'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {(error || success) && (
        <div className="mb-6 text-center">
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2 inline-block">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2 inline-block">
              {success}
            </p>
          )}
        </div>
      )}

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[20px] items-center">
        {plans.map((plan) => {
          const price = billing === 'weekly' ? plan.price : plan.price * 4
          return (
            <div
              key={plan.key}
              className={`bg-[--night] rounded-[24px] p-[40px_36px] flex flex-col ${
                plan.elevated
                  ? 'border-2 border-[--orange] scale-100 md:scale-[1.05] shadow-[0_0_56px_rgba(249,115,22,0.12)] z-10'
                  : 'border border-[--night-border] z-0'
              }`}
            >
              {plan.elevated && (
                <div className="bg-[rgba(249,115,22,0.1)] border border-[rgba(249,115,22,0.35)] font-[--font-mono] text-[10px] text-[--orange] uppercase rounded-full px-3 py-1 self-start mb-6">
                  MOST PROTECTED
                </div>
              )}

              <h4 className="font-[--font-mono] text-[12px] text-[--mist-ghost] uppercase mb-4 tracking-wider">
                {plan.name}
              </h4>

              <div className="mb-2">
                <span className={`font-[--font-display] text-[64px] leading-none ${plan.elevated ? 'text-[--orange]' : 'text-[--mist]'}`}>
                  ₹{price}
                </span>
                <span className="font-[--font-mono] text-[14px] text-[--mist-ghost] ml-2">
                  per {billing === 'weekly' ? 'week' : 'month'}
                </span>
              </div>

              <div className="bg-[--orange-glow] border border-[rgba(249,115,22,0.3)] rounded-full px-[14px] py-[4px] self-start inline-flex mb-6">
                <span className="font-[--font-mono] text-[12px] text-[--orange]">
                  {plan.days} days · ₹{plan.payout}/day
                </span>
              </div>

              <div className="w-full border-t border-[--night-border] my-[24px]" />

              <div className="flex-1 space-y-4 mb-8">
                {plan.features.map((feat, i) => (
                  <div key={i} className="flex gap-3">
                    {feat.inc ? (
                      <span className="text-[--orange] font-[--font-mono] text-[13px] shrink-0">✓</span>
                    ) : (
                      <span className="text-[rgba(255,255,255,0.2)] font-[--font-mono] text-[13px] shrink-0">○</span>
                    )}
                    <span className={`font-[--font-mono] text-[13px] leading-[1.8] ${feat.inc ? 'text-[--mist]' : 'text-[--mist-ghost]'}`}>
                      {feat.text}
                    </span>
                  </div>
                ))}
              </div>

              {localStorage.getItem('gs_access') ? (
                <button
                  type="button"
                  onClick={() => handleSelectPlan(plan)}
                  disabled={activateMutation.isPending}
                  className={`text-center font-[--font-mono] text-[15px] rounded-full py-[14px] w-full block transition-all duration-200 ${
                    plan.elevated
                      ? 'bg-[--orange] text-[--asphalt] font-semibold hover:brightness-110 hover:scale-[1.02]'
                      : 'border border-[--night-border] text-[--mist] hover:border-[--orange] hover:text-[--orange]'
                  } ${activateMutation.isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {activateMutation.isPending ? 'Activating...' : 'Activate Plan'}
                </button>
              ) : (
                <Link
                  to="/login"
                  className={`text-center font-[--font-mono] text-[15px] rounded-full py-[14px] w-full block transition-all duration-200 ${
                    plan.elevated
                      ? 'bg-[--orange] text-[--asphalt] font-semibold hover:brightness-110 hover:scale-[1.02]'
                      : 'border border-[--night-border] text-[--mist] hover:border-[--orange] hover:text-[--orange]'
                  }`}
                >
                  Select Plan
                </Link>
              )}
            </div>
          )
        })}
      </div>

      {/* Footnote */}
      <div className="mt-[32px] text-center w-full flex justify-center">
        <p className="font-[--font-mono] text-[12px] text-[--mist-ghost] max-w-[600px] leading-[1.6]">
          Platform co-funding during declared disasters may extend coverage at no extra cost. Disclosed at signup. Never a guarantee.
        </p>
      </div>

    </section>
  )
}
