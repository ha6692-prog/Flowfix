"""
management/commands/seed_gigshield.py

Usage:
  python manage.py seed_gigshield --city=Chennai

Creates:
  1 City + 5 Zones (pool_balance=50000 each)
  3 PolicyPlans (Basic/Standard/Full)
  10 test Drivers + ReserveWallets (mixed tiers)
  1 WeatherSnapshot (consensus_confirmed=True) per zone

Safe to run multiple times — uses get_or_create for city/plans.
"""
import hashlib
import uuid

from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone


class Command(BaseCommand):
    help = 'Seed GigShield with test data for a given city'

    def add_arguments(self, parser):
        parser.add_argument('--city', type=str, default='Chennai', help='City name to seed')

    def handle(self, *args, **options):
        city_name = options['city']
        self.stdout.write(self.style.MIGRATE_HEADING(f'\n[SEED] Seeding GigShield for {city_name}...\n'))

        # Heal PK sequences first; previous explicit id inserts can desync them on Postgres.
        self._repair_primary_key_sequences()
        
        try:
            self._run_seed(city_name)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  [ERROR] Seed failed: {e}'))
            self.stdout.write(self.style.WARNING(f'  [FALLBACK] Creating essential test accounts...'))
            try:
                self._repair_primary_key_sequences()
                self._create_fallback_accounts()
            except Exception as fallback_error:
                # Never fail the build because of optional seed data.
                self.stdout.write(self.style.ERROR(f'  [ERROR] Fallback seed failed: {fallback_error}'))
                self.stdout.write(self.style.WARNING('  [WARN] Continuing deployment without demo seed data.'))

    def _repair_primary_key_sequences(self):
        """Repair auto-increment sequences so new inserts do not collide on existing PKs."""
        from apps.users.models import City, Zone, Driver

        models = (City, Zone, Driver)
        with connection.cursor() as cursor:
            for model in models:
                table = model._meta.db_table
                # Set sequence to max(id); next insert will use max(id)+1.
                cursor.execute(
                    f"""
                    SELECT setval(
                        pg_get_serial_sequence('{table}', 'id'),
                        COALESCE((SELECT MAX(id) FROM {table}), 1),
                        true
                    )
                    """
                )
    
    def _create_fallback_accounts(self):
        """Create minimal test accounts if full seed fails."""
        from apps.users.models import Driver, City, Zone
        
        # Ensure city exists
        city, _ = City.objects.get_or_create(name='Chennai', defaults={'is_active': True})
        
        # Ensure zone exists
        zone, _ = Zone.objects.get_or_create(
            name='Central Zone',
            city=city,
            defaults={'pool_balance': 50000, 'risk_score': 0.0, 'active_driver_count': 0},
        )
        
        # Create essential test accounts
        test_accounts = [
            {'platform_id': 'ADMIN-001', 'phone': '9000000001', 'name': 'Platform Admin'},
            {'platform_id': 'ZMT-DRV-0001', 'phone': '9100000001', 'name': 'Prateek'},
            {'platform_id': 'SWG-DRV-0002', 'phone': '9100000002', 'name': 'Ananya'},
        ]
        
        for acc in test_accounts:
            aadhaar_hash = hashlib.sha256(f"TEST_AADHAAR_{acc['phone']}_FALLBACK".encode()).hexdigest()
            driver, _ = Driver.objects.update_or_create(
                platform_id=acc['platform_id'],
                defaults={
                    'phone': acc['phone'],
                    'name': acc['name'],
                    'city': city,
                    'zone': zone,
                    'aadhaar_hash': aadhaar_hash,
                    'device_fingerprint': f"fallback_{uuid.uuid4().hex}",
                    'is_active': True,
                    'consent_given': True,
                    'consent_timestamp': timezone.now(),
                },
            )
            driver.set_password('gigshield123')
            driver.save()
            self.stdout.write(self.style.SUCCESS(f'  [OK] Created fallback account: {acc["platform_id"]}'))
    
    def _run_seed(self, city_name):

        # ── 1. City ────────────────────────────────────────────────────────────
        from apps.users.models import City, Zone, Driver
        city, created = City.objects.get_or_create(name=city_name, defaults={'is_active': True})
        action = 'Created' if created else 'Found existing'
        self.stdout.write(self.style.SUCCESS(f'  [OK] {action} city: {city.name}'))

        # ── 2. Zones ───────────────────────────────────────────────────────────
        zone_names = ['North Zone', 'South Zone', 'East Zone', 'West Zone', 'Central Zone']
        zones = []
        for zname in zone_names:
            zone, _ = Zone.objects.get_or_create(
                name=zname,
                city=city,
                defaults={
                    'pool_balance': 50000,
                    'risk_score': 0.3,
                    'active_driver_count': 0,
                },
            )
            if zone.pool_balance < 50000:
                zone.pool_balance = 50000
            zone.save()  # triggers max_cross_subsidy recalc
            zones.append(zone)

        self.stdout.write(self.style.SUCCESS(f'  [OK] Created/verified {len(zones)} zones (Rs.50,000 each)'))

        # ── 3. Policy Plans ────────────────────────────────────────────────────
        from apps.policies.models import PolicyPlan
        plans_data = [
            {'name': 'Basic',    'weekly_premium': 20, 'daily_payout_rate': 200, 'max_coverage_days': 3},
            {'name': 'Standard', 'weekly_premium': 50, 'daily_payout_rate': 300, 'max_coverage_days': 5},
            {'name': 'Full',     'weekly_premium': 99, 'daily_payout_rate': 400, 'max_coverage_days': 7},
        ]
        plans = {}
        for pd in plans_data:
            plan, _ = PolicyPlan.objects.get_or_create(
                name=pd['name'],
                defaults={
                    'weekly_premium': pd['weekly_premium'],
                    'daily_payout_rate': pd['daily_payout_rate'],
                    'max_coverage_days': pd['max_coverage_days'],
                    'reserve_contribution_rate': 0.10,
                    'seasonal_multiplier': 1.0,
                },
            )
            plans[pd['name']] = plan

        self.stdout.write(self.style.SUCCESS(f'  [OK] Created/verified 3 protection fund plans'))

        # ── 4. Test Drivers ────────────────────────────────────────────────────
        from apps.policies.models import DriverPolicy, ReserveWallet

        drivers_data = [
            {'name': 'Ravi Kumar',    'phone': '9100000001', 'platform_id': 'ZMT-DRV-0001', 'months': 1,  'tier': 'bronze',   'plan': 'Basic',    'zone': 0},
            {'name': 'Priya Devi',    'phone': '9100000002', 'platform_id': 'SWG-DRV-0002', 'months': 5,  'tier': 'silver',   'plan': 'Standard', 'zone': 1},
            {'name': 'Suresh S',      'phone': '9100000003', 'platform_id': 'ZMT-DRV-0003', 'months': 9,  'tier': 'gold',     'plan': 'Full',     'zone': 2},
            {'name': 'Meena R',       'phone': '9100000004', 'platform_id': 'BLK-DRV-0004', 'months': 14, 'tier': 'platinum', 'plan': 'Full',     'zone': 3},
            {'name': 'Arjun T',       'phone': '9100000005', 'platform_id': 'SWG-DRV-0005', 'months': 3,  'tier': 'bronze',   'plan': 'Basic',    'zone': 4},
            {'name': 'Kavitha M',     'phone': '9100000006', 'platform_id': 'ZMT-DRV-0006', 'months': 6,  'tier': 'silver',   'plan': 'Standard', 'zone': 0},
            {'name': 'Dinesh P',      'phone': '9100000007', 'platform_id': 'BLK-DRV-0007', 'months': 11, 'tier': 'gold',     'plan': 'Full',     'zone': 1},
            {'name': 'Lakshmi A',     'phone': '9100000008', 'platform_id': 'ZMT-DRV-0008', 'months': 18, 'tier': 'platinum', 'plan': 'Full',     'zone': 2},
            {'name': 'Bala G',        'phone': '9100000009', 'platform_id': 'SWG-DRV-0009', 'months': 2,  'tier': 'bronze',   'plan': 'Basic',    'zone': 3},
            {'name': 'Vijaya C',      'phone': '9100000010', 'platform_id': 'ZMT-DRV-0010', 'months': 8,  'tier': 'gold',     'plan': 'Standard', 'zone': 4},
            # Admin test account
            {'name': 'Platform Admin', 'phone': '9000000001', 'platform_id': 'ADMIN-001',   'months': 24, 'tier': 'platinum', 'plan': 'Full',     'zone': 0},
        ]

        tier_balances = {'bronze': 24, 'silver': 50, 'gold': 104, 'platinum': 192}
        drivers_created = 0

        for i, dd in enumerate(drivers_data):
            if Driver.objects.filter(phone=dd['phone']).exists():
                continue

            # Generate deterministic hash for aadhaar (test only — never real)
            aadhaar_raw = f"TEST_AADHAAR_{dd['phone']}_SEED"
            aadhaar_hash = hashlib.sha256(aadhaar_raw.encode()).hexdigest()

            driver = Driver(
                phone=dd['phone'],
                platform_id=dd['platform_id'],
                name=dd['name'],
                city=city,
                zone=zones[dd['zone']],
                aadhaar_hash=aadhaar_hash,
                device_fingerprint=f'seed_device_{i:04d}_{uuid.uuid4().hex[:8]}',
                months_active=dd['months'],
                is_active=True,
                consent_given=True,
                consent_timestamp=timezone.now(),
            )
            driver.set_password('gigshield123')  # test password only
            driver.save()

            policy = DriverPolicy.objects.create(
                driver=driver,
                plan=plans[dd['plan']],
                is_active=True,
            )

            wallet_balance = tier_balances.get(dd['tier'], 24)
            ReserveWallet.objects.create(
                driver=driver,
                balance=wallet_balance,
                total_ever_earned=wallet_balance,
                tier=dd['tier'],
            )

            drivers_created += 1

        self.stdout.write(self.style.SUCCESS(f'  [OK] Created {drivers_created} test drivers (password: gigshield123)'))

        # ── 5. WeatherSnapshot (consensus_confirmed=True) ──────────────────────
        from apps.monitoring.models import WeatherSnapshot
        for zone in zones:
            WeatherSnapshot.objects.create(
                zone=zone,
                rainfall_mm=35.5,       # Heavy rain → high weather_score
                wind_speed_ms=12.0,
                temperature_c=28.0,
                aqi=120.0,
                source_owm=True,
                source_acw=True,
                source_imd=False,       # IMD down — consensus still met (2/3)
            )

        self.stdout.write(self.style.SUCCESS(
            f'  [OK] Created {len(zones)} WeatherSnapshots (consensus_confirmed=True, IMD=False)'
        ))

        # ── Summary ────────────────────────────────────────────────────────────
        self.stdout.write('')
        self.stdout.write(self.style.MIGRATE_HEADING('[DONE] Seed complete! Test demo loop:'))
        self.stdout.write('')
        self.stdout.write('  1. POST /api/auth/login/  {"platform_id":"ZMT-DRV-0001","password":"gigshield123"}')
        self.stdout.write('  2. POST /api/policies/activate/  {"plan_id": 1}  (if not already active)')
        self.stdout.write('  3. Set SHADOW_MODE=False in .env → restart server')
        self.stdout.write('  4. In shell: from apps.monitoring.tasks import edz_engine_task; edz_engine_task.apply()')
        self.stdout.write('  5. Watch Claim → fraud check → payout in Django admin')
        self.stdout.write('  6. GET /api/claims/active/')
        self.stdout.write('  7. GET /api/stats/public/')
        self.stdout.write('')
