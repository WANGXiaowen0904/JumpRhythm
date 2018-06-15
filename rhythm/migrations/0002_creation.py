# Generated by Django 2.0.5 on 2018-06-15 14:52

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('rhythm', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Creation',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('record', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('last_edited_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
