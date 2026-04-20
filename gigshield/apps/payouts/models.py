from django.db import models


class Payout(models.Model):
    """
    Staged payout: ₹50 instant signal via Razorpay Fund Transfer,
    remainder queued. Max 3 retry attempts with exponential backoff.
    Batched at 200 per batch during mass EDZ events.
    """
    STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('processing', 'Processing'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('retrying', 'Retrying'),
    ]

    claim = models.ForeignKey('claims.Claim', on_delete=models.CASCADE, related_name='payouts')
    driver = models.ForeignKey('users.Driver', on_delete=models.CASCADE, related_name='payouts')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='queued')
    gateway = models.CharField(max_length=20, default='razorpay')
    idempotency_key = models.CharField(max_length=128, unique=True, null=True)
    gateway_reference_id = models.CharField(max_length=100, null=True, blank=True)
    initiated_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.TextField(null=True, blank=True)
    meta = models.JSONField(default=dict)

    class Meta:
        app_label = 'payouts'
        db_table = 'payouts_payouttransaction'
        ordering = ['-initiated_at']

    def __str__(self):
        return (
            f"Payout ₹{self.amount} → {self.driver.name} "
            f"({self.get_status_display()}, attempt {self.attempt_count})"
        )
