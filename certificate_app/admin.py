from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import (Office, Company, Country, Cargo, Certificate, 
                    Shipment, Branch, UserProfile)
from .admin_filters import BranchFilter

admin.site.unregister(User)

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'User Profile'
    fk_name = 'user'
    fields = ('branch', 'is_branch_admin', 'is_branch_user')

class CustomUserAdmin(UserAdmin):
    inlines = (UserProfileInline,)
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'get_branch', 'get_role')
    list_select_related = ('userprofile',)
    
    def get_branch(self, obj):
        return obj.userprofile.branch.name if hasattr(obj, 'userprofile') and obj.userprofile.branch else None
    get_branch.short_description = 'Branch'

    def get_role(self, obj):
        if obj.is_superuser:
            return "Super Admin"
        elif hasattr(obj, 'userprofile') and obj.userprofile.is_branch_admin:
            return "Branch Admin"
        elif hasattr(obj, 'userprofile') and obj.userprofile.is_branch_user:
            return "Branch User"
        return "No Role"

    def get_inline_instances(self, request, obj=None):
        if not obj:
            return list()
        return super().get_inline_instances(request, obj)

admin.site.register(User, CustomUserAdmin)

@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ('CertificateNumber', 'Company', 'Branch', 'IssueDate')
    search_fields = ('CertificateNumber', 'Company__CompanyName')
    list_filter = (BranchFilter, 'IssueDate')
    raw_id_fields = ('Company', 'ExportCountry', 'OriginCountry', 'Office', 'Branch')
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        if hasattr(request.user, 'userprofile') and request.user.userprofile.branch:
            return qs.filter(Branch=request.user.userprofile.branch)
        return qs.none()

    def has_add_permission(self, request):
        return request.user.is_superuser or hasattr(request.user, 'userprofile')


    def has_change_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        if obj and hasattr(request.user, 'userprofile') and request.user.userprofile.is_branch_admin:
            return obj.Branch == request.user.userprofile.branch
        return False

    def has_delete_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        if obj and hasattr(request.user, 'userprofile') and request.user.userprofile.is_branch_admin:
            return obj.Branch == request.user.userprofile.branch
        return False

    def save_model(self, request, obj, form, change):
        if not obj.Branch and hasattr(request.user, 'userprofile') and request.user.userprofile.branch:
            obj.Branch = request.user.userprofile.branch
        super().save_model(request, obj, form, change)

@admin.register(Office)
class OfficeAdmin(admin.ModelAdmin):
    list_display = ('OfficeName',)
    search_fields = ('OfficeName',)

@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('CompanyName', 'CompanyAddress', 'CompanyType', 'CompanyStatus')
    search_fields = ('CompanyName', 'CompanyType', 'CompanyStatus')
    list_filter = ('CompanyType', 'CompanyStatus')

@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ('CountryName',)
    search_fields = ('CountryName',)

@admin.register(Cargo)
class CargoAdmin(admin.ModelAdmin):
    list_display = ('ExportedGoods',)
    search_fields = ('ExportedGoods',)

@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ('certificate', 'cargo', 'quantity', 'cost_amount')
    search_fields = ('certificate__CertificateNumber', 'cargo__ExportedGoods')
    list_filter = ('cargo',)
    raw_id_fields = ('certificate', 'cargo')