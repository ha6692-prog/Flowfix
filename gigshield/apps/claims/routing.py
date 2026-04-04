from django.urls import re_path
from .consumers import ClaimConsumer

websocket_urlpatterns = [
    re_path(r'^ws/claim/(?P<driver_id>[0-9a-f-]+)/$', ClaimConsumer.as_asgi()),
]
