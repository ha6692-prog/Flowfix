import hashlib
import uuid
from django.utils import timezone
from rest_framework import serializers
from .models import City, Zone, Driver, DriverActivity


class CitySerializer(serializers.ModelSerializer):
    class Meta:
        model = City
        fields = ('id', 'name')


class ZoneSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source='city.name', read_only=True)

    class Meta:
        model = Zone
        fields = ('id', 'name', 'city_name', 'pool_balance', 'risk_score', 'active_driver_count')


class RegisterSerializer(serializers.Serializer):
    """
    Password-based driver registration.
    Aadhaar/PAN arrive as SHA-256 hex strings (hashed client-side).
    consent_given must be True — blocks save otherwise (DPDPA).
    device_fingerprint is captured on mount and locked forever.
    """
    phone = serializers.CharField(max_length=15)
    password = serializers.CharField(write_only=True, min_length=6)
    name = serializers.CharField(max_length=200)
    city_id = serializers.IntegerField()
    zone_id = serializers.IntegerField()
    # SHA-256 hex only — raw Aadhaar/PAN never sent or stored
    aadhaar_hash = serializers.CharField(max_length=64, min_length=64)
    pan_hash = serializers.CharField(max_length=64, required=False, allow_blank=True)
    device_fingerprint = serializers.CharField(max_length=512)
    consent_given = serializers.BooleanField()

    def validate_consent_given(self, value):
        if not value:
            raise serializers.ValidationError(
                'DPDPA consent is required to register. You must agree to data usage terms.'
            )
        return value

    def validate_phone(self, value):
        if Driver.objects.filter(phone=value).exists():
            raise serializers.ValidationError('A driver with this phone number already exists.')
        return value

    def validate_aadhaar_hash(self, value):
        if Driver.objects.filter(aadhaar_hash=value).exists():
            raise serializers.ValidationError(
                'An account already exists linked to this identity document.'
            )
        return value

    def validate_device_fingerprint(self, value):
        """Flag if device is linked to another driver (potential fraud)."""
        existing = Driver.objects.filter(device_fingerprint=value)
        if existing.exists():
            # Auto-flag all existing drivers on the same device as suspicious
            existing.update(is_active=False)
            raise serializers.ValidationError(
                'This device is already registered to another driver account. '
                'Both accounts have been flagged for review.'
            )
        return value

    def validate_city_id(self, value):
        from .models import City
        if not City.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError('Invalid or inactive city.')
        return value

    def validate_zone_id(self, value):
        zone_id = value
        city_id = self.initial_data.get('city_id')
        if not Zone.objects.filter(id=zone_id, city_id=city_id).exists():
            raise serializers.ValidationError('Zone does not belong to the selected city.')
        return value

    def create(self, validated_data):
        driver = Driver(
            phone=validated_data['phone'],
            name=validated_data['name'],
            city_id=validated_data['city_id'],
            zone_id=validated_data['zone_id'],
            aadhaar_hash=validated_data['aadhaar_hash'],
            pan_hash=validated_data.get('pan_hash') or None,
            device_fingerprint=validated_data['device_fingerprint'],
            consent_given=True,
            consent_timestamp=timezone.now(),
        )
        driver.set_password(validated_data['password'])
        driver.save()
        return driver


class LoginSerializer(serializers.Serializer):
    platform_id = serializers.CharField(max_length=50)
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        try:
            driver = Driver.objects.get(platform_id=data['platform_id'])
        except Driver.DoesNotExist:
            raise serializers.ValidationError({'non_field_errors': ['Invalid Platform ID or password.']})

        if not driver.is_active:
            raise serializers.ValidationError({'non_field_errors': ['This account has been deactivated.']})

        if not driver.check_password(data['password']):
            raise serializers.ValidationError({'non_field_errors': ['Invalid Platform ID or password.']})

        data['driver'] = driver
        return data


class DriverProfileSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source='city.name', read_only=True)
    zone_name = serializers.CharField(source='zone.name', read_only=True)

    class Meta:
        model = Driver
        fields = (
            'id', 'phone', 'name', 'city_name', 'zone_name',
            'months_active', 'last_beacon_at', 'is_active', 'created_at',
        )
        read_only_fields = fields


class ActivityBeaconSerializer(serializers.ModelSerializer):
    class Meta:
        model = DriverActivity
        fields = (
            'gps_lat', 'gps_lng', 'gps_spoofing_flag',
            'accelerometer_active', 'gyro_active',
            'network_type', 'app_in_foreground',
        )

    def create(self, validated_data):
        driver = self.context['request'].user
        activity = DriverActivity.objects.create(driver=driver, **validated_data)
        # Update driver's last beacon timestamp
        Driver.objects.filter(pk=driver.pk).update(last_beacon_at=timezone.now())
        return activity


class SimpleRegisterSerializer(serializers.Serializer):
    """
    Simplified driver registration for the signup page.
    Only requires: name, platform_id, phone, password.
    Auto-fills aadhaar_hash, device_fingerprint, city/zone, consent.
    """
    name = serializers.CharField(max_length=200)
    platform_id = serializers.CharField(max_length=50)
    phone = serializers.CharField(max_length=15)
    password = serializers.CharField(write_only=True, min_length=6)

    def validate_platform_id(self, value):
        if Driver.objects.filter(platform_id=value).exists():
            raise serializers.ValidationError('A driver with this Platform ID already exists.')
        return value

    def validate_phone(self, value):
        if Driver.objects.filter(phone=value).exists():
            raise serializers.ValidationError('A driver with this phone number already exists.')
        return value

    def create(self, validated_data):
        from .models import City, Zone
        # Auto-pick first active city and its first zone
        city = City.objects.filter(is_active=True).first()
        zone = Zone.objects.filter(city=city).first() if city else None

        # Deterministic aadhaar hash from phone + platform_id (test only)
        raw = f"{validated_data['phone']}_{validated_data['platform_id']}_SIGNUP"
        aadhaar_hash = hashlib.sha256(raw.encode()).hexdigest()

        driver = Driver(
            name=validated_data['name'],
            platform_id=validated_data['platform_id'],
            phone=validated_data['phone'],
            city=city,
            zone=zone,
            aadhaar_hash=aadhaar_hash,
            device_fingerprint=f'signup_{uuid.uuid4().hex}',
            is_active=True,
            consent_given=True,
            consent_timestamp=timezone.now(),
        )
        driver.set_password(validated_data['password'])
        driver.save()
        return driver
