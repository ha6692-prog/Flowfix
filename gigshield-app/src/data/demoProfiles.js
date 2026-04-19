const now = Date.now()

const daysAgoIso = (days) => new Date(now - days * 24 * 60 * 60 * 1000).toISOString()

const buildPolicy = ({
  planName,
  dailyRate,
  coverageDays,
  tier,
  balance,
  totalEarned,
  weeklyCredit,
  activatedDaysAgo,
  extraDays,
  creditHistory,
}) => ({
  id: `demo-policy-${tier}`,
  is_active: true,
  activated_at: daysAgoIso(activatedDaysAgo),
  cooldown_active: false,
  cooldown_ends_at: null,
  next_credit_at: daysAgoIso(-3),
  plan: {
    name: planName,
    daily_payout_rate: dailyRate,
    max_coverage_days: coverageDays,
  },
  wallet: {
    balance,
    total_ever_earned: totalEarned,
    tier,
    weekly_credit: weeklyCredit,
    extra_days_available: extraDays,
    credit_history: creditHistory,
    next_tier: null,
  },
})

const DEMO_PROFILES = {
  'ZMT-DRV-0001': {
    policy: buildPolicy({
      planName: 'Full',
      dailyRate: 400,
      coverageDays: 7,
      tier: 'gold',
      balance: 156,
      totalEarned: 468,
      weeklyCredit: 13,
      activatedDaysAgo: 270,
      extraDays: 2,
      creditHistory: [
        { id: 'p1', amount: 13, credited_at: daysAgoIso(7), tier: 'gold' },
        { id: 'p2', amount: 13, credited_at: daysAgoIso(14), tier: 'gold' },
        { id: 'p3', amount: 13, credited_at: daysAgoIso(21), tier: 'gold' },
      ],
    }),
    edz: { final_edz_score: 0.82, status: 'disruption_active' },
    claims: {
      results: [
        {
          id: 'c1', status: 'paid', total_payout_amount: 3200, created_at: daysAgoIso(42),
          days_covered: 7, base_payout_amount: 2800, wallet_contribution: 400, zone_name: 'North Zone',
        },
        {
          id: 'c2', status: 'paid', total_payout_amount: 2200, created_at: daysAgoIso(21),
          days_covered: 5, base_payout_amount: 2000, wallet_contribution: 200, zone_name: 'North Zone',
        },
        {
          id: 'c3', status: 'paid', total_payout_amount: 1600, created_at: daysAgoIso(10),
          days_covered: 4, base_payout_amount: 1600, wallet_contribution: 0, zone_name: 'North Zone',
        },
      ],
    },
  },
  'SWG-DRV-0002': {
    policy: buildPolicy({
      planName: 'Standard',
      dailyRate: 300,
      coverageDays: 5,
      tier: 'silver',
      balance: 70,
      totalEarned: 140,
      weeklyCredit: 10,
      activatedDaysAgo: 150,
      extraDays: 1,
      creditHistory: [
        { id: 'a1', amount: 10, credited_at: daysAgoIso(7), tier: 'silver' },
        { id: 'a2', amount: 10, credited_at: daysAgoIso(14), tier: 'silver' },
      ],
    }),
    edz: { final_edz_score: 0.61, status: 'normal' },
    claims: {
      results: [
        {
          id: 'c1', status: 'paid', total_payout_amount: 1650, created_at: daysAgoIso(28),
          days_covered: 5, base_payout_amount: 1500, wallet_contribution: 150, zone_name: 'South Zone',
        },
        {
          id: 'c2', status: 'rejected', total_payout_amount: 0, created_at: daysAgoIso(12),
          days_covered: 0, base_payout_amount: 0, wallet_contribution: 0, zone_name: 'South Zone',
        },
      ],
    },
  },
}

export const getDemoProfile = (platformId = '') => DEMO_PROFILES[(platformId || '').toUpperCase()] || null
