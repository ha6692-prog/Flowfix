"""
management/commands/seed_test_users.py

Creates 3 fully-loaded test accounts with:
  - WeatherSnapshots (heavy rain, moderate, extreme)
  - EDZSnapshots (scores above/below threshold)
  - Claims at every status (paid, rejected, pending_fraud_check, approved)
  - Payouts (success, failed, retrying)
  - DriverActivity beacons (GPS history)
  - ReserveWallet with credit history
  - Realistic dates spanning the last 8 weeks

Usage:
  python manage.py seed_test_users

Test accounts created:
  🆔 ZMT-DRV-0001 / test123  → Prateek (gold tier, 3 paid claims + 1 active)   [Zomato]
  🆔 SWG-DRV-0002 / test123  → Ananya  (silver tier, 1 paid + 1 rejected)      [Swiggy]
  🆔 ZMT-DRV-0003 / test123  → Kiran   (platinum tier, 5 paid claims, heavy)   [Zomato]
"""
import hashlib
import uuid
import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = 'Seed 3 test users with rich claim/payout/weather history'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING(
            '\n[SEED] Creating test users with full history...\n'
        ))

        from apps.users.models import City, Zone, Driver, DriverActivity
        from apps.policies.models import PolicyPlan, DriverPolicy, ReserveWallet
        from apps.monitoring.models import WeatherSnapshot, EDZSnapshot
        from apps.claims.models import Claim
        from apps.payouts.models import Payout

        now = timezone.now()

        # ── Ensure city & zones exist ──────────────────────────────────
        city, _ = City.objects.get_or_create(name='Chennai', defaults={'is_active': True})
        zone_names = ['North Zone', 'South Zone', 'East Zone', 'West Zone', 'Central Zone']
        zones = []
        for zn in zone_names:
            z, _ = Zone.objects.get_or_create(
                name=zn, city=city,
                defaults={'pool_balance': 50000, 'risk_score': 0.3, 'active_driver_count': 0}
            )
            zones.append(z)

        # ── Ensure plans exist ─────────────────────────────────────────
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

        # ═══════════════════════════════════════════════════════════════
        # HELPER: Create a driver with full data
        # ═══════════════════════════════════════════════════════════════
        def create_driver(phone, name, platform_id, months_active, plan_name, zone_idx, tier, wallet_balance, total_earned):
            # Clean up existing
            existing = Driver.objects.filter(phone=phone).first()
            if existing:
                # Delete related data
                Claim.objects.filter(driver=existing).delete()
                Payout.objects.filter(driver=existing).delete()
                DriverActivity.objects.filter(driver=existing).delete()
                ReserveWallet.objects.filter(driver=existing).delete()
                DriverPolicy.objects.filter(driver=existing).delete()
                EDZSnapshot.objects.filter(zone=zones[zone_idx]).delete()
                WeatherSnapshot.objects.filter(zone=zones[zone_idx]).delete()
                existing.delete()

            aadhaar_hash = hashlib.sha256(f'TEST_AADHAAR_{phone}'.encode()).hexdigest()
            driver = Driver(
                platform_id=platform_id,
                phone=phone,
                name=name,
                city=city,
                zone=zones[zone_idx],
                aadhaar_hash=aadhaar_hash,
                device_fingerprint=f'test_device_{phone}_{uuid.uuid4().hex[:8]}',
                months_active=months_active,
                is_active=True,
                consent_given=True,
                consent_timestamp=now - timedelta(days=months_active * 30),
                last_beacon_at=now - timedelta(minutes=random.randint(5, 120)),
            )
            driver.set_password('test123')
            driver.save()

            # Policy
            policy = DriverPolicy.objects.create(
                driver=driver,
                plan=plans[plan_name],
                is_active=True,
            )
            # Backdate activated_at
            DriverPolicy.objects.filter(pk=policy.pk).update(
                activated_at=now - timedelta(days=months_active * 30)
            )
            policy.refresh_from_db()

            # Wallet
            wallet = ReserveWallet.objects.create(
                driver=driver,
                balance=wallet_balance,
                total_ever_earned=total_earned,
                tier=tier,
            )

            return driver, policy, wallet

        # ═══════════════════════════════════════════════════════════════
        # HELPER: Create weather + EDZ + claim chain
        # ═══════════════════════════════════════════════════════════════
        def create_weather_event(zone, days_ago, rainfall, wind, aqi, temp):
            ts = now - timedelta(days=days_ago, hours=random.randint(6, 18))
            ws = WeatherSnapshot(
                zone=zone,
                rainfall_mm=rainfall,
                wind_speed_ms=wind,
                aqi=aqi,
                temperature_c=temp,
                source_owm=True,
                source_acw=rainfall > 15,
                source_imd=rainfall > 25,
            )
            ws.save()
            # Backdate timestamp
            WeatherSnapshot.objects.filter(pk=ws.pk).update(timestamp=ts)
            ws.refresh_from_db()
            return ws

        def create_edz_snapshot(zone, days_ago, weather_sc, order_sc, peer_sc, driver_sc, traffic_sc, shadow=False):
            ts = now - timedelta(days=days_ago, hours=random.randint(6, 18))
            edz = EDZSnapshot(
                zone=zone,
                weather_score=weather_sc,
                order_drop_score=order_sc,
                peer_activity_score=peer_sc,
                driver_activity_score=driver_sc,
                traffic_score=traffic_sc,
                shadow_only=shadow,
            )
            edz.calculate_and_set_score()
            edz.threshold_breached = edz.final_edz_score >= 0.78
            edz.save()
            EDZSnapshot.objects.filter(pk=edz.pk).update(timestamp=ts)
            edz.refresh_from_db()
            return edz

        def create_claim(driver, policy, zone, edz, status, days_ago, days_covered,
                         base_amount, wallet_contrib, fraud_score, intent_score,
                         gps_spoof=False, cluster_fraud=False):
            ts = now - timedelta(days=days_ago)
            claim = Claim(
                driver=driver,
                policy=policy,
                zone=zone,
                edz_snapshot=edz,
                status=status,
                fraud_score=fraud_score,
                cluster_fraud_flag=cluster_fraud,
                gps_spoof_flag=gps_spoof,
                intent_score=intent_score,
                days_covered=days_covered,
                base_payout_amount=base_amount,
                wallet_contribution=wallet_contrib,
                total_payout_amount=base_amount + wallet_contrib,
            )
            if status in ('approved', 'paid'):
                claim.approved_at = ts + timedelta(minutes=random.randint(3, 15))
            claim.save()
            Claim.objects.filter(pk=claim.pk).update(created_at=ts)
            claim.refresh_from_db()
            return claim

        def create_payout(claim, driver, amount, status, days_ago, razorpay_id=None, attempts=1):
            ts = now - timedelta(days=days_ago)
            payout = Payout(
                claim=claim,
                driver=driver,
                amount=amount,
                status=status,
                razorpay_transfer_id=razorpay_id or f'pay_test_{uuid.uuid4().hex[:12]}',
                attempt_count=attempts,
                batch_number=1,
            )
            if status == 'success':
                payout.processed_at = ts + timedelta(minutes=random.randint(1, 5))
            payout.save()
            Payout.objects.filter(pk=payout.pk).update(queued_at=ts)
            payout.refresh_from_db()
            return payout

        def create_beacons(driver, count, zone):
            """Scatter GPS beacons over the past weeks."""
            base_lat, base_lng = 13.0827, 80.2707  # Chennai center
            for i in range(count):
                da = DriverActivity.objects.create(
                    driver=driver,
                    gps_lat=base_lat + random.uniform(-0.05, 0.05),
                    gps_lng=base_lng + random.uniform(-0.05, 0.05),
                    accelerometer_active=random.random() > 0.1,
                    gyro_active=random.random() > 0.2,
                    network_type=random.choice(['4G', '4G', '4G', 'WiFi', '3G']),
                    app_in_foreground=random.random() > 0.15,
                    gps_spoofing_flag=False,
                )
                ts = now - timedelta(days=random.randint(0, 56), hours=random.randint(6, 22))
                DriverActivity.objects.filter(pk=da.pk).update(timestamp=ts)

        # ═══════════════════════════════════════════════════════════════
        # USER 1: Prateek — Gold tier, Full plan, 3 paid + 1 active
        # ═══════════════════════════════════════════════════════════════
        self.stdout.write(self.style.WARNING('\n── User 1: Prateek ──'))

        d1, p1, w1 = create_driver(
            phone='9199990001', name='Prateek Sharma', platform_id='ZMT-DRV-0001',
            months_active=9, plan_name='Full', zone_idx=0,
            tier='gold', wallet_balance=Decimal('156.00'), total_earned=Decimal('468.00'),
        )

        # Weather events for North Zone (zone 0)
        # Event 1: Cyclone 6 weeks ago — heavy
        ws1a = create_weather_event(zones[0], days_ago=42, rainfall=68.5, wind=18.2, aqi=95, temp=24)
        edz1a = create_edz_snapshot(zones[0], days_ago=42, weather_sc=0.92, order_sc=0.85, peer_sc=0.80, driver_sc=0.75, traffic_sc=0.70, shadow=False)
        claim1a = create_claim(d1, p1, zones[0], edz1a, status='paid', days_ago=42,
                               days_covered=7, base_amount=Decimal('2800'), wallet_contrib=Decimal('400'),
                               fraud_score=0.08, intent_score=0.94)
        create_payout(claim1a, d1, Decimal('3200'), 'success', days_ago=42, razorpay_id='pay_cyc_Nx8kQm1a')
        # Signal payout
        create_payout(claim1a, d1, Decimal('50'), 'success', days_ago=42, razorpay_id='pay_sig_Nx8kQm1a')

        # Event 2: Heavy rain 3 weeks ago
        ws1b = create_weather_event(zones[0], days_ago=21, rainfall=42.0, wind=14.5, aqi=110, temp=26)
        edz1b = create_edz_snapshot(zones[0], days_ago=21, weather_sc=0.82, order_sc=0.78, peer_sc=0.72, driver_sc=0.68, traffic_sc=0.65, shadow=False)
        claim1b = create_claim(d1, p1, zones[0], edz1b, status='paid', days_ago=21,
                               days_covered=5, base_amount=Decimal('2000'), wallet_contrib=Decimal('200'),
                               fraud_score=0.12, intent_score=0.88)
        create_payout(claim1b, d1, Decimal('2200'), 'success', days_ago=21, razorpay_id='pay_rain_Bv3jLp1b')
        create_payout(claim1b, d1, Decimal('50'), 'success', days_ago=21, razorpay_id='pay_sig_Bv3jLp1b')

        # Event 3: Moderate event 10 days ago
        ws1c = create_weather_event(zones[0], days_ago=10, rainfall=35.0, wind=11.0, aqi=140, temp=27)
        edz1c = create_edz_snapshot(zones[0], days_ago=10, weather_sc=0.78, order_sc=0.80, peer_sc=0.75, driver_sc=0.70, traffic_sc=0.60, shadow=False)
        claim1c = create_claim(d1, p1, zones[0], edz1c, status='paid', days_ago=10,
                               days_covered=4, base_amount=Decimal('1600'), wallet_contrib=Decimal('0'),
                               fraud_score=0.15, intent_score=0.82)
        create_payout(claim1c, d1, Decimal('1600'), 'success', days_ago=10, razorpay_id='pay_mod_Kw9mNr1c')
        create_payout(claim1c, d1, Decimal('50'), 'success', days_ago=10, razorpay_id='pay_sig_Kw9mNr1c')

        # Event 4: ACTIVE claim — rain today, pending fraud check
        ws1d = create_weather_event(zones[0], days_ago=0, rainfall=52.0, wind=16.0, aqi=85, temp=23)
        edz1d = create_edz_snapshot(zones[0], days_ago=0, weather_sc=0.88, order_sc=0.82, peer_sc=0.78, driver_sc=0.72, traffic_sc=0.68, shadow=False)
        claim1d = create_claim(d1, p1, zones[0], edz1d, status='pending_fraud_check', days_ago=0,
                               days_covered=0, base_amount=Decimal('0'), wallet_contrib=Decimal('0'),
                               fraud_score=0.0, intent_score=0.0)

        # Set cooldown from last paid claim
        DriverPolicy.objects.filter(pk=p1.pk).update(
            last_claim_at=now - timedelta(days=10),
            reclaim_blocked_until=now + timedelta(days=4),
        )

        create_beacons(d1, 80, zones[0])
        self.stdout.write(self.style.SUCCESS(
            f'  ✅ Prateek Sharma (ZMT-DRV-0001/test123) — Gold, Full Plan, 3 paid + 1 active claim'
        ))

        # ═══════════════════════════════════════════════════════════════
        # USER 2: Ananya — Silver tier, Standard plan, 1 paid + 1 rejected
        # ═══════════════════════════════════════════════════════════════
        self.stdout.write(self.style.WARNING('\n── User 2: Ananya ──'))

        d2, p2, w2 = create_driver(
            phone='9199990002', name='Ananya Devi', platform_id='SWG-DRV-0002',
            months_active=5, plan_name='Standard', zone_idx=1,
            tier='silver', wallet_balance=Decimal('70.00'), total_earned=Decimal('140.00'),
        )

        # Event 1: Paid claim 4 weeks ago
        ws2a = create_weather_event(zones[1], days_ago=28, rainfall=45.0, wind=13.5, aqi=130, temp=25)
        edz2a = create_edz_snapshot(zones[1], days_ago=28, weather_sc=0.85, order_sc=0.82, peer_sc=0.76, driver_sc=0.70, traffic_sc=0.65, shadow=False)
        claim2a = create_claim(d2, p2, zones[1], edz2a, status='paid', days_ago=28,
                               days_covered=5, base_amount=Decimal('1500'), wallet_contrib=Decimal('150'),
                               fraud_score=0.10, intent_score=0.91)
        create_payout(claim2a, d2, Decimal('1650'), 'success', days_ago=28, razorpay_id='pay_rn2_Hk5mLp2a')
        create_payout(claim2a, d2, Decimal('50'), 'success', days_ago=28, razorpay_id='pay_sig_Hk5mLp2a')

        # Event 2: REJECTED claim 12 days ago — GPS spoof detected
        ws2b = create_weather_event(zones[1], days_ago=12, rainfall=20.0, wind=8.0, aqi=150, temp=30)
        edz2b = create_edz_snapshot(zones[1], days_ago=12, weather_sc=0.65, order_sc=0.70, peer_sc=0.60, driver_sc=0.55, traffic_sc=0.50, shadow=False)
        claim2b = create_claim(d2, p2, zones[1], edz2b, status='rejected', days_ago=12,
                               days_covered=0, base_amount=Decimal('0'), wallet_contrib=Decimal('0'),
                               fraud_score=0.72, intent_score=0.35,
                               gps_spoof=True, cluster_fraud=False)

        # Some normal weather (no trigger) for dashboard EDZ display
        create_weather_event(zones[1], days_ago=1, rainfall=5.0, wind=3.0, aqi=80, temp=31)
        create_edz_snapshot(zones[1], days_ago=0, weather_sc=0.25, order_sc=0.30, peer_sc=0.20, driver_sc=0.35, traffic_sc=0.15, shadow=False)

        create_beacons(d2, 50, zones[1])
        self.stdout.write(self.style.SUCCESS(
            f'  ✅ Ananya Devi (SWG-DRV-0002/test123) — Silver, Standard Plan, 1 paid + 1 rejected'
        ))

        # ═══════════════════════════════════════════════════════════════
        # USER 3: Kiran — Platinum tier, Full plan, 5 paid (veteran)
        # ═══════════════════════════════════════════════════════════════
        self.stdout.write(self.style.WARNING('\n── User 3: Kiran ──'))

        d3, p3, w3 = create_driver(
            phone='9199990003', name='Kiran Naidu', platform_id='ZMT-DRV-0003',
            months_active=18, plan_name='Full', zone_idx=2,
            tier='platinum', wallet_balance=Decimal('288.00'), total_earned=Decimal('1152.00'),
        )

        # 5 paid claims spread over 8 weeks
        rain_events = [
            {'days': 56, 'rain': 72.0, 'wind': 20.0, 'aqi': 80, 'temp': 22, 'days_cov': 7, 'base': 2800, 'wallet': 800},
            {'days': 45, 'rain': 55.0, 'wind': 15.0, 'aqi': 100, 'temp': 24, 'days_cov': 6, 'base': 2400, 'wallet': 400},
            {'days': 32, 'rain': 48.0, 'wind': 14.0, 'aqi': 120, 'temp': 25, 'days_cov': 5, 'base': 2000, 'wallet': 200},
            {'days': 18, 'rain': 60.0, 'wind': 17.0, 'aqi': 90, 'temp': 23, 'days_cov': 7, 'base': 2800, 'wallet': 600},
            {'days': 5,  'rain': 40.0, 'wind': 12.0, 'aqi': 135, 'temp': 26, 'days_cov': 4, 'base': 1600, 'wallet': 0},
        ]

        for i, re in enumerate(rain_events):
            ws = create_weather_event(zones[2], days_ago=re['days'], rainfall=re['rain'],
                                      wind=re['wind'], aqi=re['aqi'], temp=re['temp'])
            edz = create_edz_snapshot(
                zones[2], days_ago=re['days'],
                weather_sc=0.80 + random.uniform(0, 0.15),
                order_sc=0.75 + random.uniform(0, 0.15),
                peer_sc=0.70 + random.uniform(0, 0.15),
                driver_sc=0.65 + random.uniform(0, 0.15),
                traffic_sc=0.60 + random.uniform(0, 0.10),
                shadow=False,
            )
            claim = create_claim(
                d3, p3, zones[2], edz, status='paid', days_ago=re['days'],
                days_covered=re['days_cov'], base_amount=Decimal(str(re['base'])),
                wallet_contrib=Decimal(str(re['wallet'])),
                fraud_score=round(random.uniform(0.03, 0.15), 2),
                intent_score=round(random.uniform(0.82, 0.97), 2),
            )
            total = Decimal(str(re['base'] + re['wallet']))
            create_payout(claim, d3, total, 'success', days_ago=re['days'],
                          razorpay_id=f'pay_vet_{uuid.uuid4().hex[:10]}')
            create_payout(claim, d3, Decimal('50'), 'success', days_ago=re['days'],
                          razorpay_id=f'pay_sig_{uuid.uuid4().hex[:10]}')

        # Current zone EDZ (normal conditions)
        create_weather_event(zones[2], days_ago=0, rainfall=3.0, wind=4.0, aqi=65, temp=32)
        create_edz_snapshot(zones[2], days_ago=0, weather_sc=0.15, order_sc=0.20, peer_sc=0.18, driver_sc=0.25, traffic_sc=0.10, shadow=False)

        # Set cooldown
        DriverPolicy.objects.filter(pk=p3.pk).update(
            last_claim_at=now - timedelta(days=5),
            reclaim_blocked_until=now + timedelta(days=9),
        )

        create_beacons(d3, 120, zones[2])
        self.stdout.write(self.style.SUCCESS(
            f'  ✅ Kiran Naidu (ZMT-DRV-0003/test123) — Platinum, Full Plan, 5 paid claims'
        ))

        # ── Update zone active driver counts ──────────────────────────
        for z in zones:
            z.active_driver_count = Driver.objects.filter(zone=z, is_active=True).count()
            z.save()

        # ═══════════════════════════════════════════════════════════════
        # SUMMARY
        # ═══════════════════════════════════════════════════════════════
        self.stdout.write('')
        self.stdout.write(self.style.MIGRATE_HEADING('[DONE] Test users created!\n'))
        self.stdout.write(self.style.SUCCESS('  ╔═══════════════════════════════════════════════════════════════════════╗'))
        self.stdout.write(self.style.SUCCESS('  ║  TEST ACCOUNTS (password for all: test123)                           ║'))
        self.stdout.write(self.style.SUCCESS('  ╠═══════════════════════════════════════════════════════════════════════╣'))
        self.stdout.write(self.style.SUCCESS('  ║  🆔 ZMT-DRV-0001  Prateek Sharma  Gold     Full     4 claims  [ZMT] ║'))
        self.stdout.write(self.style.SUCCESS('  ║  🆔 SWG-DRV-0002  Ananya Devi     Silver   Standard 2 claims  [SWG] ║'))
        self.stdout.write(self.style.SUCCESS('  ║  🆔 ZMT-DRV-0003  Kiran Naidu     Platinum Full     5 claims  [ZMT] ║'))
        self.stdout.write(self.style.SUCCESS('  ╚═══════════════════════════════════════════════════════════════════════╝'))
        self.stdout.write('')
        self.stdout.write('  Login with Platform ID (e.g. ZMT-DRV-0001) + password: test123')
        self.stdout.write('  Prateek has 1 ACTIVE pending_fraud_check claim → test Live Status page')
        self.stdout.write('  Ananya  has 1 REJECTED claim (GPS spoof) → test rejection UI')
        self.stdout.write('  Kiran   has 5 PAID claims spanning 8 weeks → test payout history')
        self.stdout.write('')
