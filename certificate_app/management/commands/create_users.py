from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Create initial users for all branches'

    def handle(self, *args, **kwargs):
        User = get_user_model()
        branches = ['محطة الرمل', 'السلطان حسين', 'الاستثماري']

        # Create groups if they don't exist (dependency fix)
        Group.objects.get_or_create(name='super_admin')
        for branch in branches:
            Group.objects.get_or_create(name=f'{branch}_admin')
            Group.objects.get_or_create(name=f'{branch}_user')

        # Super Admin
        super_admin, created = User.objects.get_or_create(
            username='super_admin',
            defaults={'is_superuser': True, 'is_staff': True, 'branch': None}
        )
        if created or not super_admin.check_password('securepassword123'):
            super_admin.set_password('securepassword123')
            super_admin.save()
        super_admin.groups.add(Group.objects.get(name='super_admin'))

        # Branch Admins and Users
        for branch in branches:
            # Generate safe username (replace spaces with underscores)
            safe_branch = branch.replace(' ', '_')

            # Branch Admin
            admin_username = f'{safe_branch}_admin'
            admin, created = User.objects.get_or_create(
                username=admin_username,
                defaults={
                    'branch': branch,
                    'is_staff': True,
                    'is_superuser': False
                }
            )
            if created or not admin.check_password('securepassword123'):
                admin.set_password('securepassword123')
                admin.save()
            admin.groups.add(Group.objects.get(name=f'{branch}_admin'))

            # Branch User
            user_username = f'{safe_branch}_user'
            user, created = User.objects.get_or_create(
                username=user_username,
                defaults={
                    'branch': branch,
                    'is_staff': False,
                    'is_superuser': False
                }
            )
            if created or not user.check_password('securepassword123'):
                user.set_password('securepassword123')
                user.save()
            user.groups.add(Group.objects.get(name=f'{branch}_user'))

        self.stdout.write(self.style.SUCCESS('Users created successfully'))