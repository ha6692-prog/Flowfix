from django.urls import path, include
from rest_framework.routers import SimpleRouter
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.reverse import reverse
from rest_framework.permissions import AllowAny

from apps.users.views import RegisterView, LoginView, DriverProfileView, SimpleRegisterView, DriverListView
from apps.policies.views import PolicyPlanViewSet, ActivatePolicyView, MyPolicyView, CancelPolicyView
from apps.monitoring.views import ActivityBeaconView, ZoneEDZView
from apps.claims.views import MyClaimsView, ActiveClaimView
from apps.analytics.views import PoolHealthView, PublicStatsView

class APIRoot(APIView):
    """
    Main Index for GigShield Backend API.
    Provides a directory of all available endpoints.
    """
    permission_classes = [AllowAny]

    def get(self, request, format=None):
        return Response({
            'auth': {
                'register': reverse('auth-register', request=request),
                'simple_register': reverse('auth-simple-register', request=request),
                'login': reverse('auth-login', request=request),
                'refresh': reverse('token-refresh', request=request),
            },
            'driver': {
                'me': reverse('driver-me', request=request),
            },
            'policies': {
                'plans': reverse('policy-plan-list', request=request),
                'activate': reverse('policy-activate', request=request),
                'my_policy': reverse('my-policy', request=request),
                'cancel': reverse('policy-cancel', request=request),
            },
            'monitoring': {
                'beacon': reverse('activity-beacon', request=request),
                'zone_edz': reverse('zone-edz', request=request),
            },
            'claims': {
                'history': reverse('my-claims', request=request),
                'active': reverse('active-claim', request=request),
            },
            'analytics': {
                'pool_health': reverse('pool-health', request=request),
                'public_stats': reverse('public-stats', request=request),
            }
        })

router = SimpleRouter()
router.register(r'policies/plans', PolicyPlanViewSet, basename='policy-plan')

urlpatterns = [
    # ── API Root ─────────────────────────────────────────────────────────────
    path('', APIRoot.as_view(), name='api-root'),

    # ── Auth ──────────────────────────────────────────────────────────────────
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/simple-register/', SimpleRegisterView.as_view(), name='auth-simple-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),

    # ── Driver ────────────────────────────────────────────────────────────────
    path('drivers/me/', DriverProfileView.as_view(), name='driver-me'),
    path('drivers/admin/list/', DriverListView.as_view(), name='admin-driver-list'),

    # ── Policies ──────────────────────────────────────────────────────────────
    path('policies/activate/', ActivatePolicyView.as_view(), name='policy-activate'),
    path('policies/my-policy/', MyPolicyView.as_view(), name='my-policy'),
    path('policies/cancel/', CancelPolicyView.as_view(), name='policy-cancel'),

    # ── Monitoring ─────────────────────────────────────────────────────────────
    path('monitoring/beacon/', ActivityBeaconView.as_view(), name='activity-beacon'),
    path('monitoring/zone-edz/', ZoneEDZView.as_view(), name='zone-edz'),

    # ── Claims ────────────────────────────────────────────────────────────────
    path('claims/my-claims/', MyClaimsView.as_view(), name='my-claims'),
    path('claims/active/', ActiveClaimView.as_view(), name='active-claim'),

    # ── Wallet / Analytics ────────────────────────────────────────────────────
    path('dashboard/pool-health/', PoolHealthView.as_view(), name='pool-health'),
    path('stats/public/', PublicStatsView.as_view(), name='public-stats'),

    # ── Plan ViewSet (from router) ───────────────────────────────────────────
    path('', include(router.urls)),
]
