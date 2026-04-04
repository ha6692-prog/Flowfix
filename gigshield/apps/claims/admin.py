from django.contrib import admin
from .models import Claim


@admin.register(Claim)
class ClaimAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'driver', 'zone', 'status', 'fraud_score', 'intent_score',
        'total_payout_amount', 'created_at', 'approved_at',
    )
    list_filter = ('status', 'cluster_fraud_flag', 'gps_spoof_flag', 'zone__city')
    search_fields = ('driver__name', 'driver__phone')
    date_hierarchy = 'created_at'
    readonly_fields = (
        'id', 'created_at', 'approved_at',
        'fraud_score', 'intent_score', 'cluster_fraud_flag', 'gps_spoof_flag',
        'base_payout_amount', 'wallet_contribution', 'total_payout_amount',
    )
