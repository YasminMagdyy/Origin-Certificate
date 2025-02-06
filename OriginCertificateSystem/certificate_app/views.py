# Create your views here.
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Office, Company, Certificate, DynamicList
import json


def index(request):
    return render(request, 'index.html')

def filter(request):
    certificates = Certificate.objects.all()  # Example: Fetch all certificates
    return render(request, 'filter.html', {'certificates': certificates})

@csrf_exempt
def add_item(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        list_type = data.get('listType')
        item = data.get('item')

        if list_type and item:
            # Check if the item already exists in the database for the current list type
            if DynamicList.objects.filter(ListType=list_type, Item=item).exists():
                return JsonResponse({'status': 'error', 'message': 'هذا العنصر موجود بالفعل!'}, status=400)

            # Save the item to the database for the current list type
            DynamicList.objects.create(ListType=list_type, Item=item)

            # If the item is added to exportCountry, also add it to originCountry (and vice versa)
            if list_type in ['exportCountry', 'originCountry']:
                other_list_type = 'originCountry' if list_type == 'exportCountry' else 'exportCountry'

                # Check if the item already exists in the other list type
                if not DynamicList.objects.filter(ListType=other_list_type, Item=item).exists():
                    DynamicList.objects.create(ListType=other_list_type, Item=item)

            return JsonResponse({'status': 'success'})
        return JsonResponse({'status': 'error', 'message': 'Invalid data'}, status=400)
    
@csrf_exempt
def get_items(request):
    if request.method == 'GET':
        list_type = request.GET.get('listType')
        items = DynamicList.objects.filter(ListType=list_type).values_list('Item', flat=True)
        return JsonResponse(list(items), safe=False)

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
                         
@csrf_exempt
def search_certificates(request):
    if request.method == "GET":
        office_name = request.GET.get('officeName', None)
        registration_number = request.GET.get('registrationNumber', None)

        certificates = Certificate.objects.all()
        if office_name:
            certificates = certificates.filter(Office__OfficeName__icontains=office_name)
        if registration_number:
            certificates = certificates.filter(RegistrationNumber__icontains=registration_number)

        results = []
        for cert in certificates:
            results.append({
                'officeName': cert.Office.OfficeName,
                'branchName': cert.Office.BranchName,
                'companyName': cert.Company.CompanyName,
                'companyAddress': cert.Company.CompanyAddress,
                'companyType': cert.Company.CompanyType,
                'companyStatus': cert.Company.CompanyStatus,
                'registrationNumber': cert.RegistrationNumber,
                'exportCountry': cert.ExportCountry,
                'originCountry': cert.OriginCountry,
                'cargo': cert.ExportedGoods,
                'issueDate': cert.IssueDate.strftime('%Y-%m-%d'),
                'receiptNumber' : cert.ReceiptNumber,
                'receiptDate' : cert.ReceiptDate.strftime('%Y-%m-%d'),
                'paymentAmount' : cert.PaymentAmount,
            })

        return JsonResponse(results, safe=False)
                
@csrf_exempt
def save_certificate(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Create or get Office
            office, created = Office.objects.get_or_create(
                OfficeName=data['office'],
                defaults={'BranchName': 'Main'}  # Adjust as needed
            )
            
            # Create or get Company
            company, created = Company.objects.get_or_create(
                CompanyName=data['companyName'],
                defaults={
                    'CompanyAddress': data['companyAddress'],
                    'CompanyType': data['companyType'],
                    'CompanyStatus': data['companyStatus']
                }
            )
            
            # Create Certificate
            certificate = Certificate.objects.create(
                Office=office,
                Company=company,
                RegistrationNumber=data['registrationNumber'],
                ExportCountry=data['exportCountry'],
                OriginCountry=data['originCountry'],
                ExportedGoods=data['cargo'],
                IssueDate=data['processDate'],
                ReceiptNumber=data['receiptNumber'],
                ReceiptDate=data['receiptDate'],
                PaymentAmount=data['paymentAmount']
            )
            
            return JsonResponse({'status': 'success', 'message': 'Certificate saved successfully!'})
        
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

import logging
logger = logging.getLogger(__name__)

def filter_certificates(request):
    office = request.GET.get('office', '')
    registrationNumber = request.GET.get('registrationNumber', '')

    # Log the query parameters
    logger.info(f"Filtering certificates with office='{office}' and registrationNumber='{registrationNumber}'")

    # Start with all certificates
    certificates = Certificate.objects.all()

    # Apply filters based on user input
    if office:
        certificates = certificates.filter(Office__OfficeName=office)
    if registrationNumber:
        certificates = certificates.filter(RegistrationNumber=registrationNumber)

    # Log the number of certificates found
    logger.info(f"Found {certificates.count()} certificates")

    # Prepare the data for the response
    results = []
    for cert in certificates:
        results.append({
            'office_name': cert.Office.OfficeName,
            'branch_name': cert.Office.BranchName,
            'registration_number': cert.RegistrationNumber,
            'company_name': cert.Company.CompanyName,
            'company_address': cert.Company.CompanyAddress,
            'company_status': cert.Company.CompanyStatus,
            'company_type': cert.Company.CompanyType,
            'exported_goods': cert.ExportedGoods,
            'origin_country': cert.OriginCountry,
            'export_country': cert.ExportCountry,
            'issue_date': cert.IssueDate.strftime('%Y-%m-%d'),  # Format date as string
            'receipt_number': cert.ReceiptNumber,
            'receipt_date': cert.ReceiptDate.strftime('%Y-%m-%d') if cert.ReceiptDate else None,  # Handle null dates
            'payment_amount': float(cert.PaymentAmount) if cert.PaymentAmount else None,  # Convert to float
        })

    # Log the results
    logger.info(f"Results: {results}")

    return JsonResponse({'certificates': results})


from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from .models import Certificate  # استيراد الموديل الخاص بك

@csrf_exempt
def update_certificate(request, certificate_id):
    if request.method == 'PUT':
        try:
            # جلب البيانات من الطلب
            data = json.loads(request.body)
            office = data.get('office')
            company = data.get('company')
            certificate_number = data.get('certificateNumber')
            export_country = data.get('exportCountry')
            origin_country = data.get('originCountry')
            exported_goods = data.get('exportedGoods')
            issue_date = data.get('issueDate')
            receipt_number = data.get('receiptNumber')
            receipt_date = data.get('receiptDate')
            payment_amount = data.get('paymentAmount')

            # تحديث السجل بناءً على الـ id
            certificate = Certificate.objects.get(id=certificate_id)
            certificate.office_id = office
            certificate.company_id = company
            certificate.certificate_number = certificate_number
            certificate.export_country = export_country
            certificate.origin_country = origin_country
            certificate.exported_goods = exported_goods
            certificate.issue_date = issue_date
            certificate.receipt_number = receipt_number
            certificate.receipt_date = receipt_date
            certificate.payment_amount = payment_amount
            certificate.save()

            return JsonResponse({'status': 'success'}, status=200)
        except Certificate.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Certificate not found'}, status=404)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Certificate  # استيراد الموديل الخاص بك

@csrf_exempt
def delete_certificate(request, certificate_id):
    if request.method == 'DELETE':
        try:
            # جلب السجل بناءً على الـ id
            certificate = Certificate.objects.get(id=certificate_id)
            certificate.delete()
            return JsonResponse({'status': 'success'}, status=200)
        except Certificate.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Certificate not found'}, status=404)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

