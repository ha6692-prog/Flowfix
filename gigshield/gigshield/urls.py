from django.urls import path, include, re_path
from django.http import JsonResponse, HttpResponse
from django.shortcuts import redirect

def health_check(request):
    return JsonResponse({"status": "ok", "service": "GigShield API"})

def api_redirect(request):
    return redirect('/api/')

def favicon_view(request):
    # Returning a 1x1 transparent GIF to be even more compliant than a 204
    pixel = b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b'
    return HttpResponse(pixel, content_type="image/gif")

def api_root(request):
    return JsonResponse({
        "message": "GigShield Backend API is operational.",
        "health": "/health",
        "api": "/api/",
        "platform": "FlowFix"
    })

urlpatterns = [
    # Favicon - prioritized and using regex for absolute matching
    re_path(r'^favicon\.ico$', favicon_view),
    
    path('', api_root, name='project-root'),
    path('health', health_check, name='health-check'),
    
    # API endpoints
    path('api', api_redirect), # Redirect /api to /api/
    path('api/', include('gigshield.api_urls')),
]
