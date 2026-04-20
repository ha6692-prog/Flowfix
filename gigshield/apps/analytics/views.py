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
            # Original public metrics
            paid_claims = Claim.objects.filter(status='paid')
            total_paid = paid_claims.aggregate(s=Sum('total_payout_amount'))['s'] or 0
            total_drivers_helped = paid_claims.values('driver').distinct().count()
            
            # Extended admin metrics
            all_drivers = Driver.objects.count()
            active_drivers = Driver.objects.filter(is_active=True).count()
            fraud_flags = Driver.objects.filter(is_active=False).count()
            
            total_claims = Claim.objects.count()
            pending_claims = Claim.objects.filter(status='pending').count()
            
            total_pool = Zone.objects.aggregate(s=Sum('pool_balance'))['s'] or 0
            loss_ratio = float(total_paid) / float(total_pool) if total_pool else 0.0

            data = {
                # New keys requested by Admin Dashboard
                'total_drivers': all_drivers,
                'active_drivers': active_drivers,
                'total_claims': total_claims,
                'total_paid_out': str(total_paid),
                'total_paid': str(total_paid),
                'total_pool': str(total_pool),
                'fraud_flags': fraud_flags,
                'pending_claims': pending_claims,
                'loss_ratio': round(loss_ratio, 3),

                # Old fallback keys
                'total_payout_amount': str(total_paid),
                'total_drivers_helped': total_drivers_helped,
                'total_active_drivers': active_drivers,
                'total_events_covered': paid_claims.count(),
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
        total_pool = zones.aggregate(s=Sum('pool_balance'))['s'] or 0
        for z in zones:
            result.append({
                'name': z.name,
                'zone': z.name,  # Keep for backward compatibility
                'city': z.city.name,
                'pool_balance': str(z.pool_balance),
                'max_cross_subsidy': str(z.max_cross_subsidy),
                'risk_score': z.risk_score,
                'active_driver_count': z.active_driver_count,
            })
        return Response({'zones': result, 'total_pool': str(total_pool)})
