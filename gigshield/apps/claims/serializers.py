from rest_framework import serializers
from .models import Claim


class ClaimSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source='policy.plan.name', read_only=True)
    zone_name = serializers.CharField(source='zone.name', read_only=True)
    edz_score = serializers.FloatField(source='edz_snapshot.final_edz_score', read_only=True)

    class Meta:
        model = Claim
        fields = (
            'id', 'plan_name', 'zone_name', 'edz_score', 'status',
            'fraud_score', 'cluster_fraud_flag', 'gps_spoof_flag', 'intent_score',
            'days_covered', 'base_payout_amount', 'wallet_contribution',
            'total_payout_amount', 'created_at', 'approved_at',
        )
        read_only_fields = fields


class ActiveClaimSerializer(serializers.ModelSerializer):
    """
    Shows the live claim + WebSocket room token for the driver's
    real-time progress screen.
    """
    plan_name = serializers.CharField(source='policy.plan.name', read_only=True)
    zone_name = serializers.CharField(source='zone.name', read_only=True)
    edz_score = serializers.FloatField(source='edz_snapshot.final_edz_score', read_only=True)
    ws_room = serializers.SerializerMethodField()
    stage = serializers.SerializerMethodField()
    payout_detail = serializers.SerializerMethodField()

    class Meta:
        model = Claim
        fields = (
            'id', 'plan_name', 'zone_name', 'edz_score', 'status', 'stage',
            'days_covered', 'base_payout_amount', 'wallet_contribution',
            'total_payout_amount', 'created_at', 'approved_at',
            'ws_room', 'payout_detail',
        )

    def get_ws_room(self, obj):
        return f"claim_{obj.driver_id}"

    def get_stage(self, obj):
        stage_map = {
            'pending_fraud_check': 1,
            'approved': 2,
            'rejected': 0,
            'paid': 4,
        }
        return stage_map.get(obj.status, 0)

    def get_payout_detail(self, obj):
        latest_payout = obj.payouts.order_by('-queued_at').first()
        if not latest_payout:
            return None
        return {
            'status': latest_payout.status,
            'amount': str(latest_payout.amount),
            'razorpay_id': latest_payout.razorpay_transfer_id,
            'attempt_count': latest_payout.attempt_count,
            'batch_number': latest_payout.batch_number,
        }
