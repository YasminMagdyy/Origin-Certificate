from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('filter/', views.filter, name='filter'),
    path('cargo/', views.cargo, name='cargo'),
    path('countries/', views.country, name='country'),
    path('report/', views.report_view, name='report'),
    path('add_item/', views.add_item, name='add_item'),
    path('get_items/', views.get_items, name='get_items'),
    path('save-certificate/', views.save_certificate, name='save_certificate'),
    path('filter_certificates/', views.filter_certificates, name='filter_certificates'),
    path('get-company-data/', views.get_company_data, name='get_company_data'),
    # New endpoints for certificate update and delete with new function names:
    path('update-certificate/<int:certificate_id>/', views.update_certificate, name='update_certificate'),
    path('delete-certificate/<int:certificate_id>/', views.delete_certificate, name='delete_certificate'),
    # New endpoints for Cargo update and delete
    path('update-cargo/<int:cargo_id>/', views.update_cargo, name='update_cargo'),
    path('delete-cargo/<int:cargo_id>/', views.delete_cargo, name='delete_cargo'),
    # New endpoints for Country update and delete
    path('update-country/<int:country_id>/', views.update_country, name='update_country'),
    path('delete-country/<int:country_id>/', views.delete_country, name='delete_country'),
    # Endpoints to refresh dropdown option lists:
    path('get-cargo-options/', views.get_cargo_options, name='get_cargo_options'),
    path('get-country-options/', views.get_country_options, name='get_country_options'),
    path('report_download/<str:file_format>/', views.download_report, name='report_download'), 
]
