# Generated by Django 5.1.5 on 2025-02-23 08:59

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('certificate_app', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='certificate',
            name='quantity_unit',
            field=models.CharField(choices=[('طن', 'طن'), ('كجم', 'كجم'), ('وحده', 'وحده')], default='kg', max_length=10),
        ),
    ]
