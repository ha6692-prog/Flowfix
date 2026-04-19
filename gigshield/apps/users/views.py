from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator

from .serializers import RegisterSerializer, LoginSerializer, DriverProfileSerializer, SimpleRegisterSerializer
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


class DriverListView(APIView):
    """GET /api/drivers/admin/list/ — get list of all drivers for admin dashboard."""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        platform_id = (getattr(request.user, 'platform_id', '') or '').upper()
        if not platform_id.startswith('ADMIN-'):
            return Response(
                {'detail': 'You do not have permission to view driver list.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        from .models import Driver
        drivers = Driver.objects.all().order_by('-created_at')[:50]
        data = [{
            'id': str(d.id),
            'name': d.name,
            'platform_id': d.platform_id,
            'phone': d.phone,
            'months_active': d.months_active,
            'is_active': d.is_active,
            'zone': d.zone.name if d.zone else None,
            'created_at': d.created_at.isoformat()
        } for d in drivers]
        return Response({'drivers': data})



@method_decorator(ratelimit(key='ip', rate='5/h', method='POST', block=True), name='dispatch')
class SimpleRegisterView(APIView):
    """POST /api/auth/simple-register/ — simplified signup (name, platform_id, phone, password)."""
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = SimpleRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        driver = serializer.save()
        return Response(
            {
                'message': 'Account created successfully. You can now log in.',
                'driver': {
                    'id': str(driver.id),
                    'name': driver.name,
                    'platform_id': driver.platform_id,
                    'phone': driver.phone,
                },
            },
            status=status.HTTP_201_CREATED,
        )
