from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("houses", "0008_housephoto"),
    ]

    operations = [
        migrations.CreateModel(
            name="HouseImportError",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("external_id", models.CharField(blank=True, max_length=100)),
                ("import_type", models.CharField(max_length=20)),
                ("error_message", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "house",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="import_errors",
                        to="houses.house",
                    ),
                ),
            ],
        ),
    ]
