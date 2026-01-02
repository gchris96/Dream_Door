from django.core.management import call_command
from django.test import TestCase

from houses.models import House, HousePhoto


class NormalizePhotoUrlsCommandTests(TestCase):
    def _create_house(self):
        return House.objects.create(
            source="realty_in_us",
            external_id="ext-1",
            address_line="123 Main St",
            city="Testville",
            state="CA",
            postal_code="90210",
        )

    def test_normalizes_photo_urls(self):
        house = self._create_house()
        HousePhoto.objects.create(
            house=house,
            payload=[
                {"href": "https://example.com/photo_s.jpg"},
                {"href": "https://example.com/photo_l.png"},
                {"href": "https://example.com/nochange.jpg?x=1"},
                {"other": "value"},
                "not-a-dict",
            ],
        )

        call_command("normalize_photo_urls")

        photo = HousePhoto.objects.get(house=house)
        payload = photo.payload
        self.assertEqual(payload[0]["href"], "https://example.com/photo_o.jpg")
        self.assertEqual(payload[0]["href_fallback"], "https://example.com/photo_l.jpg")
        self.assertEqual(payload[1]["href"], "https://example.com/photo_o.png")
        self.assertEqual(payload[1]["href_fallback"], "https://example.com/photo_l.png")
        self.assertEqual(payload[2]["href"], "https://example.com/nochange.jpg?x=1")
        self.assertNotIn("href_fallback", payload[2])
        self.assertEqual(payload[3], {"other": "value"})
        self.assertEqual(payload[4], "not-a-dict")

    def test_limit_option(self):
        house = self._create_house()
        other_house = House.objects.create(
            source="realty_in_us",
            external_id="ext-2",
            address_line="456 Oak St",
            city="Testville",
            state="CA",
            postal_code="90210",
        )
        HousePhoto.objects.create(
            house=house,
            payload=[{"href": "https://example.com/photo_s.jpg"}],
        )
        HousePhoto.objects.create(
            house=other_house,
            payload=[{"href": "https://example.com/photo_s.jpg"}],
        )

        call_command("normalize_photo_urls", "--limit", "1")

        first = HousePhoto.objects.get(house=house)
        second = HousePhoto.objects.get(house=other_house)
        self.assertEqual(first.payload[0]["href"], "https://example.com/photo_o.jpg")
        self.assertEqual(second.payload[0]["href"], "https://example.com/photo_s.jpg")

    def test_dry_run_option(self):
        house = self._create_house()
        HousePhoto.objects.create(
            house=house,
            payload=[{"href": "https://example.com/photo_s.jpg"}],
        )

        call_command("normalize_photo_urls", "--dry-run")

        photo = HousePhoto.objects.get(house=house)
        self.assertEqual(photo.payload[0]["href"], "https://example.com/photo_s.jpg")
