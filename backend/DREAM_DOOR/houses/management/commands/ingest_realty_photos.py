import json
import os
import re
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.core.management.base import BaseCommand, CommandError

from houses.models import House, HouseImportError, HousePhoto


API_HOST = "realty-in-us.p.rapidapi.com"
PHOTOS_ENDPOINT = "https://realty-in-us.p.rapidapi.com/properties/v3/get-photos"

SIZE_EXT_RE = re.compile(r"([a-z])(\.(?:jpg|jpeg|png))$", re.IGNORECASE)


def _swap_size(url, size):
    if not isinstance(url, str):
        return None
    match = SIZE_EXT_RE.search(url)
    if not match:
        return None
    return f"{url[:match.start(1)]}{size}{match.group(2)}"


def _normalize_photo(photo):
    if not isinstance(photo, dict):
        return photo
    href = photo.get("href")
    if not href:
        return photo
    updated_href = _swap_size(href, "o")
    if not updated_href:
        return photo
    normalized = dict(photo)
    normalized["href"] = updated_href
    normalized["href_fallback"] = _swap_size(href, "l")
    return normalized


def _extract_photos(payload):
    if not isinstance(payload, dict):
        return []
    data = payload.get("data")
    if not isinstance(data, dict):
        return []
    home_search = data.get("home_search")
    if not isinstance(home_search, dict):
        return []
    results = home_search.get("results")
    if not isinstance(results, list) or not results:
        return []
    first = results[0]
    if not isinstance(first, dict):
        return []
    photos = first.get("photos")
    return photos if isinstance(photos, list) else []


class Command(BaseCommand):
    help = "Fetch property photos from Realty in US and store in HousePhoto."

    def add_arguments(self, parser):
        parser.add_argument("--house-id", type=int)
        parser.add_argument("--limit", type=int)

    def handle(self, *args, **options):
        api_key = os.environ.get("REALTY_RAPIDAPI_KEY")
        if not api_key:
            raise CommandError("Missing REALTY_RAPIDAPI_KEY environment variable.")

        qs = House.objects.filter(source="realty_in_us").order_by("id")
        if options.get("house_id"):
            qs = qs.filter(id=options["house_id"])
        if options.get("limit"):
            qs = qs[: options["limit"]]

        houses = list(qs)
        if not houses:
            self.stdout.write(self.style.WARNING("No houses found for photo fetch."))
            return

        headers = {
            "x-rapidapi-host": API_HOST,
            "x-rapidapi-key": api_key,
        }

        created_count = 0
        updated_count = 0
        error_count = 0

        aborted = False
        for idx, house in enumerate(houses):
            if not house.external_id:
                continue
            query = urlencode({"property_id": house.external_id})
            url = f"{PHOTOS_ENDPOINT}?{query}"
            request = Request(url, headers=headers, method="GET")

            try:
                with urlopen(request, timeout=30) as response:
                    raw_body = response.read().decode("utf-8")
            except HTTPError as exc:
                error_message = f"Realty API error {exc.code} for house {house.id}: {exc.read().decode('utf-8')}"
                remaining = houses[idx:]
                for remaining_house in remaining:
                    HouseImportError.objects.create(
                        house=remaining_house,
                        external_id=remaining_house.external_id or "",
                        import_type="photos",
                        error_message=error_message,
                    )
                error_count += len(remaining)
                remaining_ids = [str(item.id) for item in remaining]
                self.stderr.write(self.style.WARNING(error_message))
                self.stdout.write(
                    self.style.WARNING(
                        f"Import halted. Remaining house IDs: {', '.join(remaining_ids)}"
                    )
                )
                aborted = True
                break
            except URLError as exc:
                error_message = f"Network error for house {house.id}: {exc}"
                remaining = houses[idx:]
                for remaining_house in remaining:
                    HouseImportError.objects.create(
                        house=remaining_house,
                        external_id=remaining_house.external_id or "",
                        import_type="photos",
                        error_message=error_message,
                    )
                error_count += len(remaining)
                remaining_ids = [str(item.id) for item in remaining]
                self.stderr.write(self.style.WARNING(error_message))
                self.stdout.write(
                    self.style.WARNING(
                        f"Import halted. Remaining house IDs: {', '.join(remaining_ids)}"
                    )
                )
                aborted = True
                break

            try:
                payload = json.loads(raw_body)
            except json.JSONDecodeError as exc:
                error_message = f"Invalid JSON for house {house.id}: {exc}"
                remaining = houses[idx:]
                for remaining_house in remaining:
                    HouseImportError.objects.create(
                        house=remaining_house,
                        external_id=remaining_house.external_id or "",
                        import_type="photos",
                        error_message=error_message,
                    )
                error_count += len(remaining)
                remaining_ids = [str(item.id) for item in remaining]
                self.stderr.write(self.style.WARNING(error_message))
                self.stdout.write(
                    self.style.WARNING(
                        f"Import halted. Remaining house IDs: {', '.join(remaining_ids)}"
                    )
                )
                aborted = True
                break

            photos_payload = _extract_photos(payload)
            photos_payload = [_normalize_photo(photo) for photo in photos_payload]
            _, created = HousePhoto.objects.update_or_create(
                house=house,
                defaults={"payload": photos_payload or []},
            )
            if created:
                created_count += 1
            else:
                updated_count += 1
            self.stdout.write(f"successfully imported photos for property_id: {house.external_id}")

        if aborted:
            return

        self.stdout.write(
            self.style.SUCCESS(
                f"Fetched photos for {created_count + updated_count} houses "
                f"(created={created_count}, updated={updated_count}, errors={error_count})."
            )
        )
