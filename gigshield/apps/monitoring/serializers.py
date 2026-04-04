from rest_framework import serializers
from .models import WeatherSnapshot, EDZSnapshot


class WeatherSnapshotSerializer(serializers.ModelSerializer):
    zone_name = serializers.CharField(source='zone.name', read_only=True)

    class Meta:
        model = WeatherSnapshot
        fields = (
            'id', 'zone_name', 'timestamp', 'rainfall_mm', 'wind_speed_ms',
            'aqi', 'temperature_c', 'consensus_confirmed',
        )


class EDZSnapshotSerializer(serializers.ModelSerializer):
    zone_name = serializers.CharField(source='zone.name', read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = EDZSnapshot
        fields = (
            'id', 'zone_name', 'timestamp', 'final_edz_score',
            'threshold_breached', 'shadow_only', 'status',
            'weather_score', 'order_drop_score', 'peer_activity_score',
            'driver_activity_score', 'traffic_score',
        )

    def get_status(self, obj):
        if obj.shadow_only:
            return 'calibration_mode'
        if obj.threshold_breached:
            return 'disruption_active'
        return 'normal'


class ActivityBeaconSerializer(serializers.Serializer):
    """Incoming beacon from driver device every 5 minutes."""
    gps_lat = serializers.FloatField()
    gps_lng = serializers.FloatField()
    gps_spoofing_flag = serializers.BooleanField(default=False)
    accelerometer_active = serializers.BooleanField(default=False)
    gyro_active = serializers.BooleanField(default=False)
    network_type = serializers.ChoiceField(
        choices=['4G', 'WiFi', '3G', 'offline'], default='4G'
    )
    app_in_foreground = serializers.BooleanField(default=True)
