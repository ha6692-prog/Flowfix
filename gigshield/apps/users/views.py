from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator

from .serializers import RegisterSerializer, LoginSerializer, DriverProfileSerializer
from .auth import get_tokens_for_driver


@method_decorator(ratelimit(key='ip', rate='5/h', method='POST', block=True), name='dispatch')
class RegisterView(APIView):
    """POST /api/auth/register/ — password-based driver registration."""
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        driver = serializer.save()
        tokens = get_tokens_for_driver(driver)
        return Response(
            {
                'message': 'Driver registered successfully. Welcome to GigShield.',
                'driver': {
                    'id': str(driver.id),
                    'name': driver.name,
                    'phone': driver.phone,
                },
                **tokens,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """POST /api/auth/login/ — phone + password → JWT tokens."""
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        driver = serializer.validated_data['driver']
        tokens = get_tokens_for_driver(driver)
        return Response(
            {
                'message': 'Login successful.',
                'driver': {
                    'id': str(driver.id),
                    'platform_id': driver.platform_id,
                    'name': driver.name,
                    'phone': driver.phone,
                    'months_active': driver.months_active,
                    'is_active': driver.is_active,
                    'zone': driver.zone.name if driver.zone else None,
                },
                **tokens,
            }
        )


class DriverProfileView(APIView):
    """GET /api/drivers/me/ — authenticated driver profile."""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        serializer = DriverProfileSerializer(request.user)
        return Response(serializer.data)
