from rest_framework.generics import ListAPIView
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from houses.models import House, HouseDislike, HouseLike, HouseSave
from houses.serializers import HouseSerializer


class HouseDeckView(ListAPIView):
    serializer_class = HouseSerializer

    def get_queryset(self):
        qs = House.objects.all().order_by("-list_date")

        # Optional filters (safe defaults)
        zip_code = self.request.query_params.get("zip")
        if zip_code:
            qs = qs.filter(postal_code=zip_code)

        return qs


class SavedHouseListView(ListAPIView):
    serializer_class = HouseSerializer

    def get_queryset(self):
        return House.objects.filter(saves__isnull=False).distinct().order_by("-list_date")


@api_view(["POST"])
def like_house(request, house_id):
    try:
        house = House.objects.get(id=house_id)
    except House.DoesNotExist:
        return Response(
            {"error": "House not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    HouseLike.objects.create(house=house)

    return Response(
        {"success": True},
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
def dislike_house(request, house_id):
    try:
        house = House.objects.get(id=house_id)
    except House.DoesNotExist:
        return Response(
            {"error": "House not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    HouseDislike.objects.create(house=house)

    return Response(
        {"success": True},
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
def save_house(request, house_id):
    try:
        house = House.objects.get(id=house_id)
    except House.DoesNotExist:
        return Response(
            {"error": "House not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    HouseSave.objects.get_or_create(house=house)

    return Response(
        {"success": True},
        status=status.HTTP_201_CREATED,
    )


@api_view(["DELETE"])
def unsave_house(request, house_id):
    deleted, _ = HouseSave.objects.filter(house_id=house_id).delete()
    return Response(
        {"success": deleted > 0},
        status=status.HTTP_200_OK,
    )
