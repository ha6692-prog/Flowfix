from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_driver_platform_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='driver',
            name='is_kyc_verified',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='driver',
            name='payout_account_verified',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='driver',
            name='payout_bank_account',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='driver',
            name='payout_upi_vpa',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]