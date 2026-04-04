import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gigshield.settings')

app = Celery('gigshield')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# ── Beat schedule ─────────────────────────────────────────────────────────────
app.conf.beat_schedule = {
    # Weather fetch every 5 minutes
    'weather-fetch-every-5-min': {
        'task': 'apps.monitoring.tasks.weather_fetch_task',
        'schedule': crontab(minute='*/5'),
    },
    # EDZ engine every 10 minutes
    'edz-engine-every-10-min': {
        'task': 'apps.monitoring.tasks.edz_engine_task',
        'schedule': crontab(minute='*/10'),
    },
    # Weekly reserve credit — every Monday at 09:00 IST
    'weekly-reserve-credit-monday': {
        'task': 'apps.policies.tasks.weekly_reserve_credit_task',
        'schedule': crontab(hour=9, minute=0, day_of_week='monday'),
    },
    # Seasonal premium adjustment — 1st of each month at 00:01 IST
    'seasonal-premium-adjustment-monthly': {
        'task': 'apps.policies.tasks.seasonal_premium_adjustment_task',
        'schedule': crontab(hour=0, minute=1, day_of_month=1),
    },
    # Data retention purge — daily at 02:00 IST
    'driver-activity-purge-daily': {
        'task': 'apps.monitoring.tasks.purge_old_activity_task',
        'schedule': crontab(hour=2, minute=0),
    },
}

app.conf.timezone = 'Asia/Kolkata'
