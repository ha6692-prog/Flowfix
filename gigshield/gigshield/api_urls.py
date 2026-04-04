from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from apps.users.views import RegisterView, LoginView, DriverProfileView
from apps.policies.views import PolicyPlanViewSet, ActivatePolicyView, MyPolicyView, CancelPolicyView
from apps.monitoring.views import ActivityBeaconView, ZoneEDZView
from apps.claims.views import MyClaimsView, ActiveClaimView
from apps.analytics.views import PoolHealthView, PublicStatsView

router = DefaultRouter()
router.register(r'policies/plans', PolicyPlanViewSet, basename='policy-plan')

urlpatterns = [
    # ── Auth ──────────────────────────────────────────────────────────────────
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),

    # ── Driver ────────────────────────────────────────────────────────────────
    path('drivers/me/', DriverProfileView.as_view(), name='driver-me'),

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

    # ── DRF Router ────────────────────────────────────────────────────────────
    path('', include(router.urls)),
]
