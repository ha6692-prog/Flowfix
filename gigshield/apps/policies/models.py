from django.db import models
from django.utils import timezone


class PolicyPlan(models.Model):
    """
    Three fixed tiers: Basic / Standard / Full.
    seasonal_multiplier is set to 1.35 for Jun–Oct by a Celery task.
    platform_cofund_optional is NEVER a guarantee — disclosure only.
    """
    PLAN_CHOICES = [
        ('Basic', 'Basic'),
        ('Standard', 'Standard'),
        ('Full', 'Full'),
    ]

    name = models.CharField(max_length=20, choices=PLAN_CHOICES, unique=True)
    weekly_premium = models.DecimalField(max_digits=8, decimal_places=2)      # 20 / 50 / 99
    daily_payout_rate = models.DecimalField(max_digits=8, decimal_places=2)   # 200 / 300 / 400
    max_coverage_days = models.IntegerField()                                  # 3 / 5 / 7
    reserve_contribution_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.1000)
    seasonal_multiplier = models.FloatField(default=1.0)
    platform_cofund_optional = models.BooleanField(default=False)

    class Meta:
        app_label = 'policies'

    def __str__(self):
        return f"{self.name} Plan (₹{self.weekly_premium}/week)"


class DriverPolicy(models.Model):
    """
    One active policy per driver. reclaim_blocked_until enforces 14-day
    cooldown after any payout. Cancellation blocked while cooldown is active.
    """
    driver = models.OneToOneField(
        'users.Driver', on_delete=models.CASCADE, related_name='policy'
    )
    plan = models.ForeignKey(PolicyPlan, on_delete=models.PROTECT, related_name='driver_policies')
    is_active = models.BooleanField(default=True)
    activated_at = models.DateTimeField(auto_now_add=True)
    last_premium_paid_at = models.DateTimeField(auto_now_add=True)
    last_claim_at = models.DateTimeField(null=True, blank=True)
    reclaim_blocked_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = 'policies'

    def is_cooldown_active(self) -> bool:
        return bool(
            self.reclaim_blocked_until and self.reclaim_blocked_until > timezone.now()
        )

    def __str__(self):
        return f"{self.driver.name} → {self.plan.name} ({'active' if self.is_active else 'cancelled'})"


class ReserveWallet(models.Model):
    """
    Personal reserve fund that grows via weekly credits (tier-based).
    On cancellation, balance is forfeited to zone.pool_balance.
    On claim, wallet funds extra days beyond base, then resets to 0.

    Tier thresholds (months_active):
      bronze  0-3 → ₹8/week
      silver  4-6 → ₹10/week
      gold    7-12 → ₹13/week
      platinum 12+ → ₹16/week
    """
    TIER_CHOICES = [
        ('bronze', 'Bronze'),
        ('silver', 'Silver'),
        ('gold', 'Gold'),
        ('platinum', 'Platinum'),
    ]

    TIER_CREDIT_RATES = {
        'bronze': 8,
        'silver': 10,
        'gold': 13,
        'platinum': 16,
    }

    driver = models.OneToOneField(
        'users.Driver', on_delete=models.CASCADE, related_name='wallet'
    )
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_ever_earned = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # never resets
    tier = models.CharField(max_length=10, choices=TIER_CHOICES, default='bronze')
    last_credited_at = models.DateTimeField(auto_now_add=True)
    last_debited_at = models.DateTimeField(null=True, blank=True)
    forfeited_on_cancel = models.BooleanField(default=False)

    class Meta:
        app_label = 'policies'

    def get_weekly_credit(self) -> int:
        return self.TIER_CREDIT_RATES.get(self.tier, 8)

    def update_tier_from_months(self, months_active: int):
        if months_active >= 12:
            self.tier = 'platinum'
        elif months_active >= 7:
            self.tier = 'gold'
        elif months_active >= 4:
            self.tier = 'silver'
        else:
            self.tier = 'bronze'

    def extra_days_available(self, daily_rate) -> int:
        """How many extra days the wallet balance can fund."""
        if daily_rate <= 0:
            return 0
        from math import floor
        return floor(float(self.balance) / float(daily_rate))

    def __str__(self):
        return f"{self.driver.name}'s wallet ({self.tier}) — ₹{self.balance}"
