import json
from pathlib import Path
import os
import sys
import django

# --- Add project root to Python path ---
BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(BASE_DIR))

# --- Django setup ---
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "DREAM_DOOR.settings")
django.setup()

from django.conf import settings
from houses.models import House

# --- Load JSON ---
data_path = Path(settings.BASE_DIR).parent / "data" / "houses.json"

with open(data_path) as f:
    houses = json.load(f)

# --- Reset + insert ---
House.objects.all().delete()

for h in houses:
    House.objects.create(
        price=h["price"],
        beds=h["beds"],
        baths=h["baths"],
        address=h["address"],
        description=h.get("description", ""),
        image_urls=h["image_urls"],
    )

print(f"✅ Loaded {len(houses)} houses")
