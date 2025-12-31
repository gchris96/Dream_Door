from rest_framework.generics import ListAPIView
from houses.models import House
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