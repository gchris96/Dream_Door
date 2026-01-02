from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("houses", "0007_housedetail"),
    ]

    operations = [
        migrations.CreateModel(
            name="HousePhoto",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("payload", models.JSONField(default=list)),
                ("fetched_at", models.DateTimeField(auto_now=True)),
                (
                    "house",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="photos",
                        to="houses.house",
                    ),
                ),
            ],
        ),
    ]
