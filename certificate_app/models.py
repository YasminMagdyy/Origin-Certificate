from django.db import models

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

class Country(models.Model):
    CountryName = models.CharField(max_length=100, unique = True)

    def __str__(self):
        return self.CountryName
                
class Cargo(models.Model):
    ExportedGoods = models.CharField(max_length=100)

    def __str__(self):
        return self.ExportedGoods

class Certificate(models.Model):
    Office = models.ForeignKey(Office, on_delete=models.CASCADE)
    Company = models.ForeignKey(Company, on_delete=models.CASCADE)
    RegistrationNumber = models.CharField(max_length=50, unique=False)
    CertificateNumber = models.CharField(max_length=50, unique=True, blank=True, null=True)
    ExportCountry = models.ForeignKey(Country, on_delete=models.CASCADE, related_name='export_country_certificates')
    OriginCountry = models.ForeignKey(Country, on_delete=models.CASCADE, related_name='origin_country_certificates')
    ExportedGoods = models.ForeignKey(Cargo, on_delete=models.CASCADE, related_name='certificates')
    IssueDate = models.DateField()
    ReceiptNumber = models.CharField(max_length=50, blank=True, null=True)
    ReceiptDate = models.DateField(blank=True, null=True)
    PaymentAmount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    def __str__(self):
        return f"Certificate {self.id}"
        