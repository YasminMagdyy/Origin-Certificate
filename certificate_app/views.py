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

# @csrf_exempt
# def add_item(request):
#     if request.method == 'POST':
#         data = json.loads(request.body)
#         list_type = data.get('listType')
#         item = data.get('item')

#         if list_type and item:
#             # Check if the item already exists in the database for the current list type
#             if DynamicList.objects.filter(ListType=list_type, Item=item).exists():
#                 return JsonResponse({'status': 'error', 'message': 'هذا العنصر موجود بالفعل!'}, status=400)

#             # Save the item to the database for the current list type
#             DynamicList.objects.create(ListType=list_type, Item=item)

#             # If the item is added to exportCountry, also add it to originCountry (and vice versa)
#             if list_type in ['exportCountry', 'originCountry']:
#                 other_list_type = 'originCountry' if list_type == 'exportCountry' else 'exportCountry'

#                 # Check if the item already exists in the other list type
#                 if not DynamicList.objects.filter(ListType=other_list_type, Item=item).exists():
#                     DynamicList.objects.create(ListType=other_list_type, Item=item)

#             return JsonResponse({'status': 'success'})
#         return JsonResponse({'status': 'error', 'message': 'Invalid data'}, status=400)
    
# @csrf_exempt
# def get_items(request):
#     if request.method == 'GET':
#         list_type = request.GET.get('listType')
#         items = DynamicList.objects.filter(ListType=list_type).values_list('Item', flat=True)
#         return JsonResponse(list(items), safe=False)

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
                                         
# @csrf_exempt
# def save_certificate(request):
#     if request.method == 'POST':
#         try:
#             data = json.loads(request.body)
            
#             # Create or get Office
#             office, created = Office.objects.get_or_create(
#                 OfficeName=data['office'],
#                 defaults={'BranchName': 'Main'}  # Adjust as needed
#             )
            
#             # Create or get Company
#             company, created = Company.objects.get_or_create(
#                 CompanyName=data['companyName'],
#                 defaults={
#                     'CompanyAddress': data['companyAddress'],
#                     'CompanyType': data['companyType'],
#                     'CompanyStatus': data['companyStatus']
#                 }
#             )
            
#             # Create or get Export Country
#             export_country, created = Country.objects.get_or_create(
#                 CountryName=data['exportCountry']
#             )
            
#             # Create or get Origin Country
#             origin_country, created = Country.objects.get_or_create(
#                 CountryName=data['originCountry']
#             )
            
#             # Create or get Cargo
#             cargo, created = Cargo.objects.get_or_create(
#                 ExportedGoods=data['cargo'],
#             )
            
#             # Create Certificate
#             certificate = Certificate.objects.create(
#                 Office=office,
#                 Company=company,
#                 RegistrationNumber=data['registrationNumber'],
#                 CertificateNumber=data['certificateNumber'],
#                 ExportCountry=export_country,  # Assign the Country instance
#                 OriginCountry=origin_country,  # Assign the Country instance
#                 ExportedGoods=cargo,  # Assign the Cargo instance
#                 IssueDate=data['processDate'],
#                 ReceiptNumber=data['receiptNumber'],
#                 ReceiptDate=data['receiptDate'],
#                 PaymentAmount=data['paymentAmount']
#             )
            
#             return JsonResponse({'status': 'success', 'message': 'Certificate saved successfully!', 'certificateId': certificate.id})
        
#         except Exception as e:
#             return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    
#     return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)
    
@csrf_exempt
def save_certificate(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)

            # Normalize input text fields
            office_name = normalize_text(data['office'])
            registration_number = normalize_text(data['registrationNumber'])
            certificate_number = normalize_text(data['certificateNumber'])
            company_name = normalize_text(data['companyName'])
            company_address = normalize_text(data['companyAddress'])
            company_status = normalize_text(data['companyStatus'])
            company_type = normalize_text(data['companyType'])
            cargo_value = normalize_text(data['cargo'])
            export_country_value = normalize_text(data['exportCountry'])
            origin_country_value = normalize_text(data['originCountry'])
            
            # Get or create related objects
            office, _ = Office.objects.get_or_create(
                OfficeName=office_name,
                defaults={'BranchName': 'Main'}
            )
            company, _ = Company.objects.get_or_create(
                CompanyName=company_name,
                defaults={
                    'CompanyAddress': company_address,
                    'CompanyType': company_type,
                    'CompanyStatus': company_status
                }
            )
            export_country, _ = Country.objects.get_or_create(
                CountryName=export_country_value
            )
            origin_country, _ = Country.objects.get_or_create(
                CountryName=origin_country_value
            )
            cargo_obj, _ = Cargo.objects.get_or_create(ExportedGoods=cargo_value)
            
            certificate = Certificate.objects.create(
                Office=office,
                Company=company,
                RegistrationNumber=registration_number,
                CertificateNumber=certificate_number,
                ExportCountry=export_country,
                OriginCountry=origin_country,
                ExportedGoods=cargo_obj,
                IssueDate=data['processDate'],
                ReceiptNumber=data['receiptNumber'],
                ReceiptDate=data['receiptDate'],
                PaymentAmount=data['paymentAmount']
            )
            
            return JsonResponse({
                'status': 'success',
                'message': 'Certificate saved successfully!',
                'certificateId': certificate.id
            })
        
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

@csrf_exempt
def update_certificate(request, certificate_id):
    """
    Updates an existing certificate.
    All text-based fields are normalized before updating.
    """
    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            
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
            
            # Get or create related objects
            office, _ = Office.objects.get_or_create(
                OfficeName=office_name,
                defaults={'BranchName': 'Main'}
            )
            company, _ = Company.objects.get_or_create(
                CompanyName=company_name,
                defaults={
                    'CompanyAddress': company_address,
                    'CompanyType': company_type,
                    'CompanyStatus': company_status
                }
            )
            export_country, _ = Country.objects.get_or_create(
                CountryName=export_country_value
            )
            origin_country, _ = Country.objects.get_or_create(
                CountryName=origin_country_value
            )
            cargo_obj, _ = Cargo.objects.get_or_create(ExportedGoods=cargo_value)
            
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
            certificate.save()
            
            return JsonResponse({'status': 'success', 'certificateId': certificate.id}, status=200)
        except Certificate.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Certificate not found'}, status=404)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

logger = logging.getLogger(__name__)

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
        results.append({
            'id': cert.id,
            'office_name': cert.Office.OfficeName,
            'branch_name': cert.Office.BranchName,
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

# @csrf_exempt
# def update_certificate(request, certificate_id):
#     if request.method == 'PUT':
#         try:
#             # جلب البيانات من الطلب
#             data = json.loads(request.body)
#             office = data.get('office')
#             companyName = data.get('companyName')
#             companyAddress = data.get('companyAddress')
#             companyStatus = data.get('companyStatus')
#             companyType = data.get('companyType')
#             certificate_number = data.get('certificateNumber')
#             export_country = data.get('exportCountry')
#             origin_country = data.get('originCountry')
#             exported_goods = data.get('cargo')
#             issue_date = data.get('processDate')
#             receipt_number = data.get('receiptNumber')
#             receipt_date = data.get('receiptDate')
#             payment_amount = data.get('paymentAmount')

#             # تحديث السجل بناءً على الـ id``
#             certificate = Certificate.objects.get(id=certificate_id)
#             certificate.office_id = office
#             certificate.Company.CompanyName = companyName
#             certificate.Company.companyAddress = companyAddress
#             certificate.Company.companyStatus = companyStatus
#             certificate.Company.companyType = companyType
#             certificate.Company.save()
#             certificate.certificate_number = certificate_number
#             certificate.ExportCountry.CountryName = export_country
#             certificate.OriginCountry.CountryName = origin_country
#             certificate.CountryName.save()
#             certificate.ExportedGoods.ExportedGoods = exported_goods
#             certificate.ExportedGoods.save()
#             certificate.IssueDate = issue_date
#             certificate.ReceiptNumber = receipt_number
#             certificate.ReceiptDate = receipt_date
#             certificate.PaymentAmount = payment_amount
#             certificate.save()

#             return JsonResponse({'status': 'success', 'certificateId': certificate.id}, status=200)
#         except Certificate.DoesNotExist:
#             return JsonResponse({'status': 'error', 'message': 'Certificate not found'}, status=404)
#         except Exception as e:
#             return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

#     return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

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

