from django.urls import path
from .views import list_houses

urlpatterns = [
    path('houses/', list_houses),
]