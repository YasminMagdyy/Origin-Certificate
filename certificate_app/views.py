# Create your views here.
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods, require_POST, require_GET
from .models import Office, Company, Country, Cargo, Certificate
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
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics


def index(request):
    return render(request, 'index.html')

def filter(request):
    certificates = Certificate.objects.all()  # Example: Fetch all certificates
    return render(request, 'filter.html', {'certificates': certificates})

def cargo(request):
    cargos = Cargo.objects.all()
    return render(request, 'cargo.html', {'cargos': cargos})

def country(request):
    countries = Country.objects.all()
    return render(request, 'country.html', {'countries': countries})

def generate_report(request):
    # Retrieve all certificate data.
    certificates = Certificate.objects.all()
    
    # Optionally, you can apply filtering, aggregation, or sorting here.
    context = {
        'certificates': certificates,
    }
    return render(request, 'report.html', context)

def remove_all_diacritics(text):
    """
    Remove all diacritical marks from the input text by decomposing it
    (using NFD normalization) and filtering out all non-spacing marks.
    """
    normalized = unicodedata.normalize('NFD', text)
    return ''.join(c for c in normalized if unicodedata.category(c) != 'Mn')

def normalize_text(text):
    """
    Normalize the input text by:
    - Trimming extra spaces.
    - Converting to a standard Unicode form (NFKC).
    - Standardizing Arabic letters (e.g. converting variants of Alef to 'ا',
      la forms to 'لا'and replacing 'ة' with 'ه').
    - Converting to lowercase.
    - Removing punctuation.
    - Removing all diacritical marks (accents and Arabic diacritics).
    """
    # Trim extra spaces
    text = ' '.join(text.strip().split())
    # Normalize Unicode to NFKC
    text = unicodedata.normalize('NFKC', text)
    # Arabic letter standardization
    for ch in ['أ', 'إ', 'آ']:
        text = text.replace(ch, 'ا')
    # Standardize la forms to 'لا'
    for ch in ['لأ', 'لإ', 'لآ']:
        text = text.replace(ch, 'لا')
    # Replace ة with ه
    text = text.replace('ة', 'ه')
    # Convert to lowercase (for English text)
    text = text.lower()
    # Remove punctuation
    text = re.sub(r'[{}]'.format(re.escape(string.punctuation)), '', text)
    # Remove all diacritics (accents for English and Arabic diacritics)
    text = remove_all_diacritics(text)
    return text

def normalize_text(text):
    # Remove extra spaces
    text = ' '.join(text.strip().split())
    # Unicode normalization (this helps make similar characters equivalent)
    text = unicodedata.normalize('NFKC', text)
    
    # ----- Arabic normalization -----
    # Standardize Alef forms to 'ا'
    for ch in ['أ', 'إ', 'آ']:
        text = text.replace(ch, 'ا')
    # Standardize la forms to 'لا'
    for ch in ['لأ', 'لإ', 'لآ']:
        text = text.replace(ch, 'لا')
    # Replace ة with ه
    text = text.replace('ة', 'ه')

    # ----- English normalization -----
    # Convert text to lowercase
    text = text.lower()
    
    # Normalize punctuation:
    # For example, remove all punctuation characters:
    # You can also replace them with a standard character if needed
    text = re.sub(r'[{}]'.format(re.escape(string.punctuation)), '', text)
    
    return text

@csrf_exempt
@require_POST
def add_item(request):
    """
    Adds a new item (either a Cargo or a Country) after normalizing the input.
    For countries (both export and origin), checks if a normalized CountryName exists.
    If it exists, returns an alert message and does not add a duplicate.
    """
    item_type = request.POST.get('item_type')
    item_name = request.POST.get('item_name', '').strip()

    if not item_type or not item_name:
        return JsonResponse({'success': False, 'message': 'بيانات غير صالحة.'})
    
    normalized_item_name = normalize_text(item_name)
    
    if item_type == 'cargo':
        # Check if the normalized cargo already exists
        if Cargo.objects.filter(ExportedGoods=normalized_item_name).exists():
            return JsonResponse({'success': False, 'message': 'هذا العنصر موجود بالفعل'})
        cargo = Cargo.objects.create(ExportedGoods=normalized_item_name)
        items = list(Cargo.objects.all().values('id', 'ExportedGoods'))
        return JsonResponse({'success': True, 'created': True, 'items': items})
    
    elif item_type in ['exportCountry', 'originCountry']:
        # For both export and origin, use only CountryName field.
        if Country.objects.filter(CountryName=normalized_item_name).exists():
            return JsonResponse({'success': False, 'message': 'هذا العنصر موجود بالفعل'})
        country = Country.objects.create(CountryName=normalized_item_name)
        items = list(Country.objects.all().values('id', 'CountryName'))
        return JsonResponse({'success': True, 'created': True, 'items': items})
    
    else:
        return JsonResponse({'success': False, 'message': 'نوع العنصر غير صالح.'})

@csrf_exempt
@require_GET
def get_items(request):
    """
    Returns existing items for a given item_type (cargo, exportCountry, or originCountry)
    so that select elements can be pre-populated.
    For countries, the same list is returned regardless of export or origin.
    """
    item_type = request.GET.get('item_type')
    if not item_type:
        return JsonResponse({'success': False, 'message': 'item_type not provided.'})
    
    if item_type == 'cargo':
        items = list(Cargo.objects.all().values('id', 'ExportedGoods'))
        return JsonResponse({'success': True, 'items': items})
    
    elif item_type in ['exportCountry', 'originCountry']:
        items = list(Country.objects.all().values('id', 'CountryName'))
        return JsonResponse({'success': True, 'items': items})
    
    else:
        return JsonResponse({'success': False, 'message': 'Invalid item_type.'})

@csrf_exempt
def get_company_data(request):
    if request.method == 'GET':
        office = request.GET.get('office')
        registration_number = request.GET.get('registrationNumber')

        print(f"Office: {office}, Registration Number: {registration_number}")  # Add this line

        try:
            # Fetch the certificate based on office and registration number
            certificate = Certificate.objects.filter(
                Office__OfficeName=office,
                RegistrationNumber=registration_number
            )
            certificate = certificate.first() 
            company = certificate.Company

            print(f"Company found: {company.CompanyName}")  # Add this line

            # Prepare the response data
            data = {
                'companyName': company.CompanyName,
                'companyAddress': company.CompanyAddress,
                'companyStatus': company.CompanyStatus,
                'companyType': company.CompanyType,
            }
            return JsonResponse(data)
        except Certificate.DoesNotExist:
            print("Certificate not found")  # Add this line
            return JsonResponse({'error': 'Company not found'}, status=404)
        except Exception as e:
            print(f"Error: {e}")  # Add this line
            return JsonResponse({'error': str(e)}, status=500)
                                             
logger = logging.getLogger(__name__)
@csrf_exempt
def save_certificate(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Validate dropdown fields for CompanyStatus and CompanyType
            if data['companyStatus'] not in ['مقيد', 'غير مقيد']:
                return JsonResponse({'status': 'error', 'message': 'Invalid companyStatus value'}, status=400)
            if data['companyType'] not in ['شركه', 'فردي']:
                return JsonResponse({'status': 'error', 'message': 'Invalid companyType value'}, status=400)
            
            # Normalize input text fields
            office_name = normalize_text(data['office']) if data['office'] else None
            registration_number = normalize_text(data['registrationNumber']) if data['registrationNumber'] else None
            certificate_number = normalize_text(data['certificateNumber'])
            company_name = normalize_text(data['companyName'])
            company_address = normalize_text(data['companyAddress'])
            company_status = normalize_text(data['companyStatus'])
            company_type = normalize_text(data['companyType'])
            cargo_value = normalize_text(data['cargo'])
            export_country_value = normalize_text(data['exportCountry'])
            origin_country_value = normalize_text(data['originCountry'])
            
            # Handle office and registrationNumber based on company status
            if company_status == 'غير مقيد':
                office = None
                registration_number = None
            else:
                if office_name:
                    office, _ = Office.objects.get_or_create(OfficeName=office_name)
                else:
                    office = None

            # Get or create related objects
            company, _ = Company.objects.get_or_create(
                CompanyName=company_name,
                defaults={
                    'CompanyAddress': company_address,
                    'CompanyType': company_type,
                    'CompanyStatus': company_status
                }
            )
            export_country, _ = Country.objects.get_or_create(CountryName=export_country_value)
            origin_country, _ = Country.objects.get_or_create(CountryName=origin_country_value)
            cargo_obj, _ = Cargo.objects.get_or_create(ExportedGoods=cargo_value)
            
            # Retrieve new fields from data
            quantity = data.get('quantity')
            quantity_unit = data.get('quantity_unit')
            cost_value = data.get('cost')
            cost_currency = data.get('cost_currency')
            
            # Create the certificate including the new fields
            certificate = Certificate.objects.create(
                Office=office,  # Office can be None if "غير مقيد"
                Company=company,
                RegistrationNumber=registration_number,  # Can be None if "غير مقيد"
                CertificateNumber=certificate_number,
                ExportCountry=export_country,
                OriginCountry=origin_country,
                ExportedGoods=cargo_obj,
                IssueDate=data['processDate'],
                ReceiptNumber=data['receiptNumber'],
                ReceiptDate=data['receiptDate'],
                PaymentAmount=data['paymentAmount'],
                quantity=quantity,
                quantity_unit=quantity_unit,
                cost=Money(cost_value, cost_currency) if cost_value and cost_currency else None
            )
            
            return JsonResponse({
                'status': 'success',
                'message': 'Certificate saved successfully!',
                'certificateId': certificate.id
            })
        
        except Exception as e:
            logger.exception("Error saving certificate:")
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

@csrf_exempt
def update_certificate(request, certificate_id):
    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            
            # Validate dropdown fields for CompanyStatus and CompanyType
            if data.get('companyStatus') not in ['مقيد', 'غير مقيد']:
                return JsonResponse({'status': 'error', 'message': 'Invalid companyStatus value'}, status=400)
            if data.get('companyType') not in ['شركه', 'فردي']:
                return JsonResponse({'status': 'error', 'message': 'Invalid companyType value'}, status=400)
            
            # Normalize input text fields
            office_name = normalize_text(data.get('office'))
            registration_number = normalize_text(data.get('registrationNumber'))
            certificate_number = normalize_text(data.get('certificateNumber'))
            company_name = normalize_text(data.get('companyName'))
            company_address = normalize_text(data.get('companyAddress'))
            company_status = normalize_text(data.get('companyStatus'))
            company_type = normalize_text(data.get('companyType'))
            cargo_value = normalize_text(data.get('cargo'))
            export_country_value = normalize_text(data.get('exportCountry'))
            origin_country_value = normalize_text(data.get('originCountry'))
            
            # Handle office and registrationNumber based on company status
            if company_status == 'غير مقيد':
                office = None
                registration_number = None
            else:
                if office_name:
                    office, _ = Office.objects.get_or_create(OfficeName=office_name)
                else:
                    office = None

            # Get or create related objects
            company, created = Company.objects.get_or_create(
                CompanyName=company_name,
                defaults={
                    'CompanyAddress': company_address,
                    'CompanyType': company_type,
                    'CompanyStatus': company_status
                }
            )
            if not created:
                # Update the company's fields if changes were made
                company.CompanyAddress = company_address
                company.CompanyType = company_type
                company.CompanyStatus = company_status
                company.save()
            
            export_country, _ = Country.objects.get_or_create(CountryName=export_country_value)
            origin_country, _ = Country.objects.get_or_create(CountryName=origin_country_value)
            cargo_obj, _ = Cargo.objects.get_or_create(ExportedGoods=cargo_value)
            
            # Retrieve new fields
            quantity = data.get('quantity')
            quantity_unit = data.get('quantity_unit')
            cost_value = data.get('cost')
            cost_currency = data.get('cost_currency')
            
            # Validate and convert cost_value to Decimal
            try:
                cost_value = Decimal(str(cost_value)) if cost_value else None
            except InvalidOperation:
                return JsonResponse({'status': 'error', 'message': 'Invalid cost value'}, status=400)
            
            # Update the certificate
            certificate = Certificate.objects.get(id=certificate_id)
            certificate.Office = office
            certificate.Company = company
            certificate.RegistrationNumber = registration_number
            certificate.CertificateNumber = certificate_number
            certificate.ExportCountry = export_country
            certificate.OriginCountry = origin_country
            certificate.ExportedGoods = cargo_obj
            certificate.IssueDate = data['processDate']
            certificate.ReceiptNumber = data['receiptNumber']
            certificate.ReceiptDate = data['receiptDate']
            certificate.PaymentAmount = data['paymentAmount']
            certificate.quantity = quantity
            certificate.quantity_unit = quantity_unit
            certificate.cost = Money(cost_value, cost_currency) if cost_value and cost_currency else None
            certificate.save()
            
            return JsonResponse({'status': 'success', 'certificateId': certificate.id}, status=200)
        except Certificate.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Certificate not found'}, status=404)
        except Exception as e:
            logger.exception("Error updating certificate:")
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

# @csrf_exempt
# def save_certificate(request):
#     if request.method == 'POST':
#         try:
#             data = json.loads(request.body)
            
#             # Validate dropdown fields for CompanyStatus and CompanyType
#             if data['companyStatus'] not in ['مقيد', 'غير مقيد']:
#                 return JsonResponse({'status': 'error', 'message': 'Invalid companyStatus value'}, status=400)
#             if data['companyType'] not in ['شركه', 'فردي']:
#                 return JsonResponse({'status': 'error', 'message': 'Invalid companyType value'}, status=400)
            
#             # Normalize input text fields
#             office_name = normalize_text(data['office']) if data['office'] else None
#             registration_number = normalize_text(data['registrationNumber']) if data['registrationNumber'] else None
#             certificate_number = normalize_text(data['certificateNumber'])
#             company_name = normalize_text(data['companyName'])
#             company_address = normalize_text(data['companyAddress'])
#             company_status = normalize_text(data['companyStatus'])
#             company_type = normalize_text(data['companyType'])
#             cargo_value = normalize_text(data['cargo'])
#             export_country_value = normalize_text(data['exportCountry'])
#             origin_country_value = normalize_text(data['originCountry'])
            
#             # Get or create related objects (handle office being None)
#             if company_status == 'مقيد' and office_name:
#                 office, _ = Office.objects.get_or_create(
#                     OfficeName=office_name,
#                 )
#             else:
#                 office = None

#             company, _ = Company.objects.get_or_create(
#                 CompanyName=company_name,
#                 defaults={
#                     'CompanyAddress': company_address,
#                     'CompanyType': company_type,
#                     'CompanyStatus': company_status
#                 }
#             )
#             export_country, _ = Country.objects.get_or_create(
#                 CountryName=export_country_value
#             )
#             origin_country, _ = Country.objects.get_or_create(
#                 CountryName=origin_country_value
#             )
#             cargo_obj, _ = Cargo.objects.get_or_create(ExportedGoods=cargo_value)
            
#             # Retrieve new fields from data
#             quantity = data.get('quantity')
#             quantity_unit = data.get('quantity_unit')
#             cost_value = data.get('cost')
#             cost_currency = data.get('cost_currency')
            
#             # Create the certificate including the new fields.
#             certificate = Certificate.objects.create(
#                 Office=office,  # Office can be None if "غير مقيد"
#                 Company=company,
#                 RegistrationNumber=registration_number,
#                 CertificateNumber=certificate_number,
#                 ExportCountry=export_country,
#                 OriginCountry=origin_country,
#                 ExportedGoods=cargo_obj,
#                 IssueDate=data['processDate'],
#                 ReceiptNumber=data['receiptNumber'],
#                 ReceiptDate=data['receiptDate'],
#                 PaymentAmount=data['paymentAmount'],
#                 quantity=quantity,
#                 quantity_unit=quantity_unit,
#                 cost=Money(cost_value, cost_currency)  # MoneyField assignment
#             )            
#             return JsonResponse({
#                 'status': 'success',
#                 'message': 'Certificate saved successfully!',
#                 'certificateId': certificate.id
#             })
        
#         except Exception as e:
#             logger.exception("Error saving certificate:")
#             return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    
#     return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

# @csrf_exempt
# def update_certificate(request, certificate_id):
#     """
#     Updates an existing certificate.
#     All text-based fields are normalized before updating.
#     """
#     if request.method == 'PUT':
#         try:
#             data = json.loads(request.body)
            
#             # Validate dropdown fields for CompanyStatus and CompanyType
#             if data.get('companyStatus') not in ['مقيد', 'غير مقيد']:
#                 return JsonResponse({'status': 'error', 'message': 'Invalid companyStatus value'}, status=400)
#             if data.get('companyType') not in ['شركه', 'فردي']:
#                 return JsonResponse({'status': 'error', 'message': 'Invalid companyType value'}, status=400)
            
#             # Normalize input text fields
#             office_name = normalize_text(data.get('office'))
#             registration_number = normalize_text(data.get('registrationNumber'))
#             certificate_number = normalize_text(data.get('certificateNumber'))
#             company_name = normalize_text(data.get('companyName'))
#             company_address = normalize_text(data.get('companyAddress'))
#             company_status = normalize_text(data.get('companyStatus'))
#             company_type = normalize_text(data.get('companyType'))
#             cargo_value = normalize_text(data.get('cargo'))
#             export_country_value = normalize_text(data.get('exportCountry'))
#             origin_country_value = normalize_text(data.get('originCountry'))
            
#             # Get or create related objects for Office, Country, and Cargo
#             office, _ = Office.objects.get_or_create(
#                 OfficeName=office_name,
#                 defaults={'BranchName': 'Main'}
#             )
#             export_country, _ = Country.objects.get_or_create(
#                 CountryName=export_country_value
#             )
#             origin_country, _ = Country.objects.get_or_create(
#                 CountryName=origin_country_value
#             )
#             cargo_obj, _ = Cargo.objects.get_or_create(ExportedGoods=cargo_value)
            
#             # For Company: update if it exists; otherwise, create a new one.
#             company, created = Company.objects.get_or_create(
#                 CompanyName=company_name,
#                 defaults={
#                     'CompanyAddress': company_address,
#                     'CompanyType': company_type,
#                     'CompanyStatus': company_status
#                 }
#             )
#             if not created:
#                 # Update the company's fields if changes were made
#                 company.CompanyAddress = company_address
#                 company.CompanyType = company_type
#                 company.CompanyStatus = company_status
#                 company.save()
            
#             # Retrieve new fields
#             quantity = data.get('quantity')
#             quantity_unit = data.get('quantity_unit')
#             cost_value = data.get('cost')
#             cost_currency = data.get('cost_currency')
            
#             # Validate and convert cost_value to Decimal
#             try:
#                 cost_value = Decimal(str(cost_value)) if cost_value else None
#             except InvalidOperation:
#                 return JsonResponse({'status': 'error', 'message': 'Invalid cost value'}, status=400)
            
#             certificate = Certificate.objects.get(id=certificate_id)
#             certificate.Office = office
#             certificate.Company = company
#             certificate.RegistrationNumber = registration_number
#             certificate.CertificateNumber = certificate_number
#             certificate.ExportCountry = export_country
#             certificate.OriginCountry = origin_country
#             certificate.ExportedGoods = cargo_obj
#             certificate.IssueDate = data['processDate']
#             certificate.ReceiptNumber = data['receiptNumber']
#             certificate.ReceiptDate = data['receiptDate']
#             certificate.PaymentAmount = data['paymentAmount']
            
#             # Update new fields
#             certificate.quantity = quantity
#             certificate.quantity_unit = quantity_unit
#             if cost_value is not None and cost_currency:
#                 certificate.cost = Money(cost_value, cost_currency)
#             else:
#                 certificate.cost = None
#             certificate.save()
            
#             return JsonResponse({'status': 'success', 'certificateId': certificate.id}, status=200)
#         except Certificate.DoesNotExist:
#             return JsonResponse({'status': 'error', 'message': 'Certificate not found'}, status=404)
#         except Exception as e:
#             logger.exception("Error updating certificate:")
#             return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    
#     return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

def filter_certificates(request):
    # Retrieve query parameters (if blank, they are empty strings)
    office = request.GET.get('office', '')
    registration_number = request.GET.get('registrationNumber', '')

    # Start with all certificates
    certificates = Certificate.objects.all()
    
    # Apply exact filter if an office is selected
    if office:
        certificates = certificates.filter(Office__OfficeName=office)
    
    # Apply exact filter if a registration number is provided
    if registration_number:
        certificates = certificates.filter(RegistrationNumber=registration_number)
    
    # Build a list of certificate dictionaries
    results = []
    for cert in certificates:
        office_name = cert.Office.OfficeName if cert.Office else 'null'
        results.append({
            'id': cert.id,
            'office_name': office_name,
            'registration_number': cert.RegistrationNumber,
            'certificate_number': cert.CertificateNumber,
            'company_name': cert.Company.CompanyName,
            'company_address': cert.Company.CompanyAddress,
            'company_status': cert.Company.CompanyStatus,
            'company_type': cert.Company.CompanyType,
            'exported_goods': cert.ExportedGoods.ExportedGoods,
            'origin_country': cert.OriginCountry.CountryName,
            'export_country': cert.ExportCountry.CountryName,
            'issue_date': cert.IssueDate.strftime('%Y-%m-%d'),
            'receipt_number': cert.ReceiptNumber,
            'receipt_date': cert.ReceiptDate.strftime('%Y-%m-%d') if cert.ReceiptDate else None,
            'payment_amount': float(cert.PaymentAmount) if cert.PaymentAmount is not None else None,
            # Include both display and raw values for the new fields:
            'quantity_display': cert.quantity_display,  # e.g. "10 kg"
            'quantity': str(cert.quantity) if cert.quantity is not None else "",
            'quantity_unit': cert.quantity_unit,
            'cost_display': str(cert.cost),  # e.g. "100.00 USD"
            'cost_amount': str(cert.cost.amount) if cert.cost is not None else "",
            'cost_currency': str(cert.cost.currency) if cert.cost is not None else ""
        })

    return JsonResponse({'certificates': results})

@csrf_exempt
@require_http_methods(["PUT"])
def edit_filtered_certificate(request, certificate_id):
    try:
        data = json.loads(request.body)
        certificate = Certificate.objects.get(id=certificate_id)
        # For example, update the certificate_number if provided.
        if 'certificate_number' in data:
            certificate.CertificateNumber = data['certificate_number']
        # Extend here if you wish to update additional fields.
        certificate.save()
        return JsonResponse({'status': 'success', 'message': 'Certificate updated successfully.'})
    except Certificate.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Certificate not found.'}, status=404)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["DELETE"])
def delete_filtered_certificate(request, certificate_id):
    try:
        certificate = Certificate.objects.get(id=certificate_id)
        certificate.delete()
        return JsonResponse({'status': 'success', 'message': 'Certificate deleted successfully.'})
    except Certificate.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Certificate not found.'}, status=404)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

@csrf_exempt
def delete_certificate(request, certificate_id):
    if request.method == 'DELETE':
        try:
            logger.info(f'Attempting to delete certificate with ID: {certificate_id}')  # Log the ID
            certificate = Certificate.objects.get(id=certificate_id)
            certificate.delete()
            logger.info(f'Successfully deleted certificate with ID: {certificate_id}')  # Log success
            return JsonResponse({'status': 'success'}, status=200)
        except Certificate.DoesNotExist:
            logger.error(f'Certificate not found with ID: {certificate_id}')  # Log error
            return JsonResponse({'status': 'error', 'message': 'Certificate not found'}, status=404)
        except Exception as e:
            logger.error(f'Error deleting certificate: {str(e)}')  # Log error
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    logger.error('Invalid request method for delete_certificate')  # Log error
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

@csrf_exempt
@require_http_methods(["PUT"])
def update_cargo(request, cargo_id):
    try:
        data = json.loads(request.body)
        new_goods = data.get('ExportedGoods')
        if new_goods is None:
            return JsonResponse({'status': 'error', 'message': 'ExportedGoods is required.'}, status=400)
        cargo = Cargo.objects.get(id=cargo_id)
        cargo.ExportedGoods = new_goods
        cargo.save()
        return JsonResponse({'status': 'success', 'message': 'Cargo updated successfully.'})
    except Cargo.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Cargo not found.'}, status=404)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["DELETE"])
def delete_cargo(request, cargo_id):
    try:
        cargo = Cargo.objects.get(id=cargo_id)
        cargo.delete()
        return JsonResponse({'status': 'success', 'message': 'Cargo deleted successfully.'})
    except Cargo.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Cargo not found.'}, status=404)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["PUT"])
def update_country(request, country_id):
    try:
        data = json.loads(request.body)
        new_country_name = data.get('CountryName')
        if new_country_name is None:
            return JsonResponse({'status': 'error', 'message': 'CountryName is required.'}, status=400)
        country = Country.objects.get(id=country_id)
        country.CountryName = new_country_name
        country.save()
        return JsonResponse({'status': 'success', 'message': 'Country updated successfully.'})
    except Country.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Country not found.'}, status=404)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["DELETE"])
def delete_country(request, country_id):
    try:
        country = Country.objects.get(id=country_id)
        country.delete()
        return JsonResponse({'status': 'success', 'message': 'Country deleted successfully.'})
    except Country.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Country not found.'}, status=404)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

def get_cargo_options(request):
    cargos = Cargo.objects.all().values('id', 'ExportedGoods')
    return JsonResponse({'cargos': list(cargos)})

def get_country_options(request):
    countries = Country.objects.all().values('id', 'CountryName')
    return JsonResponse({'countries': list(countries)})

@csrf_exempt
def report_view(request):
    # Retrieve filtering criteria from GET parameters
    process_date_from = request.GET.get('process_date_from', '')
    process_date_to = request.GET.get('process_date_to', '')
    cargo_name = request.GET.get('cargo', '')
    export_country_name = request.GET.get('export_country', '')

    if not (process_date_from or process_date_to or cargo_name or export_country_name):
        messages.error(request, "يرجى إدخال تاريخ أو بضاعة أو بلد تصدير للبحث.")
        certificates = Certificate.objects.none()
    else:
        certificates = Certificate.objects.all()
        if process_date_from:
            certificates = certificates.filter(IssueDate__gte=process_date_from)
        if process_date_to:
            certificates = certificates.filter(IssueDate__lte=process_date_to)
        if cargo_name:
            certificates = certificates.filter(ExportedGoods_id=cargo_name)

        if export_country_name:
            certificates = certificates.filter(ExportCountry__CountryName=export_country_name)

    context = {
        'certificates': certificates,
        'process_date_from': process_date_from,
        'process_date_to': process_date_to,
        'selected_cargo': cargo_name,
        'selected_country': export_country_name,
        'cargos': Cargo.objects.all(),
        'countries': Country.objects.all(),
    }
    return render(request, 'report.html', context)
    
def download_report(request, file_format):
    process_date_from = request.GET.get('process_date_from', '')
    process_date_to = request.GET.get('process_date_to', '')
    cargo_name = request.GET.get('cargo', '')
    export_country_name = request.GET.get('export_country', '')

    # تصفية البيانات بناءً على المعايير
    certificates = Certificate.objects.all()
    if process_date_from:
        certificates = certificates.filter(IssueDate__gte=process_date_from)
    if process_date_to:
        certificates = certificates.filter(IssueDate__lte=process_date_to)
    if cargo_name:
        certificates = certificates.filter(ExportedGoods_id=cargo_name)
    if export_country_name:
        certificates = certificates.filter(ExportCountry__CountryName=export_country_name)

    # إنشاء البيانات كمصفوفة
    data = [
        [
            str(cert.id),
            str(cert.Office),
            str(cert.RegistrationNumber),
            str(cert.CertificateNumber),
            str(cert.Company.CompanyName),
            str(cert.Company.CompanyAddress),
            str(cert.Company.CompanyStatus),
            str(cert.Company.CompanyType),
            str(cert.ExportedGoods),
            str(cert.OriginCountry),
            str(cert.ExportCountry),
            str(cert.IssueDate),
            str(cert.ReceiptNumber),
            str(cert.ReceiptDate),
            str(cert.PaymentAmount)
        ]
        for cert in certificates
    ]

    # العناوين الرئيسية
    headers = [
        "المعرف", "اسم المكتب", "رقم السجل", "رقم الشهادة","اسم الشركة","عنوان الشركة","حالة الشركة","نوع الشركة",
        "البضائع", "بلد المنشأ", "بلد التصدير", "تاريخ العملية",
        "رقم الايصال", "تاريخ الايصال", "القيمة المدفوعة"
    ]

    # إذا كان المطلوب PDF
    if file_format == "pdf":
        response = HttpResponse(content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="report.pdf"'

        buffer = io.BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=letter)

        # 1) تسجيل الخط: استخدم خطاً يغطي العربية والإنجليزية والأرقام
        # Example: "C:\\path\\to\\Cairo-Regular.ttf"
        pdfmetrics.registerFont(TTFont("ArabicFull", "C:/Users/Menna.nabil/Downloads/Cairo/Cairo-VariableFont_slnt,wght.ttf"))
        pdf.setFont("ArabicFull", 12)

        # 2) عنوان التقرير بالعربية
        title_ar = shape_arabic_text("تقرير الشهادات")
        pdf.drawRightString(550, 750, title_ar)

        # 3) طباعة العناوين الرئيسية
        y = 720
        for header in headers:
            header_ar = shape_arabic_text(header)
            pdf.drawRightString(550, y, header_ar)
            y -= 20
            # 4) طباعة البيانات بشكل جدولي مبسط
        # Adjust the columns from right to left
        # We'll have 12 columns (per the headers), each 80 px wide (approx).
        # Starting from x=550 going leftwards.
        y = 700
        for row in data:
            # For each column in the row, we either draw it from the right or from the left
            # if it’s Arabic or numeric.
            x_offset = 550
            for col_value in row:
                shaped_value = shape_arabic_text(col_value)
# If it has Arabic, we do drawRightString
                # If purely numeric or English, we could do drawString
                # But let's keep it consistent and just do drawRightString:
                pdf.drawRightString(x_offset, y, shaped_value)

                x_offset -= 80  # move to the left for the next column
            y -= 20

        pdf.save()
        buffer.seek(0)
        response.write(buffer.read())
        return response

    # إذا كان المطلوب Excel
    elif file_format == "excel":
        response = HttpResponse(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response["Content-Disposition"] = 'attachment; filename="report.xlsx"'

        df = pd.DataFrame(data, columns=headers)
        with io.BytesIO() as output:
            with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
                df.to_excel(writer, index=False, sheet_name="Report")
            output.seek(0)
            response.write(output.read())
        return response

    # في حالة وجود خطأ في التنسيق
    return HttpResponse("Invalid file format", status=400)


