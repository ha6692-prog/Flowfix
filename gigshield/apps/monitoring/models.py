from django.db import models


class WeatherSnapshot(models.Model):
    """
    Weather data from up to 3 sources (OWM, AccuWeather, IMD).
    consensus_confirmed is auto-set to True only when 2+ sources agree.
    EDZ trigger requires consensus_confirmed=True — never single-source.
    """
    zone = models.ForeignKey(
        'users.Zone', on_delete=models.CASCADE, related_name='weather_snapshots'
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    rainfall_mm = models.FloatField(default=0)
    wind_speed_ms = models.FloatField(default=0)
    aqi = models.FloatField(default=0)
    temperature_c = models.FloatField(default=25)
    source_owm = models.BooleanField(default=False)
    source_acw = models.BooleanField(default=False)
    source_imd = models.BooleanField(default=False)
    consensus_confirmed = models.BooleanField(default=False)  # auto-computed in save()

    class Meta:
        app_label = 'monitoring'
        ordering = ['-timestamp']
        get_latest_by = 'timestamp'

    def save(self, *args, **kwargs):
        source_count = sum([self.source_owm, self.source_acw, self.source_imd])
        self.consensus_confirmed = source_count >= 2
        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"Weather {self.zone.name} @ {self.timestamp:%H:%M} "
            f"rain={self.rainfall_mm}mm consensus={'✓' if self.consensus_confirmed else '✗'}"
        )


class EDZSnapshot(models.Model):
    """
    Extreme Disruption Zone score computed every 10 minutes per active zone.

    EDZ Formula:
        final_edz_score = (weather×0.30) + (order_drop×0.25)
                        + (peer_activity×0.20) + (driver_activity×0.15)
                        + (traffic×0.10)

    Trigger if: score >= 0.78 AND consensus_confirmed AND NOT shadow_only.
    shadow_only=True during calibration: log only, zero payouts.
    """
    zone = models.ForeignKey(
        'users.Zone', on_delete=models.CASCADE, related_name='edz_snapshots'
    )
    timestamp = models.DateTimeField(auto_now_add=True)

    # Component scores — each 0.0–1.0
    weather_score = models.FloatField(default=0)          # weight ×0.30
    order_drop_score = models.FloatField(default=0)       # weight ×0.25
    peer_activity_score = models.FloatField(default=0)    # weight ×0.20
    driver_activity_score = models.FloatField(default=0)  # weight ×0.15
    traffic_score = models.FloatField(default=0)          # weight ×0.10

    final_edz_score = models.FloatField(default=0)
    threshold_breached = models.BooleanField(default=False)
    shadow_only = models.BooleanField(default=True)       # SHADOW_MODE safety gate

    class Meta:
        app_label = 'monitoring'
        ordering = ['-timestamp']
        get_latest_by = 'timestamp'

    def calculate_and_set_score(self) -> float:
        self.final_edz_score = round(
            self.weather_score * 0.30
            + self.order_drop_score * 0.25
            + self.peer_activity_score * 0.20
            + self.driver_activity_score * 0.15
            + self.traffic_score * 0.10,
            4,
        )
        return self.final_edz_score

    def __str__(self):
        flag = '🌩' if self.threshold_breached else '🌤'
        mode = '[SHADOW]' if self.shadow_only else '[LIVE]'
        return f"EDZ {self.zone.name} {flag} {mode} score={self.final_edz_score:.3f}"
