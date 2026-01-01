import json
import os
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.core.management.base import BaseCommand, CommandError

from houses.models import House, HouseDetail


API_HOST = "realty-in-us.p.rapidapi.com"
DETAIL_ENDPOINT = "https://realty-in-us.p.rapidapi.com/properties/v3/detail"


def _extract_detail(payload):
    if isinstance(payload, dict):
        data = payload.get("data")
        if isinstance(data, dict) and "home" in data:
            return data.get("home") or {}
    return payload


class Command(BaseCommand):
    help = "Fetch property details from Realty in US and store in HouseDetail."

    def add_arguments(self, parser):
        parser.add_argument("--house-id", type=int)
        parser.add_argument("--limit", type=int)

    def handle(self, *args, **options):
        api_key = os.environ.get("REALTY_RAPIDAPI_KEY") or os.environ.get("RAPIDAPI_KEY")
        if not api_key:
            raise CommandError("Missing REALTY_RAPIDAPI_KEY or RAPIDAPI_KEY environment variable.")

        qs = House.objects.filter(source="realty_in_us").order_by("id")
        if options.get("house_id"):
            qs = qs.filter(id=options["house_id"])
        if options.get("limit"):
            qs = qs[: options["limit"]]

        if not qs.exists():
            self.stdout.write(self.style.WARNING("No houses found for detail fetch."))
            return

        headers = {
            "x-rapidapi-host": API_HOST,
            "x-rapidapi-key": api_key,
        }

        created_count = 0
        updated_count = 0
        error_count = 0

        for house in qs:
            if not house.external_id:
                continue
            query = urlencode({"property_id": house.external_id})
            url = f"{DETAIL_ENDPOINT}?{query}"
            request = Request(url, headers=headers, method="GET")

            try:
                with urlopen(request, timeout=30) as response:
                    raw_body = response.read().decode("utf-8")
            except HTTPError as exc:
                error_count += 1
                self.stderr.write(
                    self.style.WARNING(
                        f"Realty API error {exc.code} for house {house.id}: {exc.read().decode('utf-8')}"
                    )
                )
                continue
            except URLError as exc:
                error_count += 1
                self.stderr.write(self.style.WARNING(f"Network error for house {house.id}: {exc}"))
                continue

            try:
                payload = json.loads(raw_body)
            except json.JSONDecodeError as exc:
                error_count += 1
                self.stderr.write(self.style.WARNING(f"Invalid JSON for house {house.id}: {exc}"))
                continue

            detail_payload = _extract_detail(payload)
            _, created = HouseDetail.objects.update_or_create(
                house=house,
                defaults={"payload": detail_payload or {}},
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Fetched detail for {created_count + updated_count} houses "
                f"(created={created_count}, updated={updated_count}, errors={error_count})."
            )
        )
