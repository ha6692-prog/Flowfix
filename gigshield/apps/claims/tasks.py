"""
claims/tasks.py

Tasks 3-5:
  3. auto_trigger_claim(zone_id, edz_snapshot_id) — per driver in zone
  4. fraud_and_intent_check(claim_id) — Celery chord: parallel fraud+intent
  5. calculate_payout(claim_id) — pool cap, wallet extension, payout creation
"""
import logging
from math import floor

from celery import shared_task, chord
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


@shared_task(name='apps.claims.tasks.auto_trigger_claim', bind=True)
def auto_trigger_claim(self, zone_id: int, edz_snapshot_id: str):
    """
    Task 3: Called by edz_engine_task when EDZ threshold breached.
    Per driver with active policy:
      a. Skip if reclaim_blocked_until active (cooldown)
      b. Cluster fraud check: >15 claims in zone in 10min + fingerprint overlap
      c. Check GPS spoofing from latest DriverActivity
      d. Create Claim(status='pending_fraud_check')
      e. Dispatch fraud_and_intent_check chord
    """
    from apps.users.models import Driver, DriverActivity
    from apps.policies.models import DriverPolicy
    from apps.claims.models import Claim
    from apps.monitoring.models import EDZSnapshot

    try:
        edz_snapshot = EDZSnapshot.objects.get(id=edz_snapshot_id)
    except EDZSnapshot.DoesNotExist:
        logger.error(f'EDZ snapshot {edz_snapshot_id} not found')
        return

    drivers = Driver.objects.filter(
        zone_id=zone_id,
        is_active=True,
        policy__is_active=True,
    ).select_related('policy__plan', 'zone')

    # Cluster fraud check: >15 claims in this zone in last 10 min
    ten_min_ago = timezone.now() - timedelta(minutes=10)
    recent_zone_claims = Claim.objects.filter(
        zone_id=zone_id,
        created_at__gte=ten_min_ago,
    )
    cluster_count = recent_zone_claims.count()

    # Check device fingerprint overlap among recent claims
    recent_fingerprints = list(
        Driver.objects.filter(
            claims__in=recent_zone_claims
        ).values_list('device_fingerprint', flat=True)
    )
    fingerprint_overlap = len(recent_fingerprints) != len(set(recent_fingerprints))
    cluster_fraud = cluster_count > 15 and fingerprint_overlap

    triggered = 0
    for driver in drivers:
        policy = driver.policy

        # a. Skip if cooldown active
        if policy.is_cooldown_active():
            logger.info(f'Skipping {driver.name} — cooldown active until {policy.reclaim_blocked_until}')
            continue

        # c. GPS spoof detection from latest activity
        latest_activity = DriverActivity.objects.filter(driver=driver).first()
        gps_spoof = latest_activity.gps_spoofing_flag if latest_activity else False

        # d. Create claim
        claim = Claim.objects.create(
            driver=driver,
            policy=policy,
            zone_id=zone_id,
            edz_snapshot=edz_snapshot,
            status='pending_fraud_check',
            cluster_fraud_flag=cluster_fraud,
            gps_spoof_flag=gps_spoof,
        )

        # e. Dispatch parallel fraud+intent chord
        fraud_and_intent_check.delay(str(claim.id))
        triggered += 1

    logger.info(
        f'auto_trigger_claim: zone={zone_id} triggered={triggered} cluster_fraud={cluster_fraud}'
    )
    return {'triggered': triggered, 'cluster_fraud': cluster_fraud}


@shared_task(name='apps.claims.tasks._fraud_check_task', bind=True)
def _fraud_check_task(self, claim_id: str) -> dict:
    """
    Task 4A (parallel): Scores fraud based on:
    - device_fingerprint duplication (same device on 2+ Aadhaar hashes)
    - gps_spoof_flag
    - cluster_fraud_flag
    - claim frequency (rollover farming)
    Returns {'claim_id': ..., 'fraud_score': 0-1}
    """
    from apps.claims.models import Claim
    from apps.users.models import Driver

    claim = Claim.objects.select_related('driver').get(id=claim_id)
    driver = claim.driver
    score = 0.0

    # Check same device fingerprint on multiple Driver records
    device_dupes = Driver.objects.filter(
        device_fingerprint=driver.device_fingerprint
    ).exclude(id=driver.id).count()
    if device_dupes > 0:
        score += 0.35

    # GPS spoof
    if claim.gps_spoof_flag:
        score += 0.25

    # Cluster fraud
    if claim.cluster_fraud_flag:
        score += 0.20

    # Rollover farming: total_ever_earned / months_active ratio outlier
    try:
        wallet = driver.wallet
        if driver.months_active > 0:
            earn_per_month = float(wallet.total_ever_earned) / driver.months_active
            # Above ₹100/month average is suspicious for reserve-only farmers
            if earn_per_month > 100:
                score += 0.10
    except Exception:
        pass

    # Claim frequency: more than 2 claims in 30 days = suspicious
    thirty_days_ago = timezone.now() - timedelta(days=30)
    recent_claims = Claim.objects.filter(
        driver=driver, created_at__gte=thirty_days_ago
    ).exclude(id=claim_id).count()
    if recent_claims >= 2:
        score += 0.10

    score = min(score, 1.0)
    return {'claim_id': claim_id, 'fraud_score': score}


@shared_task(name='apps.claims.tasks._intent_check_task', bind=True)
def _intent_check_task(self, claim_id: str) -> dict:
    """
    Task 4B (parallel): Checks if driver showed genuine work intent in 30 min
    before EDZ trigger (beacon active + app in foreground).
    Returns {'claim_id': ..., 'intent_score': 0-1}
    """
    from apps.claims.models import Claim
    from apps.users.models import DriverActivity

    claim = Claim.objects.select_related('driver').get(id=claim_id)
    trigger_time = claim.created_at
    window_start = trigger_time - timedelta(minutes=30)

    activities = DriverActivity.objects.filter(
        driver=claim.driver,
        timestamp__gte=window_start,
        timestamp__lte=trigger_time,
    )

    if not activities.exists():
        return {'claim_id': claim_id, 'intent_score': 0.0}

    total = activities.count()
    foreground = activities.filter(app_in_foreground=True).count()
    active_net = activities.exclude(network_type='offline').count()

    # Weighted: foreground 60%, network 40%
    score = (foreground / total) * 0.6 + (active_net / total) * 0.4
    return {'claim_id': claim_id, 'intent_score': round(score, 4)}


@shared_task(name='apps.claims.tasks._fraud_intent_callback', bind=True)
def _fraud_intent_callback(self, results: list):
    """
    Chord callback after parallel fraud+intent tasks complete.
    fraud < 0.4 AND intent > 0.5 → approved → calculate_payout
    else → rejected + log reason
    """
    from apps.claims.models import Claim

    # results = [{'claim_id':..,'fraud_score':..}, {'claim_id':..,'intent_score':..}]
    merged = {}
    for r in results:
        cid = r.get('claim_id')
        if cid not in merged:
            merged[cid] = {}
        merged[cid].update(r)

    for claim_id, scores in merged.items():
        fraud_score = scores.get('fraud_score', 1.0)
        intent_score = scores.get('intent_score', 0.0)

        try:
            claim = Claim.objects.get(id=claim_id)
        except Claim.DoesNotExist:
            continue

        claim.fraud_score = fraud_score
        claim.intent_score = intent_score

        if fraud_score < 0.4 and intent_score > 0.5:
            claim.status = 'approved'
            claim.approved_at = timezone.now()
            claim.save()
            logger.info(f'Claim {claim_id} APPROVED fraud={fraud_score:.2f} intent={intent_score:.2f}')
            calculate_payout.delay(claim_id)
        else:
            claim.status = 'rejected'
            claim.save()
            logger.info(
                f'Claim {claim_id} REJECTED fraud={fraud_score:.2f} intent={intent_score:.2f}'
            )


@shared_task(name='apps.claims.tasks.fraud_and_intent_check', bind=True)
def fraud_and_intent_check(self, claim_id: str):
    """
    Task 4: Celery chord — parallel fraud + intent tasks, then callback.
    """
    chord(
        [_fraud_check_task.s(claim_id), _intent_check_task.s(claim_id)],
        _fraud_intent_callback.s(),
    ).apply_async()

    # Notify WebSocket: fraud check started
    _push_ws_event(claim_id, 'fraud_check_started', {'claim_id': claim_id})


def _push_ws_event(claim_id: str, event_type: str, payload: dict):
    """Push a WebSocket event to the driver's claim channel."""
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        from apps.claims.models import Claim

        claim = Claim.objects.select_related('driver').get(id=claim_id)
        channel_layer = get_channel_layer()
        room = f"claim_{claim.driver_id}"
        async_to_sync(channel_layer.group_send)(
            room,
            {'type': event_type, 'payload': payload},
        )
    except Exception as e:
        logger.warning(f'WebSocket push failed for claim {claim_id}: {e}')


@shared_task(name='apps.claims.tasks.calculate_payout', bind=True)
def calculate_payout(self, claim_id: str):
    """
    Task 5: Called after claim is approved.

    Logic:
      base = plan.daily_payout_rate × plan.max_coverage_days
      extra_days = floor(wallet.balance / daily_payout_rate)
      total_days = min(max_coverage_days + extra_days, 7)
      wallet_used = min(wallet.balance, extra_days × daily_payout_rate)
      total = base + wallet_used

    Pool cap: if total event cost > 70% of zone.pool_balance → cap + queue rest.
    """
    from apps.claims.models import Claim
    from apps.policies.models import ReserveWallet
    from apps.payouts.models import Payout
    from django.db import transaction

    try:
        claim = Claim.objects.select_related(
            'policy__plan', 'driver__wallet', 'zone'
        ).get(id=claim_id)
    except Claim.DoesNotExist:
        logger.error(f'calculate_payout: Claim {claim_id} not found')
        return

    plan = claim.policy.plan
    zone = claim.zone

    try:
        wallet = claim.driver.wallet
    except ReserveWallet.DoesNotExist:
        wallet = None

    daily_rate = float(plan.daily_payout_rate)
    base_days = plan.max_coverage_days
    base_amount = daily_rate * base_days

    # Wallet extension
    wallet_balance = float(wallet.balance) if wallet else 0
    extra_days = floor(wallet_balance / daily_rate) if daily_rate > 0 else 0
    total_days = min(base_days + extra_days, 7)
    actual_extra_days = total_days - base_days
    wallet_used = min(wallet_balance, actual_extra_days * daily_rate)
    total_amount = base_amount + wallet_used

    # Pool cap: 70% of zone pool_balance for a single mass event
    pool_cap = float(zone.pool_balance) * 0.70
    # We accumulate all payouts for this event
    from apps.payouts.models import Payout as P
    event_total = sum(
        float(p.amount)
        for p in P.objects.filter(
            claim__edz_snapshot=claim.edz_snapshot
        ).exclude(status='failed')
    )

    if event_total + total_amount > pool_cap:
        # Cap this payout
        remaining_pool = pool_cap - event_total
        if remaining_pool <= 0:
            logger.warning(f'Pool cap reached for zone {zone.name}. Claim {claim_id} queued.')
            # Still create but mark for manual review — payout_task will handle
            total_amount = 0

    with transaction.atomic():
        claim.days_covered = total_days
        claim.base_payout_amount = base_amount
        claim.wallet_contribution = wallet_used
        claim.total_payout_amount = total_amount
        claim.save()

        # Deduct wallet
        if wallet and wallet_used > 0:
            wallet.balance -= wallet_used
            wallet.last_debited_at = timezone.now()
            wallet.save()

        # Determine batch number (200 per batch)
        batch_size = 200
        existing_in_event = P.objects.filter(
            claim__edz_snapshot=claim.edz_snapshot
        ).count()
        batch_number = (existing_in_event // batch_size) + 1

        payout = Payout.objects.create(
            claim=claim,
            driver=claim.driver,
            amount=total_amount,
            status='queued',
            batch_number=batch_number,
        )

    logger.info(
        f'calculate_payout: claim={claim_id} total=₹{total_amount} '
        f'wallet_used=₹{wallet_used} days={total_days} batch={batch_number}'
    )

    _push_ws_event(claim_id, 'claim_approved', {
        'claim_id': claim_id,
        'total_amount': str(total_amount),
        'days': total_days,
    })

    from apps.payouts.tasks import payout_task
    payout_task.delay(str(payout.id))
