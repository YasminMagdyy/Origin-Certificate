from django.db import models
from djmoney.models.fields import MoneyField
from djmoney.money import Money

# Predefined choices for quantity unit
QUANTITY_UNIT_CHOICES = [
    ('طن', 'طن'),
    ('كجم', 'كجم'),
    ('وحده', 'وحده'),
]

class Office(models.Model):
    OfficeName = models.CharField(max_length=100, blank=True, null=True)
    # BranchName = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.OfficeName}"

class Company(models.Model):
    CompanyName = models.CharField(max_length=100)
    CompanyAddress = models.CharField(max_length=200)
    CompanyType = models.CharField(max_length=50)
    CompanyStatus = models.CharField(max_length=50)

    def __str__(self):
        return self.CompanyName

class Country(models.Model):
    CountryName = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.CountryName

class Cargo(models.Model):
    ExportedGoods = models.CharField(max_length=100)

    def __str__(self):
        return self.ExportedGoods

class Certificate(models.Model):
    # Make Office optional
    Office = models.ForeignKey(Office, on_delete=models.SET_NULL, null=True, blank=True)
    Company = models.ForeignKey(Company, on_delete=models.CASCADE)
    RegistrationNumber = models.CharField(max_length=50, unique=False, blank=True, null=True)
    CertificateNumber = models.CharField(max_length=50, unique=True, blank=True, null=True)
    ExportCountry = models.ForeignKey(
        Country, on_delete=models.CASCADE, related_name='export_country_certificates'
    )
    OriginCountry = models.ForeignKey(
        Country, on_delete=models.CASCADE, related_name='origin_country_certificates'
    )
    ExportedGoods = models.ForeignKey(
        Cargo, on_delete=models.CASCADE, related_name='certificates'
    )
    IssueDate = models.DateField()
    ReceiptNumber = models.CharField(max_length=50, blank=True, null=True)
    ReceiptDate = models.DateField(blank=True, null=True)
    PaymentAmount = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    # New fields for quantity and its unit
    quantity = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    quantity_unit = models.CharField(
        max_length=10, choices=QUANTITY_UNIT_CHOICES, default='kg'
    )
    # New cost field using django-money; default currency is set to USD
    cost = MoneyField(
        max_digits=10, decimal_places=2, default_currency='USD', blank=True, null=True
    )

    def __str__(self):
        return f"Certificate {self.id}"

    @property
    def quantity_display(self):
        """
        Returns the quantity combined with its unit (e.g. "10 kg").
        """
        if self.quantity is not None:
            return f"{self.quantity} {self.get_quantity_unit_display()}"
        return ""

    @property
    def cost_display(self):
        """
        Returns the cost as a string (e.g. "100.00 USD").
        """
        if self.cost is not None:
            return str(self.cost)
        return ""
