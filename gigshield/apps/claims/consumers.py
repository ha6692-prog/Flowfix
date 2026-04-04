"""
claims/consumers.py — Django Channels WebSocket consumer.

URL: ws://domain/ws/claim/{driver_id}/
Auth: JWT token passed as query param ?token=<access_token>

Events pushed to driver:
  claim_created        → {claim_id, zone, edz_score}
  fraud_check_started  → {claim_id}
  claim_approved       → {claim_id, total_amount, days}
  payout_queued        → {amount, batch_number}
  payout_success       → {amount, razorpay_id}
  payout_failed        → {attempt, retry_in_seconds}
"""
import json
import logging

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)


class ClaimConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time claim status updates.
    Room name: claim_{driver_id}
    """

    async def connect(self):
        self.driver_id = self.scope['url_route']['kwargs']['driver_id']
        self.room_name = f'claim_{self.driver_id}'

        # Authenticate via JWT token in query string
        token = self._extract_token()
        if not token:
            await self.close(code=4001)
            return

        driver = await self._authenticate(token)
        if not driver:
            await self.close(code=4003)
            return

        # Verify driver can only join their own room
        if str(driver.id) != self.driver_id:
            await self.close(code=4004)
            return

        await self.channel_layer.group_add(self.room_name, self.channel_name)
        await self.accept()

        logger.info(f'WS connect: {driver.name} joined room {self.room_name}')
        await self.send(text_data=json.dumps({
            'type': 'connected',
            'payload': {'room': self.room_name, 'driver': str(driver.id)},
        }))

    async def disconnect(self, close_code):
        if hasattr(self, 'room_name'):
            await self.channel_layer.group_discard(self.room_name, self.channel_name)
            logger.info(f'WS disconnect: room={self.room_name} code={close_code}')

    async def receive(self, text_data):
        # Clients only receive — no inbound messages handled
        pass

    # ── Event handlers ─────────────────────────────────────────────────────────

    async def claim_created(self, event):
        await self.send(text_data=json.dumps({
            'type': 'claim_created',
            'payload': event['payload'],
        }))

    async def fraud_check_started(self, event):
        await self.send(text_data=json.dumps({
            'type': 'fraud_check_started',
            'payload': event['payload'],
        }))

    async def claim_approved(self, event):
        await self.send(text_data=json.dumps({
            'type': 'claim_approved',
            'payload': event['payload'],
        }))

    async def payout_queued(self, event):
        await self.send(text_data=json.dumps({
            'type': 'payout_queued',
            'payload': event['payload'],
        }))

    async def payout_success(self, event):
        await self.send(text_data=json.dumps({
            'type': 'payout_success',
            'payload': event['payload'],
        }))

    async def payout_failed(self, event):
        await self.send(text_data=json.dumps({
            'type': 'payout_failed',
            'payload': event['payload'],
        }))

    # ── Helpers ────────────────────────────────────────────────────────────────

    def _extract_token(self) -> str | None:
        """Extract JWT from query string: ?token=<access_token>"""
        query_string = self.scope.get('query_string', b'').decode()
        for pair in query_string.split('&'):
            if pair.startswith('token='):
                return pair[6:]
        return None

    @database_sync_to_async
    def _authenticate(self, token: str):
        """Validate JWT and return Driver or None."""
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            from apps.users.models import Driver

            decoded = AccessToken(token)
            driver_id = decoded.get('driver_id')
            if not driver_id:
                return None
            return Driver.objects.get(id=driver_id, is_active=True)
        except Exception as e:
            logger.warning(f'WS auth failed: {e}')
            return None
