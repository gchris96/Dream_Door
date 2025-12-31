import json
import os
from datetime import datetime, time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

from houses.models import House


STATUS_FILTERS = ["for_sale", "ready_to_build"]
SORT_BY = {"direction": "desc", "field": "list_date"}
API_HOST = "realty-in-us.p.rapidapi.com"
LIST_ENDPOINT = "https://realty-in-us.p.rapidapi.com/properties/v3/list"


def _get_nested(data, *keys):
    current = data
    for key in keys:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def _first_value(*values):
    for value in values:
        if value not in (None, ""):
            return value
    return None


def _to_int(value):
    if value in (None, ""):
        return None
    try:
        return int(float(str(value).replace(",", "")))
    except (TypeError, ValueError):
        return None


def _to_float(value):
    if value in (None, ""):
        return None
    try:
        return float(str(value).replace(",", ""))
    except (TypeError, ValueError):
        return None


def _parse_list_date(value):
    if value in (None, ""):
        return None
    if isinstance(value, (int, float)):
        try:
            timestamp = value / 1000 if value > 1_000_000_000_000 else value
            return datetime.fromtimestamp(timestamp, tz=timezone.utc)
        except (OSError, OverflowError, ValueError):
            return None
    if isinstance(value, str):
        parsed = parse_datetime(value)
        if parsed is None:
            parsed_date = parse_date(value)
            if parsed_date:
                parsed = datetime.combine(parsed_date, time.min)
        if parsed and timezone.is_naive(parsed):
            parsed = timezone.make_aware(parsed, timezone.get_default_timezone())
        return parsed
    return None


def _extract_listings(payload):
    candidates = [
        ("data", "home_search", "results"),
        ("data", "home_search", "results", "results"),
        ("data", "results"),
        ("data", "properties"),
        ("data", "listings"),
        ("results",),
        ("properties",),
        ("listings",),
    ]
    for path in candidates:
        value = _get_nested(payload, *path)
        if isinstance(value, list):
            return value
    return []


def _normalize_listing(listing):
    external_id = _first_value(
        listing.get("property_id"),
        listing.get("listing_id"),
        _get_nested(listing, "property_id"),
        _get_nested(listing, "property", "property_id"),
        _get_nested(listing, "property", "listing_id"),
        listing.get("id"),
    )
    if not external_id:
        return None

    location = listing.get("location") or {}
    address = location.get("address") or {}
    coordinate = address.get("coordinate") or {}

    address_line = _first_value(
        address.get("line"),
        address.get("street_address"),
        address.get("address"),
    )
    if not address_line:
        street_num = address.get("street_number")
        street_name = address.get("street_name")
        if street_num or street_name:
            address_line = f"{street_num or ''} {street_name or ''}".strip()

    city = _first_value(address.get("city"), address.get("city_name"))
    state = _first_value(address.get("state_code"), address.get("state"))
    postal_code = _first_value(address.get("postal_code"), address.get("zip"))

    description = listing.get("description") or {}
    primary_photo = listing.get("primary_photo") or listing.get("photo") or {}
    photos = listing.get("photos") or []
    if isinstance(primary_photo, str):
        primary_photo_url = primary_photo
    else:
        primary_photo_url = _first_value(
            primary_photo.get("href"),
            primary_photo.get("url"),
        )
    if not primary_photo_url and photos:
        first_photo = photos[0]
        if isinstance(first_photo, dict):
            primary_photo_url = _first_value(first_photo.get("href"), first_photo.get("url"))
        elif isinstance(first_photo, str):
            primary_photo_url = first_photo

    list_date = _first_value(
        listing.get("list_date"),
        listing.get("listing_date"),
        description.get("list_date"),
    )
    last_sold_date = _first_value(
        listing.get("last_sold_date"),
        description.get("last_sold_date"),
    )

    normalized = {
        "external_id": str(external_id),
        "address_line": address_line or "",
        "city": city or "",
        "state": state or "",
        "postal_code": postal_code or "",
        "status": listing.get("status") or "",
        "property_type": _first_value(listing.get("property_type"), description.get("type")) or "",
        "sub_type": _first_value(listing.get("sub_type"), description.get("sub_type")) or "",
        "price": _to_int(_first_value(listing.get("price"), listing.get("list_price"), description.get("price"))),
        "beds": _to_int(_first_value(listing.get("beds"), description.get("beds"))),
        "baths": _to_float(_first_value(listing.get("baths"), description.get("baths"))),
        "sqft": _to_int(_first_value(listing.get("sqft"), description.get("sqft"))),
        "lot_sqft": _to_int(_first_value(listing.get("lot_sqft"), description.get("lot_sqft"))),
        "lat": _to_float(_first_value(coordinate.get("lat"), location.get("lat"), location.get("latitude"))),
        "lng": _to_float(_first_value(coordinate.get("lon"), location.get("lon"), location.get("lng"), location.get("longitude"))),
        "list_date": _parse_list_date(list_date),
        "last_sold_date": parse_date(last_sold_date) if isinstance(last_sold_date, str) else None,
        "primary_photo_url": primary_photo_url or "",
    }
    return normalized


class Command(BaseCommand):
    help = "Ingest listings from Realty in US and upsert into House."

    def add_arguments(self, parser):
        parser.add_argument("--zip", dest="postal_code", required=True)
        parser.add_argument("--limit", type=int, default=200)
        parser.add_argument("--offset", type=int, default=0)

    def handle(self, *args, **options):
        api_key = os.environ.get("REALTY_RAPIDAPI_KEY") or os.environ.get("RAPIDAPI_KEY")
        if not api_key:
            raise CommandError("Missing REALTY_RAPIDAPI_KEY or RAPIDAPI_KEY environment variable.")

        payload = {
            "limit": options["limit"],
            "offset": options["offset"],
            "postal_code": options["postal_code"],
            "status": STATUS_FILTERS,
            "sort": SORT_BY,
        }
        headers = {
            "Content-Type": "application/json",
            "x-rapidapi-host": API_HOST,
            "x-rapidapi-key": api_key,
        }

        request = Request(
            LIST_ENDPOINT,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with urlopen(request, timeout=30) as response:
                raw_body = response.read().decode("utf-8")
        except HTTPError as exc:
            raise CommandError(f"Realty API error {exc.code}: {exc.read().decode('utf-8')}") from exc
        except URLError as exc:
            raise CommandError(f"Network error: {exc}") from exc

        try:
            payload = json.loads(raw_body)
        except json.JSONDecodeError as exc:
            raise CommandError(f"Invalid JSON response: {exc}") from exc

        listings = _extract_listings(payload)
        if not listings:
            self.stdout.write(self.style.WARNING("No listings found in API response."))
            return
        self.stdout.write(f"Fetched {len(listings)} listings from API.")

        created_count = 0
        updated_count = 0

        for listing in listings:
            if not isinstance(listing, dict):
                continue
            normalized = _normalize_listing(listing)
            if not normalized:
                continue
            if not normalized.get("postal_code"):
                normalized["postal_code"] = options["postal_code"]
            external_id = normalized.pop("external_id")
            house, created = House.objects.update_or_create(
                source="realty_in_us",
                external_id=external_id,
                defaults=normalized,
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        if created_count == 0 and updated_count == 0:
            self.stdout.write(self.style.WARNING("No records were created or updated."))

        self.stdout.write(
            self.style.SUCCESS(
                f"Ingested {created_count + updated_count} listings "
                f"(created={created_count}, updated={updated_count})."
            )
        )
