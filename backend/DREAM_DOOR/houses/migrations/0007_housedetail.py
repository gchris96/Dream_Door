from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("houses", "0006_housesave"),
    ]

    operations = [
        migrations.CreateModel(
            name="HouseDetail",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("payload", models.JSONField(default=dict)),
                ("fetched_at", models.DateTimeField(auto_now=True)),
                (
                    "house",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="detail",
                        to="houses.house",
                    ),
                ),
            ],
        ),
    ]
