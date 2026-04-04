from django.contrib import admin
from .models import PolicyPlan, DriverPolicy, ReserveWallet


@admin.register(PolicyPlan)
class PolicyPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'weekly_premium', 'daily_payout_rate', 'max_coverage_days', 'seasonal_multiplier')
    list_editable = ('seasonal_multiplier',)


@admin.register(DriverPolicy)
class DriverPolicyAdmin(admin.ModelAdmin):
    list_display = ('driver', 'plan', 'is_active', 'activated_at', 'last_claim_at', 'reclaim_blocked_until')
    list_filter = ('is_active', 'plan')
    search_fields = ('driver__name', 'driver__phone')
    readonly_fields = ('activated_at',)


@admin.register(ReserveWallet)
class ReserveWalletAdmin(admin.ModelAdmin):
    list_display = ('driver', 'tier', 'balance', 'total_ever_earned', 'last_credited_at', 'forfeited_on_cancel')
    list_filter = ('tier', 'forfeited_on_cancel')
    search_fields = ('driver__name', 'driver__phone')
    readonly_fields = ('total_ever_earned', 'last_credited_at', 'last_debited_at')
