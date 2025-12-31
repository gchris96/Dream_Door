from django.urls import path
from houses.views import HouseDeckView

urlpatterns = [
    path("deck/", HouseDeckView.as_view(), name="house-deck"),
]
