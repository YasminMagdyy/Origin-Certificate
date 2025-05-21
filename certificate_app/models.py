from django.db import models 
from djmoney.money import Money
from django.contrib.auth.models import User

QUANTITY_UNIT_CHOICES = [
    ('طن', 'طن'),
    ('كجم', 'كجم'),
    ('وحده', 'وحده'),
]

class Office(models.Model):
    OfficeName = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.OfficeName}"

class Branch(models.Model):
    name = models.CharField(max_length=100)
    
    def __str__(self):
        return f"{self.name}"

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, null=True, blank=True)
    is_branch_admin = models.BooleanField(default=False)
    is_branch_user = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} - {self.branch.name if self.branch else 'No Branch'}"
    
    def get_branch(self):
        return self.branch

class Company(models.Model):
    CompanyName = models.CharField(max_length=100)
    CompanyAddress = models.CharField(max_length=200)
    CompanyType = models.CharField(max_length=50)
    CompanyStatus = models.CharField(max_length=50)
    importCompanyName = models.CharField(max_length=100, blank=True, null=True)
    importCompanyAddress = models.CharField(max_length=200, blank=True, null=True)
    importCompanyPhone = models.CharField(max_length=50, blank=True, null=True)

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
    Office = models.ForeignKey(Office, on_delete=models.SET_NULL, null=True, blank=True)
    Branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=False)
    BranchName = models.CharField(max_length=255)
    Company = models.ForeignKey(Company, on_delete=models.CASCADE)
    RegistrationNumber = models.CharField(max_length=50, blank=True, null=True)
    CertificateNumber = models.CharField(max_length=50, blank=True, null=True)
    ExportCountry = models.ForeignKey(
        Country, on_delete=models.CASCADE, related_name='export_country_certificates'
    )
    OriginCountry = models.ForeignKey(
        Country, on_delete=models.CASCADE, related_name='origin_country_certificates'
    )
    IssueDate = models.DateField()
    ReceiptNumber = models.CharField(max_length=50, blank=True, null=True)
    ReceiptDate = models.DateField(blank=True, null=True)
    PaymentAmount = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    quantity_unit = models.CharField(
        max_length=10, choices=QUANTITY_UNIT_CHOICES, default='كجم'
    )
    default_currency = models.CharField(max_length=3, default='USD')

    def __str__(self):
        return f"Certificate {self.id}"

    @property
    def total_quantity(self):
        return sum(sh.quantity for sh in self.shipments.all() if sh.quantity)

    @property
    def total_cost(self):
        total = sum(sh.cost_amount for sh in self.shipments.all() if sh.cost_amount)
        return Money(total, self.default_currency)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['Branch', 'Office', 'RegistrationNumber', 'CertificateNumber'],
                name='unique_branch_office_reg_cert',
                condition=~models.Q(RegistrationNumber='غير موجود')
            )
        ]

class Shipment(models.Model):
    certificate = models.ForeignKey(
        Certificate, on_delete=models.CASCADE, related_name='shipments'
    )
    cargo = models.ForeignKey(
        Cargo, on_delete=models.CASCADE,
        help_text="Select the cargo from the predefined Cargo table."
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    cost_amount = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"Shipment for {self.certificate} - {self.cargo}"