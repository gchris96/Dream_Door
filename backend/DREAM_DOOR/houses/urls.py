from django.urls import path
from houses.views import (
    HouseDeckView,
    SavedHouseListView,
    dislike_house,
    house_detail,
    like_house,
    save_house,
    unsave_house,
)

urlpatterns = [
    path("deck/", HouseDeckView.as_view(), name="house-deck"),
    path("saved/", SavedHouseListView.as_view(), name="house-saved"),
    path("houses/<int:house_id>/like/", like_house, name="house-like"),
    path("houses/<int:house_id>/dislike/", dislike_house, name="house-dislike"),
    path("houses/<int:house_id>/save/", save_house, name="house-save"),
    path("houses/<int:house_id>/unsave/", unsave_house, name="house-unsave"),
    path("houses/<int:house_id>/detail/", house_detail, name="house-detail"),
]
