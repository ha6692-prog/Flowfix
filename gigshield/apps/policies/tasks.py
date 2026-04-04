"""
policies/tasks.py

Tasks 7 & 8:
  7. weekly_reserve_credit_task  — every Monday 00:00 IST
  8. seasonal_premium_adjustment_task — 1st of each month
"""
import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(name='apps.policies.tasks.weekly_reserve_credit_task', bind=True)
def weekly_reserve_credit_task(self):
    """
    Task 7: Runs every Monday at 00:00 IST.
    For each active policy with no claim in the past 7 days:
      - Determine tier from months_active
      - Credit: bronze=₹8, silver=₹10, gold=₹13, platinum=₹16
      - Update total_ever_earned, tier, last_credited_at
    """
    from apps.policies.models import DriverPolicy, ReserveWallet
    from apps.claims.models import Claim

    seven_days_ago = timezone.now() - timedelta(days=7)
    active_policies = DriverPolicy.objects.filter(is_active=True).select_related(
        'driver__wallet', 'driver'
    )

    credited = 0
    for policy in active_policies:
        driver = policy.driver

        # Skip if driver made a claim this week
        had_claim = Claim.objects.filter(
            driver=driver,
            created_at__gte=seven_days_ago,
            status__in=['approved', 'paid'],
        ).exists()
        if had_claim:
            continue

        try:
            wallet = driver.wallet
        except ReserveWallet.DoesNotExist:
            wallet = ReserveWallet.objects.create(driver=driver)

        # Update tier from months_active
        wallet.update_tier_from_months(driver.months_active)
        credit_amount = wallet.get_weekly_credit()

        wallet.balance += credit_amount
        wallet.total_ever_earned += credit_amount
        wallet.last_credited_at = timezone.now()
        wallet.save()
        credited += 1

    logger.info(f'weekly_reserve_credit_task: credited {credited} drivers')
    return {'drivers_credited': credited}


@shared_task(name='apps.policies.tasks.seasonal_premium_adjustment_task', bind=True)
def seasonal_premium_adjustment_task(self):
    """
    Task 8: Runs on the 1st of each month.
    Jun–Oct (monsoon+post-monsoon): seasonal_multiplier = 1.35
    All other months: seasonal_multiplier = 1.0
    Notifies all active drivers (logged — push notification integration TBD).
    """
    from apps.policies.models import PolicyPlan

    month = timezone.now().month
    monsoon_months = [6, 7, 8, 9, 10]
    is_monsoon = month in monsoon_months
    multiplier = 1.35 if is_monsoon else 1.0

    plans = PolicyPlan.objects.all()
    for plan in plans:
        plan.seasonal_multiplier = multiplier
        plan.save()

    season_label = 'Monsoon Season (Jun-Oct)' if is_monsoon else 'Standard Season'
    logger.info(
        f'seasonal_premium_adjustment_task: set multiplier={multiplier} ({season_label}) '
        f'for {plans.count()} plans'
    )
    return {'multiplier': multiplier, 'season': season_label, 'plans_updated': plans.count()}
