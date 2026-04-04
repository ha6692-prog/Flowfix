from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Claim
from .serializers import ClaimSerializer, ActiveClaimSerializer


class MyClaimsView(APIView):
    """GET /api/claims/my-claims/ — paginated history of past driver support payouts."""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        claims = Claim.objects.filter(driver=request.user).select_related(
            'policy__plan', 'zone', 'edz_snapshot'
        ).prefetch_related('payouts')

        # Simple pagination
        page = int(request.query_params.get('page', 1))
        per_page = 10
        start = (page - 1) * per_page
        end = start + per_page
        total = claims.count()

        serializer = ClaimSerializer(claims[start:end], many=True)
        return Response({
            'count': total,
            'page': page,
            'total_pages': (total + per_page - 1) // per_page,
            'results': serializer.data,
        })


class ActiveClaimView(APIView):
    """
    GET /api/claims/active/
    Returns the current in-flight claim + WebSocket room token.
    Used by the /claim/active React screen.
    """
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        claim = (
            Claim.objects.filter(
                driver=request.user,
                status__in=['pending_fraud_check', 'approved'],
            )
            .select_related('policy__plan', 'zone', 'edz_snapshot')
            .prefetch_related('payouts')
            .order_by('-created_at')
            .first()
        )
        if not claim:
            return Response(
                {'detail': 'No active driver support payout in progress.'},
                status=404,
            )

        return Response(ActiveClaimSerializer(claim).data)
