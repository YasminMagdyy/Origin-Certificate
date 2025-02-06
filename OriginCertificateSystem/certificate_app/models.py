from django.db import models
import unicodedata
import string

#class Country(models.Model):
    #Countryid = models.Field(primary_key= True)
    #Country = models.CharField(max_length=100)

#class Cargo(models.Model):
 #   Cargoid = models.Field(primary_key= True)
  #  ExportedGoods = models.CharField(max_length=100)
   # IssueDate = models.DateField(max_length=100)


class Office(models.Model):
    OfficeName = models.CharField(max_length=100)
    BranchName = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.OfficeName} - {self.BranchName}"

class Company(models.Model):
    CompanyName = models.CharField(max_length=100)
    CompanyAddress = models.CharField(max_length=200)
    CompanyType = models.CharField(max_length=50)
    CompanyStatus = models.CharField(max_length=50)

    def __str__(self):
        return self.CompanyName

# models.py
class Certificate(models.Model):
    # certificateId = models.AutoField(primary_key=True)
    Office = models.ForeignKey(Office, on_delete=models.CASCADE)
    Company = models.ForeignKey(Company, on_delete=models.CASCADE)
    RegistrationNumber = models.CharField(max_length=50, unique=False)  # Existing field
    CertificateNumber = models.CharField(max_length=50, unique=True, blank=True, null=True)  # New field
    ExportCountry = models.CharField(max_length=100)
    OriginCountry = models.CharField(max_length=100)
    ExportedGoods = models.CharField(max_length=200)
    IssueDate = models.DateField()
    ReceiptNumber = models.CharField(max_length=50, blank=True, null=True)
    ReceiptDate = models.DateField(blank=True, null=True)
    PaymentAmount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    def __str__(self):
        return f"Certificate {self.id}"
        
class DynamicList(models.Model):
    LIST_TYPES = [
        ('cargo', 'البضاعة'),
        ('exportCountry', 'بلد التصدير'),
        ('originCountry', 'بلد المنشأ'),
    ]
    ListType = models.CharField(max_length=50, choices=LIST_TYPES)
    Item = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.ListType}: {self.Item}"