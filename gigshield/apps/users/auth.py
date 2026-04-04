"""
Custom JWT authentication backend for the Driver model.

Since Driver is not a Django AbstractUser, we embed driver_id in the token
payload and retrieve the Driver object here — making request.user a Driver
instance throughout the entire API.
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import exceptions


def get_tokens_for_driver(driver) -> dict:
    """Generate access + refresh JWT pair for a Driver instance."""
    refresh = RefreshToken()
    refresh['user_id'] = str(driver.id)  # For SimpleJWT internal .access_token generation
    refresh['driver_id'] = str(driver.id)
    refresh['phone'] = driver.phone
    refresh['name'] = driver.name
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class DriverJWTAuthentication(JWTAuthentication):
    """
    Validates a Bearer JWT, extracts driver_id from the payload,
    and returns the corresponding active Driver object as request.user.
    """

    def get_user(self, validated_token):
        from apps.users.models import Driver

        try:
            driver_id = validated_token['driver_id']
        except KeyError:
            raise InvalidToken('Token contained no driver_id claim')

        try:
            return Driver.objects.select_related('city', 'zone').get(
                id=driver_id, is_active=True
            )
        except Driver.DoesNotExist:
            raise exceptions.AuthenticationFailed(
                'Driver account not found or deactivated'
            )
