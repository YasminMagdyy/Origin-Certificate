from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods, require_POST, require_GET
from .models import Office, Company, Country, Cargo, Certificate, Shipment, Branch, UserProfile
import json
import logging
import unicodedata
import re
import string
from django.http import HttpResponse
from django.contrib import messages
from djmoney.money import Money
from decimal import Decimal, InvalidOperation
import io
import pandas as pd
from django.db.models import Sum
from django.views.decorators.http import require_GET
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.contrib.auth import authenticate, login, logout

logger = logging.getLogger(__name__)

def custom_login(request):
    # If user is already authenticated, redirect to home
    if request.user.is_authenticated:
        return redirect('index')
    
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        # Authenticate using Django's admin user database
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            if user.is_active:  # Check if user account is active
                login(request, user)
                # Redirect based on user type
                if user.is_superuser:
                    return redirect('admin:index')  # Superusers go to admin panel
                else:
                    return redirect('index')  # Regular users go to main app
            else:
                messages.error(request, 'حسابك غير مفعل. يرجى التواصل مع المسؤول.')
        else:
            messages.error(request, 'اسم المستخدم أو كلمة المرور غير صحيحة.')
    
    return render(request, 'login.html')
    
def custom_logout(request):
    logout(request)
    return redirect('login')
    
# ====================== PERMISSION DECORATORS ======================
def branch_permission_required(view_func):
    def wrapper(request, *args, **kwargs):
        if request.user.is_superuser:
            return view_func(request, *args, **kwargs)
        
        profile = getattr(request.user, 'userprofile', None)
        if not profile or not profile.branch:
            raise PermissionDenied("You don't have branch permissions")
            
        # Allow branch admins and branch users to access, or adjust as needed
        if profile.is_branch_admin or profile.is_branch_user:
            return view_func(request, *args, **kwargs)
        
        raise PermissionDenied("Insufficient permissions")
    return wrapper

def branch_admin_required(view_func):
    """Decorator for views that require branch admin privileges"""
    def wrapper(request, *args, **kwargs):
        if request.user.is_superuser:
            return view_func(request, *args, **kwargs)
        if (hasattr(request.user, 'userprofile') and 
            request.user.userprofile.branch and 
            request.user.userprofile.is_branch_admin):
            return view_func(request, *args, **kwargs)
        raise PermissionDenied("Branch admin privileges required")
    return wrapper

# ====================== HELPER FUNCTIONS ======================
def remove_all_diacritics(text):
    """Remove all diacritical marks from text"""
    normalized = unicodedata.normalize('NFD', text)
    return ''.join(c for c in normalized if unicodedata.category(c) != 'Mn')

def normalize_text(text):
    """Normalize text by standardizing characters and removing diacritics"""
    if text is None:
        return None

    text = ' '.join(text.strip().split())
    text = unicodedata.normalize('NFKC', text)

    # Arabic normalization
    for ch in ['أ', 'إ', 'آ']:
        text = text.replace(ch, 'ا')
    for ch in ['لأ', 'لإ', 'لآ']:
        text = text.replace(ch, 'لا')
    text = text.replace('ة', 'ه')

    # English normalization
    text = text.lower()
    text = re.sub(r'[{}]'.format(re.escape(string.punctuation)), '', text)
    text = ''.join(
        char for char in unicodedata.normalize('NFD', text)
        if unicodedata.category(char) != 'Mn'
    )
    return text

def get_user_branch(request):
    """Helper to get user's branch or None"""
    if request.user.is_superuser:
        return None  # Superusers can see all branches
    if hasattr(request.user, 'userprofile'):
        return request.user.userprofile.branch
    return None

# ====================== VIEWS ======================

@login_required
def index(request):
    return render(request, 'index.html')

@login_required
@branch_permission_required
def filter(request):
    branch = get_user_branch(request)
    certificates = Certificate.objects.all()
    
    if branch:
        certificates = certificates.filter(Branch=branch)
        
    return render(request, 'filter.html', {'certificates': certificates})

@login_required
def cargo(request):
    cargos = Cargo.objects.all()
    return render(request, 'cargo.html', {'cargos': cargos})

@login_required
def country(request):
    countries = Country.objects.all()
    return render(request, 'country.html', {'countries': countries})

@login_required
@branch_permission_required
def generate_report(request):
    branch = get_user_branch(request)
    certificates = Certificate.objects.all()
    
    if branch:
        certificates = certificates.filter(Branch=branch)
    
    context = {'certificates': certificates}
    return render(request, 'report.html', context)

# ====================== ITEM MANAGEMENT ======================
@csrf_exempt
@require_POST
@login_required
def add_item(request):
    """Add new cargo or country (accessible to all authenticated users)"""
    item_type = request.POST.get('item_type')
    item_name = request.POST.get('item_name', '').strip()

    if not item_type or not item_name:
        return JsonResponse({'success': False, 'message': 'بيانات غير صالحة.'})
    
    normalized_item_name = normalize_text(item_name)
    
    if item_type == 'cargo':
        if Cargo.objects.filter(ExportedGoods=normalized_item_name).exists():
            return JsonResponse({'success': False, 'message': 'هذا العنصر موجود بالفعل'})
        cargo = Cargo.objects.create(ExportedGoods=normalized_item_name)
        items = list(Cargo.objects.all().values('id', 'ExportedGoods'))
        return JsonResponse({'success': True, 'created': True, 'items': items})
    
    elif item_type in ['exportCountry', 'originCountry']:
        if Country.objects.filter(CountryName=normalized_item_name).exists():
            return JsonResponse({'success': False, 'message': 'هذا العنصر موجود بالفعل'})
        country = Country.objects.create(CountryName=normalized_item_name)
        items = list(Country.objects.all().values('id', 'CountryName'))
        return JsonResponse({'success': True, 'created': True, 'items': items})
    
    return JsonResponse({'success': False, 'message': 'نوع العنصر غير صالح.'})

@csrf_exempt
@require_GET
@login_required
def get_items(request):
    """Get items for dropdowns (accessible to all authenticated users)"""
    item_type = request.GET.get('item_type')
    if not item_type:
        return JsonResponse({'success': False, 'message': 'item_type not provided.'})
    
    if item_type == 'cargo':
        items = list(Cargo.objects.all().values('id', 'ExportedGoods'))
    elif item_type in ['exportCountry', 'originCountry']:
        items = list(Country.objects.all().values('id', 'CountryName'))
    else:
        return JsonResponse({'success': False, 'message': 'Invalid item_type.'})
    
    return JsonResponse({'success': True, 'items': items})

# ====================== CERTIFICATE OPERATIONS ======================
@csrf_exempt
@require_GET
@login_required
@branch_permission_required
def get_company_data(request):
    """Get company data (restricted to user's branch)"""
    office = request.GET.get('office')
    registration_number = request.GET.get('registrationNumber')
    branch = get_user_branch(request)

    try:
        query = Certificate.objects.filter(
            Office__OfficeName=office,
            RegistrationNumber=registration_number
        )
        
        if branch:
            query = query.filter(Branch=branch)
            
        certificate = query.first()
        if not certificate:
            return JsonResponse({'error': 'Company not found'}, status=404)
            
        company = certificate.Company
        data = {
            'companyName': company.CompanyName,
            'companyAddress': company.CompanyAddress,
            'companyStatus': company.CompanyStatus,
            'companyType': company.CompanyType,
        }
        return JsonResponse(data)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_POST
@login_required
@branch_permission_required
def save_certificate(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

    try:
        data = json.loads(request.body)
        logger.info(f"Received data: {data}")

        # Validate required fields
        required_fields = [
            'certificateNumber', 'companyName', 'companyAddress', 'companyStatus', 'companyType',
            'exportCountry', 'originCountry', 'processDate', 'receiptNumber', 'receiptDate', 'paymentAmount',
            'quantity_unit', 'cost_currency'
        ]
        for field in required_fields:
            if field not in data or data[field] is None:
                return JsonResponse({'status': 'error', 'message': f'Missing or invalid {field}'}, status=400)

        # Validate dropdown fields
        if data['companyStatus'] not in ['مقيد', 'غير مقيد']:
            return JsonResponse({'status': 'error', 'message': 'Invalid companyStatus value'}, status=400)
        if data['companyType'] not in ['شركه', 'فردي']:
            return JsonResponse({'status': 'error', 'message': 'Invalid companyType value'}, status=400)

        # Normalize and process data
        if request.user.is_superuser:
            branch_name = normalize_text(data.get('branchName', ''))
            if not branch_name:
                return JsonResponse(
                    {'status': 'error', 'message': 'Superusers must select a branch'},
                    status=400
                )
            branch, _ = Branch.objects.get_or_create(name=branch_name)
        else:
            branch = get_user_branch(request)
        office_name = normalize_text(data.get('office', ''))
        branch_name = branch.name if branch else normalize_text(data.get('branchName', ''))
        company_status = normalize_text(data.get('companyStatus'))
        registration_number = "غير موجود" if company_status == 'غير مقيد' else normalize_text(data.get('registrationNumber', ''))

        # Handle office
        if company_status == 'مقيد' and office_name:
            office, _ = Office.objects.get_or_create(OfficeName=office_name)
        else:
            office, _ = Office.objects.get_or_create(OfficeName="غير موجود")

        # Handle company
        company, _ = Company.objects.get_or_create(
            CompanyName=normalize_text(data['companyName']),
            defaults={
                'CompanyAddress': normalize_text(data['companyAddress']),
                'CompanyType': normalize_text(data['companyType']),
                'CompanyStatus': company_status,
                'importCompanyName': normalize_text(data.get('importCompanyName', '')) or None,
                'importCompanyAddress': normalize_text(data.get('importCompanyAddress', '')) or None,
                'importCompanyPhone': normalize_text(data.get('importCompanyPhone', '')) or None,
            }
        )

        # Handle countries
        export_country, _ = Country.objects.get_or_create(
            CountryName=normalize_text(data['exportCountry'])
        )
        origin_country, _ = Country.objects.get_or_create(
            CountryName=normalize_text(data['originCountry'])
        )

        # Create certificate
        certificate = Certificate.objects.create(
            Office=office,
            Branch=branch,
            BranchName=branch_name,
            Company=company,
            RegistrationNumber=registration_number,
            CertificateNumber=normalize_text(data['certificateNumber']),
            ExportCountry=export_country,
            OriginCountry=origin_country,
            IssueDate=data['processDate'],
            ReceiptNumber=data['receiptNumber'],
            ReceiptDate=data['receiptDate'],
            PaymentAmount=data['paymentAmount'],
            quantity_unit=data['quantity_unit'],
            default_currency=data['cost_currency']
        )

        # Process shipments
        shipments_data = data.get('shipments', [])
        saved_shipments = []
        for shipment in shipments_data:
            cargo_name = shipment.get('cargo')
            if not cargo_name:
                continue
                
            cargo_obj, _ = Cargo.objects.get_or_create(
                ExportedGoods=normalize_text(cargo_name)
            )
            
            try:
                shipment_quantity = Decimal(str(shipment.get('quantity')))
                shipment_cost = Decimal(str(shipment.get('cost_amount')))
            except (InvalidOperation, TypeError, ValueError):
                return JsonResponse(
                    {'status': 'error', 'message': 'Invalid shipment values'},
                    status=400
                )

            shipment_obj = Shipment.objects.create(
                certificate=certificate,
                cargo=cargo_obj,
                quantity=shipment_quantity,
                cost_amount=shipment_cost
            )
            
            saved_shipments.append({
                'cargo': cargo_obj.ExportedGoods,
                'quantity': float(shipment_obj.quantity),
                'cost_amount': float(shipment_obj.cost_amount)
            })

        # Prepare response
        response_data = {
            'status': 'success',
            'message': 'Certificate saved successfully!',
            'certificateId': certificate.id,
            'branchName': certificate.Branch.name if certificate.Branch else certificate.BranchName,  # Add saved branch name
            'shipments': saved_shipments,
            'total_quantity': float(certificate.total_quantity or 0),
            'total_cost': float(certificate.total_cost.amount or 0),
            'quantity_unit': certificate.quantity_unit,
            'currency': certificate.default_currency
        }
        return JsonResponse(response_data)

    except Exception as e:
        logger.error(f"Error saving certificate: {str(e)}")
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["PUT", "POST"])
@login_required
@branch_permission_required
def update_certificate(request, certificate_id):
    """Update certificate (restricted to user's branch)"""
    try:
        data = json.loads(request.body)
        logger.info(f"Updating certificate {certificate_id} with data: {data}")

        # Validate required fields
        required_fields = ['certificateNumber', 'companyName', 'companyStatus', 'companyType']
        for field in required_fields:
            if field not in data or not data[field]:
                return JsonResponse(
                    {'status': 'error', 'message': f'Missing or invalid {field}'},
                    status=400
                )

        # Validate dropdown fields
        if data['companyStatus'] not in ['مقيد', 'غير مقيد']:
            return JsonResponse(
                {'status': 'error', 'message': 'Invalid companyStatus value'},
                status=400
            )
        if data['companyType'] not in ['شركه', 'فردي']:
            return JsonResponse(
                {'status': 'error', 'message': 'Invalid companyType value'},
                status=400
            )

        # Get certificate with branch check
        branch = get_user_branch(request)
        certificate = Certificate.objects.get(id=certificate_id)
        
        if branch and certificate.Branch != branch:
            return JsonResponse(
                {'status': 'error', 'message': 'Permission denied'},
                status=403
            )

        # Update certificate fields
        certificate.CertificateNumber = normalize_text(data['certificateNumber'])
        certificate.quantity_unit = data.get('quantity_unit', certificate.quantity_unit)
        certificate.default_currency = data.get('cost_currency', certificate.default_currency)
        
        # Handle RegistrationNumber based on companyStatus
        company_status = normalize_text(data['companyStatus'])
        if company_status == 'غير مقيد':
            certificate.RegistrationNumber = "غير موجود"
        else:
            registration_number = normalize_text(data.get('registrationNumber', ''))
            if not registration_number:
                return JsonResponse(
                    {'status': 'error', 'message': 'RegistrationNumber is required for مقيد status'},
                    status=400
                )
            certificate.RegistrationNumber = registration_number

        # Handle office
        if company_status == 'غير مقيد':
            office, _ = Office.objects.get_or_create(OfficeName="غير موجود")
        else:
            office_name = normalize_text(data.get('office', ''))
            if not office_name:
                return JsonResponse(
                    {'status': 'error', 'message': 'Office name is required for مقيد status'},
                    status=400
                )
            office, _ = Office.objects.get_or_create(OfficeName=office_name)
        certificate.Office = office

        # Handle company
        company, created = Company.objects.get_or_create(
            CompanyName=normalize_text(data['companyName']),
            defaults={
                'CompanyAddress': normalize_text(data.get('companyAddress', '')),
                'CompanyType': normalize_text(data['companyType']),
                'CompanyStatus': company_status,
                'importCompanyName': normalize_text(data.get('importCompanyName', '')) or None,
                'importCompanyAddress': normalize_text(data.get('importCompanyAddress', '')) or None,
                'importCompanyPhone': normalize_text(data.get('importCompanyPhone', '')) or None,
            }
        )
        if not created:
            # Update all fields for existing company
            company.CompanyAddress = normalize_text(data.get('companyAddress', ''))
            company.CompanyType = normalize_text(data['companyType'])
            company.CompanyStatus = company_status
            company.importCompanyName = normalize_text(data.get('importCompanyName', '')) or None
            company.importCompanyAddress = normalize_text(data.get('importCompanyAddress', '')) or None
            company.importCompanyPhone = normalize_text(data.get('importCompanyPhone', '')) or None
            company.save()
        certificate.Company = company

        # Handle countries
        export_country_name = normalize_text(data.get('exportCountry', ''))
        origin_country_name = normalize_text(data.get('originCountry', ''))
        if not export_country_name or not origin_country_name:
            return JsonResponse(
                {'status': 'error', 'message': 'ExportCountry and OriginCountry are required'},
                status=400
            )
        export_country, _ = Country.objects.get_or_create(CountryName=export_country_name)
        origin_country, _ = Country.objects.get_or_create(CountryName=origin_country_name)
        certificate.ExportCountry = export_country
        certificate.OriginCountry = origin_country

        # Update other fields
        if data.get('processDate'):
            certificate.IssueDate = data['processDate']
        if data.get('receiptNumber'):
            certificate.ReceiptNumber = data['receiptNumber']
        if data.get('receiptDate'):
            certificate.ReceiptDate = data['receiptDate']
        if data.get('paymentAmount'):
            certificate.PaymentAmount = data['paymentAmount']

        certificate.save()

        # Update shipments
        certificate.shipments.all().delete()
        shipments_data = data.get('shipments', [])
        for shipment in shipments_data:
            cargo_name = normalize_text(shipment.get('cargo'))
            if not cargo_name:
                continue
                
            cargo, _ = Cargo.objects.get_or_create(ExportedGoods=cargo_name)
            try:
                quantity = Decimal(str(shipment.get('quantity', '0')))
                cost_amount = Decimal(str(shipment.get('cost_amount', '0')))
            except (InvalidOperation, TypeError, ValueError):
                return JsonResponse(
                    {'status': 'error', 'message': 'Invalid shipment values'},
                    status=400
                )
                
            Shipment.objects.create(
                certificate=certificate,
                cargo=cargo,
                quantity=quantity,
                cost_amount=cost_amount
            )

        return JsonResponse({
            'status': 'success',
            'message': 'Certificate updated successfully'
        })

    except Certificate.DoesNotExist:
        return JsonResponse(
            {'status': 'error', 'message': 'Certificate not found'},
            status=404
        )
    except Exception as e:
        logger.error(f"Error updating certificate: {str(e)}")
        return JsonResponse(
            {'status': 'error', 'message': str(e)},
            status=500
        )

@login_required
@branch_permission_required
def filter_certificates(request):
    """Filter certificates (restricted to user's branch)"""
    office = request.GET.get('office', '').strip()
    registration_number = request.GET.get('registrationNumber', '').strip()
    branch = get_user_branch(request)

    certificates = Certificate.objects.select_related(
        'Office', 'Company', 'OriginCountry', 'ExportCountry'
    ).prefetch_related('shipments', 'shipments__cargo')

    # For superusers, show all certificates unless filtered by branch
    if branch:
        certificates = certificates.filter(Branch=branch)
    elif not request.user.is_superuser:
        # Non-superusers without a branch shouldn't see anything
        certificates = certificates.none()

    if office:
        certificates = certificates.filter(Office__OfficeName__icontains=office)
    if registration_number:
        certificates = certificates.filter(RegistrationNumber__icontains=registration_number)
    
    results = []
    for cert in certificates:
        shipments = cert.shipments.all()
        shipment_details = [{
            'cargo': s.cargo.ExportedGoods if s.cargo else 'غير محدد',
            'quantity': float(s.quantity) if s.quantity is not None else 0,
            'quantity_unit': cert.quantity_unit if cert.quantity_unit else '',
            'cost_amount': float(s.cost_amount) if s.cost_amount is not None else 0,
            'cost_currency': cert.default_currency if cert.default_currency else '',
        } for s in shipments]
        
        results.append({
            'id': cert.id,
            'office_name': cert.Office.OfficeName if cert.Office else None,
            'branch_name': cert.BranchName,
            'registration_number': cert.RegistrationNumber,
            'certificate_number': cert.CertificateNumber,
            'company_name': cert.Company.CompanyName if cert.Company else '',
            'company_address': cert.Company.CompanyAddress if cert.Company else '',
            'company_status': cert.Company.CompanyStatus if cert.Company else '',
            'company_type': cert.Company.CompanyType if cert.Company else '',
            'import_company_name': cert.Company.importCompanyName if cert.Company else '',
            'import_company_address': cert.Company.importCompanyAddress if cert.Company else '',
            'import_company_phone': cert.Company.importCompanyPhone if cert.Company else '',
            'origin_country': cert.OriginCountry.CountryName if cert.OriginCountry else '',
            'export_country': cert.ExportCountry.CountryName if cert.ExportCountry else '',
            'issue_date': cert.IssueDate.strftime('%Y-%m-%d') if cert.IssueDate else '',
            'receipt_number': cert.ReceiptNumber if cert.ReceiptNumber else '',
            'receipt_date': cert.ReceiptDate.strftime('%Y-%m-%d') if cert.ReceiptDate else '',
            'payment_amount': float(cert.PaymentAmount) if cert.PaymentAmount is not None else 0.0,
            'shipments': shipment_details,
            'quantity_display': f"{cert.total_quantity} {cert.quantity_unit if cert.quantity_unit else ''}",
            'cost_display': f"{cert.total_cost.amount} {cert.total_cost.currency}",
            'exported_goods': ', '.join([s['cargo'] for s in shipment_details]) if shipment_details else 'غير متوفر',
        })
    
    return JsonResponse({'status': 'success', 'certificates': results})

@csrf_exempt
@require_http_methods(["DELETE"])
@login_required
@branch_admin_required
def delete_certificate(request, certificate_id):
    """Delete certificate (restricted to branch admins)"""
    try:
        branch = get_user_branch(request)
        certificate = Certificate.objects.get(id=certificate_id)
        
        if branch and certificate.Branch != branch:
            return JsonResponse(
                {'status': 'error', 'message': 'Permission denied'},
                status=403
            )
            
        certificate.delete()
        return JsonResponse(
            {'status': 'success', 'message': 'Certificate deleted successfully.'}
        )
    except Certificate.DoesNotExist:
        return JsonResponse(
            {'status': 'error', 'message': 'Certificate not found.'},
            status=404
        )
    except Exception as e:
        return JsonResponse(
            {'status': 'error', 'message': str(e)},
            status=400
        )

# ====================== REPORTING ======================
@login_required
@branch_permission_required
def report_view(request):
    """Generate reports (restricted to user's branch)"""
    process_date_from = request.GET.get('process_date_from', '')
    process_date_to = request.GET.get('process_date_to', '')
    export_country_name = request.GET.get('export_country', '')
    cargo_ids_str = request.GET.get('cargo_ids', '')
    branch = get_user_branch(request)
    branch_name = branch.name if branch else request.GET.get('branch_name', '')
    selected_cargo_ids = cargo_ids_str.split(',') if cargo_ids_str else []

    certificates = Certificate.objects.select_related(
        'Office', 'Company', 'ExportCountry', 'OriginCountry'
    ).prefetch_related('shipments__cargo')

    # Branch filtering
    if branch:
        certificates = certificates.filter(Branch=branch)
    elif branch_name and request.user.is_superuser:
        certificates = certificates.filter(Branch__name__icontains=branch_name)
    elif not request.user.is_superuser:
        certificates = certificates.none()

    if process_date_from:
        certificates = certificates.filter(IssueDate__gte=process_date_from)
    if process_date_to:
        certificates = certificates.filter(IssueDate__lte=process_date_to)
    if export_country_name:
        certificates = certificates.filter(ExportCountry__CountryName=export_country_name)
    if selected_cargo_ids and selected_cargo_ids != ['']:
        certificates = certificates.filter(shipments__cargo__id__in=selected_cargo_ids).distinct()

    certificates = certificates.annotate(
        agg_total_cost=Sum('shipments__cost_amount', default=0),
        agg_total_quantity=Sum('shipments__quantity', default=0)
    )

    cargos = Cargo.objects.filter(shipment__certificate__in=certificates).distinct()
    selected_cargos = Cargo.objects.filter(id__in=selected_cargo_ids) if selected_cargo_ids and selected_cargo_ids != [''] else []
    currency_totals = (
        Shipment.objects.filter(certificate__in=certificates)
        .values('certificate__default_currency')
        .annotate(total_cost=Sum('cost_amount'))
        .order_by('certificate__default_currency')
    )

    context = {
        'certificates': certificates,
        'process_date_from': process_date_from,
        'process_date_to': process_date_to,
        'selected_country': export_country_name,
        'selected_cargo_ids': selected_cargo_ids,
        'selected_cargos': selected_cargos,
        'branch_name': branch_name,
        'cargos': Cargo.objects.all(),
        'countries': Country.objects.all(),
        'currency_totals': [
            {
                'cost_currency': total['certificate__default_currency'] or 'غير محدد',
                'total_cost': total['total_cost'] or 0
            }
            for total in currency_totals
        ],
    }
    return render(request, 'report.html', context)

@login_required
@branch_permission_required
def download_report(request, file_format):
    """Download report (restricted to user's branch)"""
    # Get query parameters
    process_date_from = request.GET.get('process_date_from', '')
    process_date_to = request.GET.get('process_date_to', '')
    export_country_name = request.GET.get('export_country', '')
    cargo_ids_str = request.GET.get('cargo_ids', '')
    selected_cargo_ids = [id for id in cargo_ids_str.split(',') if id]  # Filter out empty strings
    selected_columns = request.GET.getlist('columns')
    branch = get_user_branch(request)
    branch_name = request.GET.get('branch_name', '')  # Support branch_name for superusers

    # Build queryset
    certificates = Certificate.objects.select_related(
        'Office', 'Company', 'ExportCountry', 'OriginCountry'
    ).prefetch_related('shipments__cargo')

    # Apply filters
    if branch:
        certificates = certificates.filter(Branch=branch)
    elif branch_name and request.user.is_superuser:
        certificates = certificates.filter(BranchName__icontains=branch_name)
    if process_date_from:
        certificates = certificates.filter(IssueDate__gte=process_date_from)
    if process_date_to:
        certificates = certificates.filter(IssueDate__lte=process_date_to)
    if export_country_name:
        certificates = certificates.filter(ExportCountry__CountryName=export_country_name)
    if selected_cargo_ids:
        certificates = certificates.filter(shipments__cargo__id__in=selected_cargo_ids).distinct()

    # Define all possible headers (matching report.html)
    all_headers = {
        "id": "المعرف",
        "office": "اسم المكتب",
        "reg_number": "رقم السجل",
        "cert_number": "رقم الشهادة",
        "company_name": "اسم الشركة",
        "company_address": "عنوان الشركة",
        "company_status": "حالة الشركة",
        "company_type": "نوع الشركة",
        "branch": "اسم الفرع",
        "import_company": "اسم الشركة المستوردة",
        "import_address": "عنوان الشركة المستوردة",
        "import_phone": "تليفون الشركة المستوردة",
        "cargo": "البضائع",
        "export_country": "بلد التصدير",
        "origin_country": "بلد المنشأ",
        "issue_date": "تاريخ العملية",
        "receipt_number": "رقم الإيصال",
        "receipt_date": "تاريخ الإيصال",
        "payment": "القيمة المدفوعة",
        "quantity": "الكمية",
        "cost": "التكلفة"
    }

    # Prepare headers based on selected columns
    headers = [all_headers[col] for col in selected_columns if col in all_headers] if selected_columns else list(all_headers.values())

    # Prepare data
    data = []
    for cert in certificates:
        shipments = cert.shipments.all()
        if not shipments:
            # Handle certificates with no shipments
            row_data = {
                "id": str(cert.id),
                "office": cert.Office.OfficeName if cert.Office else "",
                "reg_number": cert.RegistrationNumber or "",
                "cert_number": cert.CertificateNumber or "",
                "company_name": cert.Company.CompanyName if cert.Company else "",
                "company_address": cert.Company.CompanyAddress if cert.Company else "",
                "company_status": cert.Company.CompanyStatus if cert.Company else "",
                "company_type": cert.Company.CompanyType if cert.Company else "",
                "branch": cert.BranchName or "",
                "import_company": cert.Company.importCompanyName if cert.Company else "",
                "import_address": cert.Company.importCompanyAddress if cert.Company else "",
                "import_phone": cert.Company.importCompanyPhone if cert.Company else "",
                "cargo": "غير متوفر",
                "export_country": cert.ExportCountry.CountryName if cert.ExportCountry else "",
                "origin_country": cert.OriginCountry.CountryName if cert.OriginCountry else "",
                "issue_date": cert.IssueDate.strftime('%Y-%m-%d') if cert.IssueDate else "",
                "receipt_number": cert.ReceiptNumber or "",
                "receipt_date": cert.ReceiptDate.strftime('%Y-%m-%d') if cert.ReceiptDate else "",
                "payment": f"{cert.PaymentAmount:.2f}" if cert.PaymentAmount else "",
                "quantity": "",
                "cost": ""
            }
            row = [row_data[col] for col in (selected_columns or all_headers.keys())]
            data.append(row)
        else:
            # Create a row for each shipment
            for shipment in shipments:
                row_data = {
                    "id": str(cert.id),
                    "office": cert.Office.OfficeName if cert.Office else "",
                    "reg_number": cert.RegistrationNumber or "",
                    "cert_number": cert.CertificateNumber or "",
                    "company_name": cert.Company.CompanyName if cert.Company else "",
                    "company_address": cert.Company.CompanyAddress if cert.Company else "",
                    "company_status": cert.Company.CompanyStatus if cert.Company else "",
                    "company_type": cert.Company.CompanyType if cert.Company else "",
                    "branch": cert.BranchName or "",
                    "import_company": cert.Company.importCompanyName if cert.Company else "",
                    "import_address": cert.Company.importCompanyAddress if cert.Company else "",
                    "import_phone": cert.Company.importCompanyPhone if cert.Company else "",
                    "cargo": f"{shipment.cargo.ExportedGoods}, {shipment.quantity} {cert.quantity_unit}, {shipment.cost_amount} {cert.default_currency}",
                    "export_country": cert.ExportCountry.CountryName if cert.ExportCountry else "",
                    "origin_country": cert.OriginCountry.CountryName if cert.OriginCountry else "",
                    "issue_date": cert.IssueDate.strftime('%Y-%m-%d') if cert.IssueDate else "",
                    "receipt_number": cert.ReceiptNumber or "",
                    "receipt_date": cert.ReceiptDate.strftime('%Y-%m-%d') if cert.ReceiptDate else "",
                    "payment": f"{cert.PaymentAmount:.2f}" if cert.PaymentAmount else "",
                    "quantity": f"{shipment.quantity:.2f} {cert.quantity_unit}" if shipment.quantity else "",
                    "cost": f"{shipment.cost_amount:.2f} {cert.default_currency}" if shipment.cost_amount else ""
                }
                row = [row_data[col] for col in (selected_columns or all_headers.keys())]
                data.append(row)

    # Handle empty data
    if not data:
        data = [[]]  # Empty row to initialize DataFrame with headers
        messages.warning(request, "لا توجد بيانات للتصدير بناءً على المرشحات المحددة.")

    # Create DataFrame
    try:
        df = pd.DataFrame(data, columns=headers)
    except ValueError as e:
        logger.error(f"DataFrame creation failed: {str(e)}, Data: {data}, Headers: {headers}")
        messages.error(request, "خطأ في إنشاء ملف Excel: البيانات غير متطابقة مع الأعمدة المتوقعة.")
        return render(request, 'report.html', {
            'certificates': [],
            'currency_totals': [],
            'process_date_from': process_date_from,
            'process_date_to': process_date_to,
            'selected_country': export_country_name,
            'branch_name': branch_name,
            'selected_cargos': [],
            'selected_cargo_ids': []
        })

    # Create and return Excel file
    if file_format == 'excel':
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name="Report")
            workbook = writer.book
            worksheet = writer.sheets['Report']
            for idx, col in enumerate(df.columns):
                max_len = max(df[col].astype(str).map(len).max(), len(col)) + 2
                worksheet.set_column(idx, idx, max_len)
        output.seek(0)

        response = HttpResponse(
            output,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response["Content-Disposition"] = 'attachment; filename="report.xlsx"'
        return response

    return HttpResponse("Invalid export type", status=400)

# ====================== SEARCH ENDPOINTS ======================
@require_GET
@login_required
def search_countries(request):
    """Search countries (accessible to all authenticated users)"""
    query = request.GET.get('q', '')
    if query:
        countries = Country.objects.filter(CountryName__icontains=query)[:10]
    else:
        countries = Country.objects.all()[:50]
    data = [{'CountryName': country.CountryName} for country in countries]
    return JsonResponse(data, safe=False)

@require_GET
@login_required
def search_cargos(request):
    """Search cargos (accessible to all authenticated users)"""
    query = request.GET.get('q', '')
    if query:
        cargos = Cargo.objects.filter(ExportedGoods__icontains=query)[:10]
    else:
        cargos = Cargo.objects.all()[:50]
    data = [{'id': cargo.id, 'ExportedGoods': cargo.ExportedGoods} for cargo in cargos]
    return JsonResponse(data, safe=False)

# ====================== ITEM OPERATIONS ======================
@csrf_exempt
@require_http_methods(["PUT"])
@login_required
def update_cargo(request, cargo_id):
    """Update cargo (accessible to all authenticated users)"""
    try:
        data = json.loads(request.body)
        new_goods = data.get('ExportedGoods')
        if not new_goods:
            return JsonResponse(
                {'status': 'error', 'message': 'ExportedGoods is required.'},
                status=400
            )
            
        cargo = Cargo.objects.get(id=cargo_id)
        cargo.ExportedGoods = normalize_text(new_goods)
        cargo.save()
        return JsonResponse(
            {'status': 'success', 'message': 'Cargo updated successfully.'}
        )
    except Cargo.DoesNotExist:
        return JsonResponse(
            {'status': 'error', 'message': 'Cargo not found.'},
            status=404
        )
    except Exception as e:
        return JsonResponse(
            {'status': 'error', 'message': str(e)},
            status=400
        )

@csrf_exempt
@require_http_methods(["DELETE"])
@login_required
def delete_cargo(request, cargo_id):
    """Delete cargo (accessible to all authenticated users)"""
    try:
        cargo = Cargo.objects.get(id=cargo_id)
        cargo.delete()
        return JsonResponse(
            {'status': 'success', 'message': 'Cargo deleted successfully.'}
        )
    except Cargo.DoesNotExist:
        return JsonResponse(
            {'status': 'error', 'message': 'Cargo not found.'},
            status=404
        )
    except Exception as e:
        return JsonResponse(
            {'status': 'error', 'message': str(e)},
            status=400
        )

@csrf_exempt
@require_http_methods(["PUT"])
@login_required
def update_country(request, country_id):
    """Update country (accessible to all authenticated users)"""
    try:
        data = json.loads(request.body)
        new_country_name = data.get('CountryName')
        if not new_country_name:
            return JsonResponse(
                {'status': 'error', 'message': 'CountryName is required.'},
                status=400
            )
            
        country = Country.objects.get(id=country_id)
        country.CountryName = normalize_text(new_country_name)
        country.save()
        return JsonResponse(
            {'status': 'success', 'message': 'Country updated successfully.'}
        )
    except Country.DoesNotExist:
        return JsonResponse(
            {'status': 'error', 'message': 'Country not found.'},
            status=404
        )
    except Exception as e:
        return JsonResponse(
            {'status': 'error', 'message': str(e)},
            status=400
        )

@csrf_exempt
@require_http_methods(["DELETE"])
@login_required
def delete_country(request, country_id):
    """Delete country (accessible to all authenticated users)"""
    try:
        country = Country.objects.get(id=country_id)
        country.delete()
        return JsonResponse(
            {'status': 'success', 'message': 'Country deleted successfully.'}
        )
    except Country.DoesNotExist:
        return JsonResponse(
            {'status': 'error', 'message': 'Country not found.'},
            status=404
        )
    except Exception as e:
        return JsonResponse(
            {'status': 'error', 'message': str(e)},
            status=400
        )

@login_required
def get_cargo_options(request):
    """Get cargo options (accessible to all authenticated users)"""
    cargos = Cargo.objects.all().values('id', 'ExportedGoods')
    return JsonResponse({'cargos': list(cargos)})

@login_required
def get_country_options(request):
    """Get country options (accessible to all authenticated users)"""
    countries = Country.objects.all().values('id', 'CountryName')
    return JsonResponse({'countries': list(countries)})

def empty_report_download(request, file_format):
    """Empty report template (accessible to all)"""
    headers = [
        "اسم المكتب", "رقم السجل", "رقم الشهادة", "اسم الشركة", "عنوان الشركة", 
        "حالة الشركة", "نوع الشركة", "اسم الفرع", "اسم الشركة المستوردة", 
        "عنوان الشركة المستوردة", "تليفون الشركة المستوردة", "البضائع", 
        "بلد المنشأ", "بلد التصدير", "تاريخ العملية", "رقم الإيصال", 
        "تاريخ الإيصال", "القيمة المدفوعة", "الكمية", "التكلفة"
    ]
    df = pd.DataFrame(columns=headers)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name="Empty Report")
    output.seek(0)
    response = HttpResponse(
        output,
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    response["Content-Disposition"] = 'attachment; filename="empty_report.xlsx"'
    return response