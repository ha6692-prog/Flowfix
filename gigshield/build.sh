#!/usr/bin/env bash
# Render build script for GigShield Django backend
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate

# Bootstrap test accounts
echo "Bootstrapping test drivers into database..."
python manage.py shell -c "from apps.users.models import Driver, City, Zone; from django.contrib.auth.hashers import make_password; city, _ = City.objects.get_or_create(id=1, defaults={'name': 'Metropolis'}); zone, _ = Zone.objects.get_or_create(id=1, defaults={'city': city, 'name': 'Downtown'}); [Driver.objects.update_or_create(platform_id=p, defaults={'password': make_password('test123'), 'name': n, 'phone': ph, 'city': city, 'zone': zone, 'aadhaar_hash': a, 'device_fingerprint': dp, 'consent_given': True}) for p, n, ph, a, dp in [('ZMT-DRV-0001', 'Prateek', '5551', 'a1', 'f1'), ('SWG-DRV-0002', 'Ananya', '5552', 'a2', 'f2'), ('ZMT-DRV-0003', 'Kiran', '5553', 'a3', 'f3')]]; print('Bootstrapping complete.')"
