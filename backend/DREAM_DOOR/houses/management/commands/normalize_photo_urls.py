import re

from django.core.management.base import BaseCommand

from houses.models import HousePhoto


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


class Command(BaseCommand):
    help = "Normalize stored HousePhoto URLs to prefer size 'o' with 'l' fallback."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int)
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        qs = HousePhoto.objects.select_related("house").order_by("id")
        if options.get("limit"):
            qs = qs[: options["limit"]]

        updated = 0
        for item in qs:
            payload = item.payload or []
            if not isinstance(payload, list):
                continue

            normalized = [_normalize_photo(photo) for photo in payload]
            if normalized == payload:
                continue

            updated += 1
            if options.get("dry_run"):
                changes = []
                for original, updated_photo in zip(payload, normalized):
                    if not isinstance(original, dict) or not isinstance(updated_photo, dict):
                        continue
                    original_href = original.get("href")
                    updated_href = updated_photo.get("href")
                    if original_href and updated_href and original_href != updated_href:
                        changes.append((original_href, updated_href, updated_photo.get("href_fallback")))
                if changes:
                    house_id = item.house_id or "unknown"
                    external_id = item.house.external_id if item.house_id else "unknown"
                    self.stdout.write(
                        self.style.WARNING(
                            f"HousePhoto id={item.id} house_id={house_id} external_id={external_id}:"
                        )
                    )
                    for original_href, updated_href, fallback_href in changes:
                        self.stdout.write(f"  {original_href} -> {updated_href}")
                        if fallback_href:
                            self.stdout.write(f"    fallback: {fallback_href}")
                continue
            item.payload = normalized
            item.save(update_fields=["payload"])

        if options.get("dry_run"):
            self.stdout.write(self.style.WARNING(f"Dry run complete. Would update {updated} records."))
            return

        self.stdout.write(self.style.SUCCESS(f"Updated {updated} HousePhoto records."))
