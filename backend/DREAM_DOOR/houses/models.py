from django.db import models


class House(models.Model):
    source = models.CharField(max_length=50)
    external_id = models.CharField(max_length=100)

    status = models.CharField(max_length=50, blank=True)
    property_type = models.CharField(max_length=50, blank=True)
    sub_type = models.CharField(max_length=50, blank=True)

    price = models.IntegerField(null=True, blank=True)
    beds = models.IntegerField(null=True, blank=True)
    baths = models.FloatField(null=True, blank=True)
    sqft = models.IntegerField(null=True, blank=True)
    lot_sqft = models.IntegerField(null=True, blank=True)

    address_line = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=50)
    postal_code = models.CharField(max_length=20)

    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)

    list_date = models.DateTimeField(null=True, blank=True)
    last_sold_date = models.DateField(null=True, blank=True)

    primary_photo_url = models.URLField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)



    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["source", "external_id"],
                name="unique_house_source_external_id",
            ),
        ]


    def __str__(self):
        price = f"${self.price:,}" if self.price else "$0"
        return f"{self.city}, {self.state} | {price}"


class HouseDetail(models.Model):
    house = models.OneToOneField(
        House,
        on_delete=models.CASCADE,
        related_name="detail",
    )
    payload = models.JSONField(default=dict)
    fetched_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Detail → House {self.house_id}"
    
class HouseLike(models.Model):
    house = models.ForeignKey(
        House,
        on_delete=models.CASCADE,
        related_name="likes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Like → House {self.house_id}"


class HouseDislike(models.Model):
    house = models.ForeignKey(
        House,
        on_delete=models.CASCADE,
        related_name="dislikes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Dislike → House {self.house_id}"


class HouseSave(models.Model):
    house = models.ForeignKey(
        House,
        on_delete=models.CASCADE,
        related_name="saves",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["house"],
                name="unique_house_save",
            ),
        ]

    def __str__(self):
        return f"Saved → House {self.house_id}"
