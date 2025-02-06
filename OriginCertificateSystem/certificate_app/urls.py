from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('filter/', views.filter, name='filter'),
   path('search-certificates/', views.search_certificates, name='search_certificates'),
    path('add-item/', views.add_item, name='add_item'),
    path('get-items/', views.get_items, name='get_items'),
    path('save-certificate/', views.save_certificate, name='save_certificate'),
    path('filter_certificates/', views.filter_certificates, name='filter_certificates'),
    path('get-company-data/', views.get_company_data, name='get_company_data'),
    path('update-certificate/<int:certificate_id>/', views.update_certificate, name='update_certificate'),
    path('delete-certificate/<int:certificate_id>/', views.delete_certificate, name='delete_certificate'),
]
