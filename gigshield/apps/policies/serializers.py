from rest_framework import serializers
from django.utils import timezone
from .models import PolicyPlan, DriverPolicy, ReserveWallet


class PolicyPlanSerializer(serializers.ModelSerializer):
    """
    List endpoint — includes computed effective_weekly_premium
    that applies the seasonal_multiplier for Jun–Oct.
    Never uses the word 'insurance'.
    """
    effective_weekly_premium = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()

    class Meta:
        model = PolicyPlan
        fields = (
            'id', 'name', 'weekly_premium', 'effective_weekly_premium',
            'daily_payout_rate', 'max_coverage_days',
            'seasonal_multiplier', 'platform_cofund_optional',
            'description',
        )

    def get_effective_weekly_premium(self, obj):
        return round(float(obj.weekly_premium) * obj.seasonal_multiplier, 2)

    def get_description(self, obj):
        descriptions = {
            'Basic': 'Essential income cushion for up to 3 bad weather days.',
            'Standard': 'Enhanced driver support — 5 days of income protection.',
            'Full': 'Maximum protection fund — 7 days coverage + reserve wallet bonus.',
        }
        return descriptions.get(obj.name, '')


class ReserveWalletSerializer(serializers.ModelSerializer):
    weekly_credit = serializers.SerializerMethodField()
    extra_days_available = serializers.SerializerMethodField()
    next_tier = serializers.SerializerMethodField()

    class Meta:
        model = ReserveWallet
        fields = (
            'balance', 'total_ever_earned', 'tier',
            'weekly_credit', 'extra_days_available',
            'last_credited_at', 'next_tier',
        )

    def get_weekly_credit(self, obj):
        return obj.get_weekly_credit()

    def get_extra_days_available(self, obj):
        plan = getattr(obj.driver, 'policy', None)
        if not plan:
            return 0
        return obj.extra_days_available(plan.plan.daily_payout_rate)

    def get_next_tier(self, obj):
        tier_order = ['bronze', 'silver', 'gold', 'platinum']
        idx = tier_order.index(obj.tier)
        if idx < len(tier_order) - 1:
            next_t = tier_order[idx + 1]
            thresholds = {'silver': 4, 'gold': 7, 'platinum': 12}
            return {'tier': next_t, 'months_needed': thresholds.get(next_t, 0)}
        return None


class MyPolicySerializer(serializers.ModelSerializer):
    plan = PolicyPlanSerializer(read_only=True)
    wallet = ReserveWalletSerializer(source='driver.wallet', read_only=True)
    cooldown_active = serializers.SerializerMethodField()
    cooldown_ends_at = serializers.DateTimeField(source='reclaim_blocked_until', read_only=True)

    class Meta:
        model = DriverPolicy
        fields = (
            'id', 'plan', 'is_active', 'activated_at', 'last_premium_paid_at',
            'last_claim_at', 'cooldown_active', 'cooldown_ends_at', 'wallet',
        )

    def get_cooldown_active(self, obj):
        return obj.is_cooldown_active()


class ActivatePolicySerializer(serializers.Serializer):
    plan_id = serializers.IntegerField()

    def validate(self, data):
        driver = self.context['request'].user

        # One active policy per driver
        if DriverPolicy.objects.filter(driver=driver, is_active=True).exists():
            raise serializers.ValidationError(
                'You already have an active protection fund. Cancel it before selecting a new plan.'
            )

        # One policy per aadhaar_hash (across all drivers, in case of dupe)
        from apps.users.models import Driver
        same_aadhaar = Driver.objects.filter(aadhaar_hash=driver.aadhaar_hash).first()
        if same_aadhaar and hasattr(same_aadhaar, 'policy') and same_aadhaar.policy.is_active:
            if same_aadhaar.pk != driver.pk:
                raise serializers.ValidationError(
                    'A protection fund already exists for this identity document.'
                )

        try:
            plan = PolicyPlan.objects.get(id=data['plan_id'])
        except PolicyPlan.DoesNotExist:
            raise serializers.ValidationError('Selected plan does not exist.')

        data['plan'] = plan
        data['driver'] = driver
        return data

    def create(self, validated_data):
        driver = validated_data['driver']
        plan = validated_data['plan']

        policy = DriverPolicy.objects.create(driver=driver, plan=plan)
        ReserveWallet.objects.create(driver=driver)
        return policy


class CancelPolicySerializer(serializers.Serializer):
    def validate(self, data):
        driver = self.context['request'].user
        try:
            policy = DriverPolicy.objects.get(driver=driver, is_active=True)
        except DriverPolicy.DoesNotExist:
            raise serializers.ValidationError('No active protection fund found.')

        if policy.is_cooldown_active():
            raise serializers.ValidationError(
                f'Cancellation is blocked until {policy.reclaim_blocked_until.strftime("%d %b %Y %H:%M")} '
                f'(14-day post-payout lock is active).'
            )

        data['policy'] = policy
        data['driver'] = driver
        return data

    def save(self):
        driver = self.validated_data['driver']
        policy = self.validated_data['policy']
        policy.is_active = False
        policy.save()

        # Forfeit wallet balance → zone pool
        try:
            wallet = driver.wallet
            if wallet.balance > 0:
                zone = driver.zone
                zone.pool_balance += wallet.balance
                zone.save()
                wallet.balance = 0
                wallet.forfeited_on_cancel = True
                wallet.save()
        except ReserveWallet.DoesNotExist:
            pass

        return policy
