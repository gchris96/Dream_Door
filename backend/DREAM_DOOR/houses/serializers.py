from rest_framework import serializers
from houses.models import House


class HouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = House
        fields = [
            "id",
            "price",
            "beds",
            "baths",
            "sqft",
            "lot_sqft",
            "address_line",
            "city",
            "state",
            "postal_code",
            "lat",
            "lng",
            "status",
            "property_type",
            "sub_type",
            "primary_photo_url",
        ]
