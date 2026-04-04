from django.contrib import admin
from .models import WeatherSnapshot, EDZSnapshot


@admin.register(WeatherSnapshot)
class WeatherSnapshotAdmin(admin.ModelAdmin):
    list_display = ('zone', 'timestamp', 'rainfall_mm', 'wind_speed_ms', 'aqi', 'consensus_confirmed')
    list_filter = ('consensus_confirmed', 'zone__city', 'source_owm', 'source_acw', 'source_imd')
    date_hierarchy = 'timestamp'
    readonly_fields = ('timestamp', 'consensus_confirmed')


@admin.register(EDZSnapshot)
class EDZSnapshotAdmin(admin.ModelAdmin):
    list_display = (
        'zone', 'timestamp', 'final_edz_score',
        'threshold_breached', 'shadow_only',
    )
    list_filter = ('threshold_breached', 'shadow_only', 'zone__city')
    date_hierarchy = 'timestamp'
    readonly_fields = (
        'timestamp', 'final_edz_score', 'threshold_breached',
        'weather_score', 'order_drop_score', 'peer_activity_score',
        'driver_activity_score', 'traffic_score',
    )
