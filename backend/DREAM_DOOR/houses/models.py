from django.db import models

class House(models.Model):
    price = models.IntegerField()
    beds = models.IntegerField()
    baths = models.FloatField()
    image_urls = models.JSONField()
    address = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    def __str__(self):
        return f"${self.price} | {self.beds}bd {self.baths}ba"
