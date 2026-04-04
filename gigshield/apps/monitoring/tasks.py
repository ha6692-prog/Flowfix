"""
monitoring/tasks.py

Tasks 1 & 2 from the spec:
  1. weather_fetch_task  — every 5 min (OWM + AccuWeather, attempt IMD)
  2. edz_engine_task     — every 10 min, triggers auto_trigger_claim if score >= 0.78
  3. purge_old_activity_task — daily 02:00 (DPDPA retention)
"""
import logging
import requests
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def _fetch_owm(zone) -> dict | None:
    """Fetch weather from OpenWeatherMap for a zone's city."""
    api_key = settings.OWM_API_KEY
    if not api_key:
        return None
    try:
        url = 'https://api.openweathermap.org/data/2.5/weather'
        params = {'q': zone.city.name + ',IN', 'appid': api_key, 'units': 'metric'}
        resp = requests.get(url, params=params, timeout=8)
        resp.raise_for_status()
        d = resp.json()
        rain = d.get('rain', {}).get('1h', 0)
        return {
            'rainfall_mm': rain,
            'wind_speed_ms': d['wind']['speed'],
            'temperature_c': d['main']['temp'],
            'aqi': 0,  # OWM basic endpoint has no AQI
        }
    except Exception as e:
        logger.warning(f'OWM fetch failed for zone {zone.name}: {e}')
        return None


def _fetch_acw(zone) -> dict | None:
    """Fetch weather from AccuWeather for a zone's city."""
    api_key = settings.ACW_API_KEY
    if not api_key:
        return None
    try:
        # Step 1: location key
        loc_url = 'http://dataservice.accuweather.com/locations/v1/cities/search'
        loc_resp = requests.get(
            loc_url,
            params={'apikey': api_key, 'q': zone.city.name},
            timeout=8,
        )
        loc_resp.raise_for_status()
        locations = loc_resp.json()
        if not locations:
            return None
        loc_key = locations[0]['Key']

        # Step 2: current conditions
        cond_url = f'http://dataservice.accuweather.com/currentconditions/v1/{loc_key}'
        cond_resp = requests.get(
            cond_url,
            params={'apikey': api_key, 'details': True},
            timeout=8,
        )
        cond_resp.raise_for_status()
        cond = cond_resp.json()[0]
        return {
            'rainfall_mm': cond.get('Precip1hr', {}).get('Metric', {}).get('Value', 0),
            'wind_speed_ms': cond.get('Wind', {}).get('Speed', {}).get('Metric', {}).get('Value', 0),
            'temperature_c': cond.get('Temperature', {}).get('Metric', {}).get('Value', 25),
            'aqi': 0,
        }
    except Exception as e:
        logger.warning(f'AccuWeather fetch failed for zone {zone.name}: {e}')
        return None


def _fetch_imd(zone) -> dict | None:
    """Attempt IMD data — non-critical, do NOT halt if down."""
    api_key = getattr(settings, 'IMD_API_KEY', '')
    if not api_key:
        return None
    try:
        resp = requests.get(
            'https://api.imd.gov.in/current',
            params={'city': zone.city.name, 'key': api_key},
            timeout=6,
        )
        resp.raise_for_status()
        d = resp.json()
        return {
            'rainfall_mm': d.get('rainfall_mm', 0),
            'wind_speed_ms': d.get('wind_speed_ms', 0),
            'temperature_c': d.get('temperature_c', 25),
            'aqi': d.get('aqi', 0),
        }
    except Exception as e:
        logger.info(f'IMD fetch failed (non-critical) for zone {zone.name}: {e}')
        return None  # Non-critical — never halt


def _average_weather(readings: list[dict]) -> dict:
    """Average numeric values across multiple weather source readings."""
    if not readings:
        return {'rainfall_mm': 0, 'wind_speed_ms': 0, 'temperature_c': 25, 'aqi': 0}
    keys = ['rainfall_mm', 'wind_speed_ms', 'temperature_c', 'aqi']
    return {k: sum(r[k] for r in readings) / len(readings) for k in keys}


@shared_task(name='apps.monitoring.tasks.weather_fetch_task', bind=True)
def weather_fetch_task(self):
    """
    Task 1: Runs every 5 minutes via beat.
    Fetches OWM + AccuWeather for all active zones.
    Attempts IMD — if down, marks source_imd=False, DOES NOT halt.
    Saves WeatherSnapshot. consensus_confirmed auto-set in model.save().
    """
    from apps.users.models import Zone
    from .models import WeatherSnapshot

    active_zones = Zone.objects.filter(city__is_active=True).select_related('city')
    created = 0

    for zone in active_zones:
        owm_data = _fetch_owm(zone)
        acw_data = _fetch_acw(zone)
        imd_data = _fetch_imd(zone)

        available = [d for d in [owm_data, acw_data, imd_data] if d]
        if not available:
            # No data at all — use mock data tagged as no-source for calibration
            logger.warning(f'No weather source available for zone {zone.name}. Skipping snapshot.')
            continue

        averaged = _average_weather(available)

        WeatherSnapshot.objects.create(
            zone=zone,
            rainfall_mm=averaged['rainfall_mm'],
            wind_speed_ms=averaged['wind_speed_ms'],
            temperature_c=averaged['temperature_c'],
            aqi=averaged['aqi'],
            source_owm=owm_data is not None,
            source_acw=acw_data is not None,
            source_imd=imd_data is not None,
            # consensus_confirmed is auto-set in model.save() ≥ 2 sources
        )
        created += 1

    logger.info(f'weather_fetch_task: created {created} snapshots across {active_zones.count()} zones')
    return {'snapshots_created': created}


def _weather_to_score(snapshot) -> float:
    """Convert WeatherSnapshot to a 0-1 weather component score."""
    if not snapshot:
        return 0.0
    rain_score = min(snapshot.rainfall_mm / 50.0, 1.0)   # 50mm = max
    wind_score = min(snapshot.wind_speed_ms / 20.0, 1.0)  # 20 m/s = max
    aqi_score  = min(snapshot.aqi / 300.0, 1.0)           # AQI 300 = max
    return round((rain_score * 0.5 + wind_score * 0.3 + aqi_score * 0.2), 4)


def _driver_activity_score(zone, window_minutes=30) -> float:
    """
    Ratio of drivers who sent a beacon in the last 30 min.
    Lower ratio = more drivers offline = higher disruption signal.
    """
    from apps.users.models import Driver, DriverActivity
    total = Driver.objects.filter(zone=zone, is_active=True).count()
    if total == 0:
        return 0.0
    cutoff = timezone.now() - timedelta(minutes=window_minutes)
    active = DriverActivity.objects.filter(
        driver__zone=zone, timestamp__gte=cutoff
    ).values('driver').distinct().count()
    ratio = active / total
    # Inverted: low ratio → high disruption
    return round(1.0 - ratio, 4)


def _order_drop_score() -> float:
    """
    Placeholder: in production integrate with aggregator API (Swiggy/Zomato).
    Returns a neutral 0.3 for calibration.
    """
    return 0.30


def _peer_activity_score(zone) -> float:
    """Fraction of zone drivers who've stopped beaconing — peer signal."""
    return _driver_activity_score(zone, window_minutes=15)


def _traffic_score() -> float:
    """
    Placeholder: in production integrate with Google Maps Traffic API.
    Returns neutral 0.3 for calibration.
    """
    return 0.30


@shared_task(name='apps.monitoring.tasks.edz_engine_task', bind=True)
def edz_engine_task(self):
    """
    Task 2: Runs every 10 minutes via beat.
    Computes final_edz_score per active zone.
    If SHADOW_MODE=True → logs only, no payouts.
    If score >= 0.78 AND consensus_confirmed AND NOT shadow_only → trigger claims.
    """
    from apps.users.models import Zone
    from .models import WeatherSnapshot, EDZSnapshot

    shadow_mode = settings.SHADOW_MODE
    active_zones = Zone.objects.filter(city__is_active=True).select_related('city')
    triggered = 0

    for zone in active_zones:
        # Latest weather snapshot
        weather_snap = WeatherSnapshot.objects.filter(zone=zone).order_by('-timestamp').first()

        w_score     = _weather_to_score(weather_snap)
        od_score    = _order_drop_score()
        pa_score    = _peer_activity_score(zone)
        da_score    = _driver_activity_score(zone)
        tr_score    = _traffic_score()

        edz = EDZSnapshot(
            zone=zone,
            weather_score=w_score,
            order_drop_score=od_score,
            peer_activity_score=pa_score,
            driver_activity_score=da_score,
            traffic_score=tr_score,
            shadow_only=shadow_mode,
        )
        edz.calculate_and_set_score()
        edz.threshold_breached = edz.final_edz_score >= 0.78
        edz.save()

        logger.info(
            f'EDZ {zone.name}: score={edz.final_edz_score:.3f} '
            f'breach={edz.threshold_breached} shadow={edz.shadow_only} '
            f'consensus={weather_snap.consensus_confirmed if weather_snap else False}'
        )

        # Only trigger real claims when all conditions met
        if (
            edz.threshold_breached
            and not shadow_mode
            and weather_snap
            and weather_snap.consensus_confirmed
        ):
            from apps.claims.tasks import auto_trigger_claim
            auto_trigger_claim.delay(zone.id, str(edz.id))
            triggered += 1

    return {
        'zones_evaluated': active_zones.count(),
        'claims_triggered': triggered,
        'shadow_mode': shadow_mode,
    }


@shared_task(name='apps.monitoring.tasks.purge_old_activity_task', bind=True)
def purge_old_activity_task(self):
    """
    Task (also in users per spec): daily 02:00 IST.
    Delete DriverActivity older than DATA_RETENTION_DAYS.
    NEVER purges Claim, Payout, or ReserveWallet records (regulatory).
    """
    from apps.users.models import DriverActivity
    retention_days = getattr(settings, 'DATA_RETENTION_DAYS', 365)
    cutoff = timezone.now() - timedelta(days=retention_days)
    deleted, _ = DriverActivity.objects.filter(timestamp__lt=cutoff).delete()
    logger.info(f'DPDPA purge: deleted {deleted} DriverActivity records older than {retention_days} days.')
    return {'deleted': deleted}
