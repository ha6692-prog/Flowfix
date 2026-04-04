import uuid
from django.db import models
from django.utils import timezone
from django.contrib.auth.hashers import make_password, check_password as django_check_password


class City(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        app_label = 'users'
        verbose_name_plural = 'cities'

    def __str__(self):
        return self.name


class Zone(models.Model):
    name = models.CharField(max_length=100)
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='zones')
    pool_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    risk_score = models.FloatField(default=0.0)          # 0–1
    active_driver_count = models.IntegerField(default=0)
    max_cross_subsidy = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        app_label = 'users'
        unique_together = ('name', 'city')

    def save(self, *args, **kwargs):
        # max_cross_subsidy = 30 % of pool_balance — recalculated on every save
        self.max_cross_subsidy = self.pool_balance * 30 / 100
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.city.name})"


class Driver(models.Model):
    """
    Core driver identity record.
    Password is stored as Django PBKDF2 hash — never plain-text.
    Aadhaar and PAN stored as SHA-256 hex only — raw values never persisted.
    consent_given must be True before any save is allowed (enforced in serializer).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    platform_id = models.CharField(
        max_length=50, unique=True,
        help_text='Shared platform ID from Zomato / Swiggy / other gig platforms'
    )
    phone = models.CharField(max_length=15, unique=True)
    password = models.CharField(max_length=255)        # PBKDF2 hash
    name = models.CharField(max_length=200)
    city = models.ForeignKey(City, on_delete=models.SET_NULL, null=True, related_name='drivers')
    zone = models.ForeignKey(Zone, on_delete=models.SET_NULL, null=True, related_name='drivers')
    aadhaar_hash = models.CharField(max_length=64, unique=True)   # SHA-256 hex, 64 chars
    pan_hash = models.CharField(max_length=64, null=True, blank=True)
    device_fingerprint = models.CharField(max_length=512)         # locked at registration
    months_active = models.IntegerField(default=0)                # auto-calc monthly
    last_beacon_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    # DPDPA consent — must be True; enforced in serializer
    consent_given = models.BooleanField(default=False)
    consent_timestamp = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'users'

    # ── DRF / simplejwt compatibility ──────────────────────────────────────────
    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    # ── Password helpers ───────────────────────────────────────────────────────
    def set_password(self, raw_password: str):
        self.password = make_password(raw_password)

    def check_password(self, raw_password: str) -> bool:
        return django_check_password(raw_password, self.password)

    def __str__(self):
        return f"{self.name} ({self.phone})"


class DriverActivity(models.Model):
    NETWORK_CHOICES = [
        ('4G', '4G'),
        ('WiFi', 'WiFi'),
        ('3G', '3G'),
        ('offline', 'Offline'),
    ]

    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='activities')
    timestamp = models.DateTimeField(auto_now_add=True)
    gps_lat = models.FloatField()
    gps_lng = models.FloatField()
    # True if GPS moves without matching accelerometer data → spoof signal
    gps_spoofing_flag = models.BooleanField(default=False)
    accelerometer_active = models.BooleanField(default=False)
    gyro_active = models.BooleanField(default=False)
    network_type = models.CharField(max_length=10, choices=NETWORK_CHOICES, default='4G')
    app_in_foreground = models.BooleanField(default=True)

    class Meta:
        app_label = 'users'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['driver', 'timestamp']),
            models.Index(fields=['timestamp']),
        ]

    def __str__(self):
        return f"Beacon: {self.driver.name} @ {self.timestamp:%Y-%m-%d %H:%M}"
