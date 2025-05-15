from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand
from certificate_app.models import Certificate, Cargo, Country

class Command(BaseCommand):
    help = 'Set up groups and permissions for branches'

    def handle(self, *args, **kwargs):
        branches = ['محطة الرمل', 'السلطان حسين', 'الاستثماري']

        # Define custom permissions
        try:
            certificate_ct = ContentType.objects.get_for_model(Certificate)
            cargo_ct = ContentType.objects.get_for_model(Cargo)
            country_ct = ContentType.objects.get_for_model(Country)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error accessing models: {e}'))
            return

        permissions = [
            ('view_report', 'Can view report', certificate_ct),
            ('can_save_certificate', 'Can save new certificates', certificate_ct),
            ('can_edit_certificate', 'Can edit certificates', certificate_ct),
            ('can_delete_certificate', 'Can delete certificates', certificate_ct),
            ('can_edit_cargo', 'Can edit cargo', cargo_ct),
            ('can_edit_country', 'Can edit country', country_ct),
        ]

        for codename, name, content_type in permissions:
            Permission.objects.get_or_create(
                codename=codename,
                name=name,
                content_type=content_type
            )

        # Super Admin group
        super_admin_group, _ = Group.objects.get_or_create(name='super_admin')
        super_admin_group.permissions.set(Permission.objects.filter(
            codename__in=[
                'view_report',
                'can_save_certificate',
                'can_edit_certificate',
                'can_delete_certificate',
                'can_edit_cargo',
                'can_edit_country'
            ]
        ))

        # Branch-specific groups
        for branch in branches:
            # Branch Admin group
            admin_group, _ = Group.objects.get_or_create(name=f'{branch}_admin')
            admin_group.permissions.set(Permission.objects.filter(
                codename__in=[
                    'view_report',
                    'can_save_certificate',
                    'can_edit_certificate',
                    'can_delete_certificate',
                    'can_edit_cargo',
                    'can_edit_country'
                ]
            ))

            # Branch User group (save + view only)
            user_group, _ = Group.objects.get_or_create(name=f'{branch}_user')
            user_group.permissions.set(Permission.objects.filter(
                codename__in=['view_report', 'can_save_certificate']
            ))

        self.stdout.write(self.style.SUCCESS('Groups and permissions set up successfully'))