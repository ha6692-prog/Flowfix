import uuid
from django.db import models


class Claim(models.Model):
    """
    Auto-triggered when EDZ score >= 0.78 with consensus. Passes through
    parallel fraud+intent checks before approval and payout.
    Never uses the word 'insurance' — this is a 'driver support payout'.
    """
    STATUS_CHOICES = [
        ('pending_fraud_check', 'Pending Fraud Check'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('paid', 'Paid'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    driver = models.ForeignKey('users.Driver', on_delete=models.CASCADE, related_name='claims')
    policy = models.ForeignKey('policies.DriverPolicy', on_delete=models.CASCADE, related_name='claims')
    zone = models.ForeignKey('users.Zone', on_delete=models.CASCADE, related_name='claims')
    edz_snapshot = models.ForeignKey(
        'monitoring.EDZSnapshot', on_delete=models.SET_NULL, null=True, related_name='claims'
    )
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending_fraud_check')

    # Fraud/intent scores — set by Celery chord tasks
    fraud_score = models.FloatField(default=0)           # 0–1, lower = cleaner
    cluster_fraud_flag = models.BooleanField(default=False)
    gps_spoof_flag = models.BooleanField(default=False)
    intent_score = models.FloatField(default=0)          # 0–1, higher = genuine

    # Payout breakdown
    days_covered = models.IntegerField(default=0)
    base_payout_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    wallet_contribution = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_payout_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    # Missing schema alignment fields
    device_change_detected = models.BooleanField(default=False)
    fraud_decision = models.CharField(max_length=20, blank=True, null=True)
    fraud_vector = models.JSONField(default=dict)
    home_shelter_override = models.BooleanField(default=False)
    payout_multiplier = models.FloatField(default=1.0)
    score_multiplier = models.FloatField(default=1.0)
    tunnel_corridor_passed = models.BooleanField(default=False)

    class Meta:
        app_label = 'claims'
        ordering = ['-created_at']

    def __str__(self):
        return f"Support payout {self.id} — {self.driver.name} ({self.get_status_display()})"
