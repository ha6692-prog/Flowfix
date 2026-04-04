from django.contrib import admin
from .models import Payout


@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'driver', 'amount', 'status', 'attempt_count',
        'batch_number', 'razorpay_transfer_id', 'queued_at', 'processed_at',
    )
    list_filter = ('status', 'batch_number')
    search_fields = ('driver__name', 'driver__phone', 'razorpay_transfer_id')
    date_hierarchy = 'queued_at'
    readonly_fields = ('queued_at', 'processed_at', 'razorpay_transfer_id', 'attempt_count')
