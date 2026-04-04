from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.core.cache import cache
from django.db.models import Sum, Count

from apps.claims.models import Claim
from apps.users.models import Zone, Driver


class PublicStatsView(APIView):
    """
    GET /api/stats/public/ — no auth required.
    Live trust counter: total paid + total drivers helped.
    Cached 30 seconds to avoid hammering DB on 30s frontend polls.
    """
    permission_classes = (AllowAny,)

    def get(self, request):
        cache_key = 'public_stats_v1'
        data = cache.get(cache_key)
        if not data:
            paid_claims = Claim.objects.filter(status='paid')
            total_paid = paid_claims.aggregate(s=Sum('total_payout_amount'))['s'] or 0
            total_drivers_helped = paid_claims.values('driver').distinct().count()
            total_drivers = Driver.objects.filter(is_active=True).count()
            total_events = paid_claims.count()

            data = {
                'total_payout_amount': str(total_paid),
                'total_drivers_helped': total_drivers_helped,
                'total_active_drivers': total_drivers,
                'total_events_covered': total_events,
                'platform': 'GigShield — Driver Income Protection Fund',
            }
            cache.set(cache_key, data, timeout=30)

        return Response(data)


class PoolHealthView(APIView):
    """
    GET /api/dashboard/pool-health/
    Per-zone pool balance and driver counts — JWT required.
    """
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        zones = Zone.objects.select_related('city').filter(city__is_active=True)
        result = []
        for z in zones:
            result.append({
                'zone': z.name,
                'city': z.city.name,
                'pool_balance': str(z.pool_balance),
                'max_cross_subsidy': str(z.max_cross_subsidy),
                'risk_score': z.risk_score,
                'active_driver_count': z.active_driver_count,
            })
        return Response({'zones': result})
