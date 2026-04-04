"""
payouts/tasks.py

Task 6: payout_task
  - Instant ₹50 signal via Razorpay Fund Transfer
  - Queue remaining (countdown 7200s)
  - Max 3 attempts with exponential retry (60s / 300s / 900s)
  - On success: reclaim_blocked_until = now + 14 days, WebSocket event
  - On final failure: mark failed, Slack alert
"""
import logging
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def _razorpay_transfer(driver, amount_paise: int) -> str | None:
    """
    Execute Razorpay Fund Transfer. Returns transfer_id or None on failure.
    Amount is in paise (₹1 = 100 paise).
    """
    key_id = getattr(settings, 'RAZORPAY_KEY_ID', '')
    key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '')
    if not key_id or not key_secret:
        logger.warning('Razorpay credentials not configured — simulating transfer in dev mode')
        return f'sim_transfer_{driver.id}_{amount_paise}'

    try:
        import razorpay
        client = razorpay.Client(auth=(key_id, key_secret))
        transfer_data = {
            'account': driver.phone,  # In production: bank account / VPA
            'amount': amount_paise,
            'currency': 'INR',
            'notes': {
                'purpose': 'GigShield driver income cushion payout',
                'driver_id': str(driver.id),
            },
        }
        result = client.transfer.create(transfer_data)
        return result.get('id')
    except Exception as e:
        logger.error(f'Razorpay transfer failed: {e}')
        return None


def _send_slack_alert(message: str):
    """Send a Slack alert for critical payout failures."""
    slack_url = getattr(settings, 'SLACK_WEBHOOK_URL', '')
    if not slack_url:
        logger.warning(f'SLACK_ALERT (no webhook configured): {message}')
        return
    try:
        import requests
        requests.post(slack_url, json={'text': message}, timeout=5)
    except Exception as e:
        logger.error(f'Slack alert failed: {e}')


@shared_task(name='apps.payouts.tasks.payout_task', bind=True, max_retries=3)
def payout_task(self, payout_id: str):
    """
    Task 6: Execute payout with Razorpay Fund Transfer.

    Flow:
      1. Instant ₹50 signal transfer
      2. Queue remaining amount (countdown=7200s)
      3. On success: update status, set 14-day cooldown, push WS
      4. On failure: exponential retry then mark failed + Slack
    """
    from apps.payouts.models import Payout
    from apps.claims.models import Claim
    from apps.policies.models import DriverPolicy

    try:
        payout = Payout.objects.select_related('driver', 'claim').get(id=payout_id)
    except Payout.DoesNotExist:
        logger.error(f'Payout {payout_id} not found')
        return

    if payout.attempt_count >= 3:
        payout.status = 'failed'
        payout.save()
        _send_slack_alert(
            f'🚨 GigShield: Payout {payout_id} FAILED after 3 attempts. '
            f'Driver: {payout.driver.name} ({payout.driver.phone}). '
            f'Amount: ₹{payout.amount}'
        )
        return

    payout.status = 'processing'
    payout.attempt_count += 1
    payout.save()

    driver = payout.driver
    total_amount = float(payout.amount)

    # ── Step 1: Instant ₹50 signal ───────────────────────────────────────────
    INSTANT_SIGNAL = 50
    instant_paise = INSTANT_SIGNAL * 100

    if total_amount >= INSTANT_SIGNAL:
        transfer_id = _razorpay_transfer(driver, instant_paise)
        if not transfer_id:
            # Retry with exponential backoff
            retry_delays = [60, 300, 900]
            delay = retry_delays[min(payout.attempt_count - 1, 2)]
            payout.status = 'retrying'
            payout.save()

            _push_ws_event_payout(payout, 'payout_failed', {
                'attempt': payout.attempt_count,
                'retry_in_seconds': delay,
            })
            raise self.retry(countdown=delay)

        payout.razorpay_transfer_id = transfer_id
        payout.save()

        _push_ws_event_payout(payout, 'payout_queued', {
            'amount': str(payout.amount),
            'batch_number': payout.batch_number,
        })

    # ── Step 2: Queue remaining amount (7200s countdown) ─────────────────────
    remaining = total_amount - INSTANT_SIGNAL
    if remaining > 0:
        _process_remaining_payout.apply_async(
            args=[payout_id, remaining],
            countdown=7200,
        )
    else:
        _finalize_payout(payout)


@shared_task(name='apps.payouts.tasks._process_remaining_payout', bind=True)
def _process_remaining_payout(self, payout_id: str, remaining_amount: float):
    """Send remaining payout amount after 2-hour delay."""
    from apps.payouts.models import Payout
    try:
        payout = Payout.objects.select_related('driver').get(id=payout_id)
    except Payout.DoesNotExist:
        return

    paise = int(remaining_amount * 100)
    transfer_id = _razorpay_transfer(payout.driver, paise)

    if transfer_id:
        _finalize_payout(payout)
    else:
        payout.status = 'failed'
        payout.save()
        _send_slack_alert(
            f'🚨 GigShield: Remaining payout for {payout.driver.name} FAILED. '
            f'Payout ID: {payout_id}'
        )


def _finalize_payout(payout):
    """Mark payout success, set 14-day cooldown, push WebSocket event."""
    from apps.policies.models import DriverPolicy
    from apps.payouts.models import Payout

    payout.status = 'success'
    payout.processed_at = timezone.now()
    payout.save()

    # Update claim status
    payout.claim.status = 'paid'
    payout.claim.save()

    # 14-day reclaim cooldown
    cooldown_until = timezone.now() + timedelta(days=14)
    try:
        policy = DriverPolicy.objects.get(driver=payout.driver, is_active=True)
        policy.reclaim_blocked_until = cooldown_until
        policy.last_claim_at = timezone.now()
        policy.save()
    except DriverPolicy.DoesNotExist:
        pass

    _push_ws_event_payout(payout, 'payout_success', {
        'amount': str(payout.amount),
        'razorpay_id': payout.razorpay_transfer_id,
    })

    logger.info(
        f'Payout {payout.id} SUCCESS — ₹{payout.amount} to {payout.driver.name}. '
        f'Cooldown until {cooldown_until.strftime("%d %b %Y")}'
    )


def _push_ws_event_payout(payout, event_type: str, payload: dict):
    """Push WebSocket event for payout state changes."""
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        channel_layer = get_channel_layer()
        room = f"claim_{payout.driver_id}"
        async_to_sync(channel_layer.group_send)(
            room,
            {'type': event_type, 'payload': payload},
        )
    except Exception as e:
        logger.warning(f'WebSocket push (payout) failed: {e}')
