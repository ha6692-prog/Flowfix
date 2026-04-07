from django.urls import path, include
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({"status": "ok"})

def api_root(request):
    return JsonResponse({"message": "GigShield Backend API is operational.", "health": "/health", "api": "/api/"})

urlpatterns = [
    path('', api_root, name='api-root'),
    path('health', health_check, name='health-check'),
    path('api/', include('gigshield.api_urls')),
]
