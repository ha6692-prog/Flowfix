from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from django.utils import timezone

from apps.users.models import DriverActivity, Driver
from .models import WeatherSnapshot, EDZSnapshot
from .serializers import EDZSnapshotSerializer, ActivityBeaconSerializer


@method_decorator(ratelimit(key='user', rate='60/m', method='POST', block=True), name='dispatch')
class ActivityBeaconView(APIView):
    """
    POST /api/monitoring/beacon/
    Rate-limited: 60/min per user. Accepts sensor telemetry from the driver app.
    GPS spoofing heuristic: flag if GPS changed but accelerometer inactive.
    """
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        serializer = ActivityBeaconSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        driver = request.user

        # GPS spoof heuristic: position changed but no accelerometer
        gps_spoof = data.get('gps_spoofing_flag', False)
        if not gps_spoof:
            last_activity = DriverActivity.objects.filter(driver=driver).first()
            if last_activity:
                lat_diff = abs(data['gps_lat'] - last_activity.gps_lat)
                lng_diff = abs(data['gps_lng'] - last_activity.gps_lng)
                moved = lat_diff > 0.001 or lng_diff > 0.001
                if moved and not data.get('accelerometer_active', False):
                    data['gps_spoofing_flag'] = True

        activity = DriverActivity.objects.create(driver=driver, **data)
        Driver.objects.filter(pk=driver.pk).update(last_beacon_at=timezone.now())

        return Response({'status': 'beacon_recorded', 'timestamp': activity.timestamp})


class ZoneEDZView(APIView):
    """GET /api/monitoring/zone-edz/ — latest EDZ snapshot for driver's zone."""
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        driver = request.user
        if not driver.zone:
            return Response({'detail': 'No zone assigned.'}, status=404)

        snapshot = (
            EDZSnapshot.objects.filter(zone=driver.zone)
            .order_by('-timestamp')
            .first()
        )
        if not snapshot:
            return Response({'detail': 'No EDZ data yet for your zone.'}, status=404)

        return Response(EDZSnapshotSerializer(snapshot).data)
