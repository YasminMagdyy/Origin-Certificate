from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

urlpatterns = [
    # Core pages
    path('', views.custom_login, name='login'),
    path('login/', views.custom_login, name='login'),
    path('login/', views.custom_logout, name='logout'),
    path('index/', views.index, name='index'),
    path('filter/', views.filter, name='filter'),
    path('cargo/', views.cargo, name='cargo'),
    path('countries/', views.country, name='country'),
    path('report/', views.report_view, name='report'),
        
    # Item management
    path('add_item/', views.add_item, name='add_item'),
    path('get_items/', views.get_items, name='get_items'),
    
    # Certificate operations
    path('save-certificate/', views.save_certificate, name='save_certificate'),
    path('filter_certificates/', views.filter_certificates, name='filter_certificates'),
    path('update-certificate/<int:certificate_id>/', views.update_certificate, name='update_certificate'),
    path('delete-certificate/<int:certificate_id>/', views.delete_certificate, name='delete_certificate'),
    
    # Company data
    path('get-company-data/', views.get_company_data, name='get_company_data'),
    
    # Cargo operations
    path('update-cargo/<int:cargo_id>/', views.update_cargo, name='update_cargo'),
    path('delete-cargo/<int:cargo_id>/', views.delete_cargo, name='delete_cargo'),
    
    # Country operations
    path('update-country/<int:country_id>/', views.update_country, name='update_country'),
    path('delete-country/<int:country_id>/', views.delete_country, name='delete_country'),
    
    # Dropdown options
    path('get-cargo-options/', views.get_cargo_options, name='get_cargo_options'),
    path('get-country-options/', views.get_country_options, name='get_country_options'),
    
    # Report downloads
    path('report_download/<str:file_format>/', views.download_report, name='report_download'),
    path('empty_report_download/<str:file_format>/', views.empty_report_download, name='empty_report_download'),
    
    # Search endpoints
    path('search_countries/', views.search_countries, name='search_countries'),
    path('search_cargos/', views.search_cargos, name='search_cargos'),
    
    # New endpoint for user info
    # path('get_user_info/', views.get_user_info, name='get_user_info'),
]