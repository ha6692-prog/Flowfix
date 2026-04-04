from django.contrib import admin
from .models import City, Zone, Driver, DriverActivity


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)


@admin.register(Zone)
class ZoneAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'pool_balance', 'risk_score', 'active_driver_count', 'max_cross_subsidy')
    list_filter = ('city',)
    search_fields = ('name', 'city__name')
    readonly_fields = ('max_cross_subsidy',)


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'city', 'zone', 'is_active', 'months_active', 'consent_given', 'created_at')
    list_filter = ('is_active', 'consent_given', 'city')
    search_fields = ('name', 'phone')
    readonly_fields = ('id', 'aadhaar_hash', 'pan_hash', 'device_fingerprint', 'created_at', 'password')
    exclude = ()

    def save_model(self, request, obj, form, change):
        # Never allow raw password edit from admin
        super().save_model(request, obj, form, change)


@admin.register(DriverActivity)
class DriverActivityAdmin(admin.ModelAdmin):
    list_display = ('driver', 'timestamp', 'network_type', 'gps_spoofing_flag', 'app_in_foreground')
    list_filter = ('gps_spoofing_flag', 'network_type', 'app_in_foreground')
    search_fields = ('driver__name', 'driver__phone')
    date_hierarchy = 'timestamp'
    readonly_fields = ('timestamp',)
