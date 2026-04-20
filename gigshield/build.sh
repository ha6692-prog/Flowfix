#!/usr/bin/env bash
# Render build script for GigShield Django backend
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate

# Seed canonical demo accounts and data used by the app login flow.
python manage.py seed_gigshield --city=Chennai
