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
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='queued')
    razorpay_transfer_id = models.CharField(max_length=100, null=True, blank=True)
    attempt_count = models.IntegerField(default=0)       # max 3
    queued_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    batch_number = models.IntegerField(default=1)        # 200 payouts per batch

    class Meta:
        app_label = 'payouts'
        ordering = ['-queued_at']

    def __str__(self):
        return (
            f"Payout ₹{self.amount} → {self.driver.name} "
            f"({self.get_status_display()}, attempt {self.attempt_count})"
        )
