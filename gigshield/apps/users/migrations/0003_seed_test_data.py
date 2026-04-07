from django.db import migrations
from django.utils import timezone
from django.contrib.auth.hashers import make_password
import uuid

def seed_data(apps, schema_editor):
    City = apps.get_model('users', 'City')
    Zone = apps.get_model('users', 'Zone')
    Driver = apps.get_model('users', 'Driver')

    # Seed City
    city_obj, _ = City.objects.get_or_create(id=1, defaults={'name': 'Metropolis', 'is_active': True})
    
    # Seed Zone
    zone_obj, _ = Zone.objects.get_or_create(
        id=1, 
        defaults={
            'city': city_obj, 
            'name': 'Downtown', 
            'pool_balance': 0, 
            'risk_score': 50.0, 
            'active_driver_count': 0, 
            'max_cross_subsidy': 0
        }
    )

    # Seed Test Driver
    Driver.objects.get_or_create(
        platform_id='ZMT-DRV-0001',
        defaults={
            'phone': '5550001111',
            'password': make_password('test123'),
            'name': 'Test Driver',
            'city': city_obj,
            'zone': zone_obj,
            'aadhaar_hash': 'fake_aadhaar_hash',
            'device_fingerprint': 'fake_fingerprint',
            'is_active': True,
            'consent_given': True,
            'consent_timestamp': timezone.now(),
        }
    )

class Migration(migrations.Migration):
    dependencies = [
        ('users', '0002_driver_platform_id'),
    ]

    operations = [
        migrations.RunPython(seed_data),
    ]
