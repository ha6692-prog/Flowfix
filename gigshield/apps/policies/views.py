from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from .models import PolicyPlan, DriverPolicy, ReserveWallet
from .serializers import (
    PolicyPlanSerializer, MyPolicySerializer,
    ActivatePolicySerializer, CancelPolicySerializer,
)


class PolicyPlanViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/policies/plans/ — list all plans (no auth required)."""
    queryset = PolicyPlan.objects.all().order_by('weekly_premium')
    serializer_class = PolicyPlanSerializer
    permission_classes = (AllowAny,)


class ActivatePolicyView(APIView):
    """POST /api/policies/activate/ — enroll in a protection fund plan."""
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        serializer = ActivatePolicySerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        policy = serializer.save()
        return Response(
            {
                'message': 'Protection fund activated. Your income cushion is now live.',
                'policy_id': policy.id,
                'plan': policy.plan.name,
                'activated_at': policy.activated_at,
            },
            status=status.HTTP_201_CREATED,
        )


class MyPolicyView(APIView):
    """GET /api/policies/my-policy/ — current policy + wallet + next credit."""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        try:
            policy = DriverPolicy.objects.select_related('plan', 'driver__wallet').get(
                driver=request.user, is_active=True
            )
        except DriverPolicy.DoesNotExist:
            return Response(
                {'detail': 'No active protection fund found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        from django.utils import timezone
        import datetime

        # Next Monday credit countdown
        now = timezone.now()
        days_until_monday = (7 - now.weekday()) % 7 or 7
        next_monday = now + datetime.timedelta(days=days_until_monday)
        next_monday = next_monday.replace(hour=0, minute=0, second=0, microsecond=0)

        serializer = MyPolicySerializer(policy)
        data = serializer.data
        data['next_credit_at'] = next_monday
        data['next_credit_amount'] = (
            request.user.wallet.get_weekly_credit()
            if hasattr(request.user, 'wallet') else 0
        )
        return Response(data)


class CancelPolicyView(APIView):
    """POST /api/policies/cancel/ — cancel and forfeit wallet to zone pool."""
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        serializer = CancelPolicySerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                'message': (
                    'Protection fund cancelled. Your reserve wallet balance has been '
                    'returned to the zone pool to support other drivers.'
                )
            }
        )
