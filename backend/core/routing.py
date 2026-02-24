from django.urls import re_path
from .consumers import TelemetryConsumer

websocket_urlpatterns = [
    re_path(r'^ws/vehicle/(?P<vcu_id>[\w-]+)/?$', TelemetryConsumer.as_asgi()),
]
