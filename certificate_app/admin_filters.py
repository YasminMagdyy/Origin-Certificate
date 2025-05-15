from django.contrib import admin
from .models import Branch

class BranchFilter(admin.SimpleListFilter):
    title = 'Branch'
    parameter_name = 'branch'

    def lookups(self, request, model_admin):
        if request.user.is_superuser:
            branches = Branch.objects.all()
        elif hasattr(request.user, 'userprofile') and request.user.userprofile.branch:
            branches = Branch.objects.filter(id=request.user.userprofile.branch.id)
        else:
            branches = Branch.objects.none()
        return [(b.id, b.name) for b in branches]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(Branch__id=self.value())
        return queryset