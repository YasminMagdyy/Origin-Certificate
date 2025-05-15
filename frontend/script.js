let mode;

function toggleSidebar() {
    var sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("active");
}

function toggleDropdown() {
    document.getElementById("userDropdown").classList.toggle("show-dropdown");
}

// Close the dropdown if clicked outside
window.onclick = function(event) {
    if (!event.target.matches('.user-btn') && !event.target.closest('.user-dropdown')) {
        const dropdowns = document.getElementsByClassName("dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            const openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show-dropdown')) {
                openDropdown.classList.remove('show-dropdown');
            }
        }
    }
}

// Close the sidebar when clicking anywhere outside the sidebar and menu button
document.addEventListener('click', function (e) {
  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.querySelector('.menu-btn');

  if (sidebar.classList.contains('active') &&
      !sidebar.contains(e.target) &&
      !menuBtn.contains(e.target)) {
    sidebar.classList.remove('active');
  }
});

// Global variable to store the current field ('cargo', 'exportCountry', or 'originCountry')
let currentField = '';

function openModal(field) {
  currentField = field;
  document.getElementById('modal').style.display = 'block';
  document.getElementById('newItem').value = ''; // Clear the input field
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

function addItem() {
  const newItemValue = document.getElementById('newItem').value.trim();
  if (!newItemValue) {
    alert('يرجى إدخال قيمة');
    return;
  }
  
  const formData = new FormData();
  formData.append('item_type', currentField);
  formData.append('item_name', newItemValue);
  
  fetch('/add_item/', {
    method: 'POST',
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      loadItems(currentField); // Refresh the select list
      closeModal();
    } else {
      alert(data.message || 'حدث خطأ');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('حدث خطأ أثناء الإرسال');
  });
}

function loadItems(item_type) {
  fetch(`/get_items/?item_type=${item_type}`)
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        let selectElement;
        if (item_type === 'cargo') {
          selectElement = document.querySelectorAll('.cargo'); // Target all cargo selects
        } else if (item_type === 'exportCountry') {
          selectElement = document.getElementById('exportCountry');
        } else if (item_type === 'originCountry') {
          selectElement = document.getElementById('originCountry');
        }
        if (selectElement) {
          if (item_type === 'cargo') {
            selectElement.forEach(sel => {
              sel.innerHTML = '';
              const defaultOption = document.createElement('option');
              defaultOption.value = "";
              defaultOption.text = "اختر البضاعه";
              defaultOption.disabled = true;
              defaultOption.selected = true;
              defaultOption.hidden = true;
              sel.appendChild(defaultOption);
              data.items.forEach(item => {
                const option = document.createElement('option');
                option.value = item.ExportedGoods;
                option.text = item.ExportedGoods;
                sel.appendChild(option);
              });
            });
          } else {
            selectElement.innerHTML = '';
            const defaultOption = document.createElement('option');
            defaultOption.value = item_type === 'exportCountry' ? '' : 'مصر';
            defaultOption.text = item_type === 'exportCountry' ? 'اختر بلد التصدير' : 'مصر';
            defaultOption.disabled = item_type === 'exportCountry';
            defaultOption.selected = true;
            defaultOption.hidden = item_type === 'exportCountry';
            selectElement.appendChild(defaultOption);
            data.items.forEach(item => {
              if (item_type === 'originCountry' && item.CountryName === "مصر") return;
              const option = document.createElement('option');
              option.value = item.CountryName;
              option.text = item.CountryName;
              selectElement.appendChild(option);
            });
          }
        }
      }
    })
    .catch(error => console.error('Error loading items:', error));
}

// On page load, load items
document.addEventListener('DOMContentLoaded', function() {
  loadItems('cargo');
  loadItems('exportCountry');
  loadItems('originCountry');
});

document.addEventListener('DOMContentLoaded', function () {
  const companyStatus = document.getElementById('companyStatus');
  const officeField = document.getElementById('office');
  const registrationNumberField = document.getElementById('registrationNumber');

  companyStatus.addEventListener('change', function () {
    if (this.value === 'غير مقيد') {
      officeField.disabled = true;
      registrationNumberField.disabled = true;
    } else {
      officeField.disabled = false;
      registrationNumberField.disabled = false;
    }
  });
});

document.getElementById('registrationNumber').addEventListener('keypress', function (e) {
  console.log('Enter key pressed');
  if (e.key === 'Enter') {
      console.log('Fetching company data...');
      const office = document.getElementById('office').value;
      const registrationNumber = document.getElementById('registrationNumber').value;

      if (!office || !registrationNumber) {
          alert('يرجى اختيار اسم المكتب وإدخال رقم السجل.');
          return;
      }

      fetch(`/get-company-data/?office=${office}&registrationNumber=${registrationNumber}`)
          .then(response => response.json())
          .then(data => {
              console.log('Response data:', data);
              if (data.error) {
                  alert(data.error);
              } else {
                  document.getElementById('companyName').value = data.companyName;
                  document.getElementById('companyAddress').value = data.companyAddress;
                  document.getElementById('companyStatus').value = data.companyStatus;
                  document.getElementById('companyType').value = data.companyType;
              }
          })
          .catch(error => {
              console.error('Error fetching company data:', error);
              alert('حدث خطأ أثناء جلب بيانات الشركة.');
          });
  }
});

// Function to disable OfficeName and RegistrationNumber based on companyStatus
document.getElementById('companyStatus').addEventListener('change', function() {
  const companyStatus = this.value;
  
  const officeField = document.getElementById('office');
  const registrationNumberField = document.getElementById('registrationNumber');
  
  if (companyStatus === "غير مقيد") {
    officeField.disabled = true;
    registrationNumberField.disabled = true;
  } else {
    officeField.disabled = false;
    registrationNumberField.disabled = false;
  }
});

// Save/Update Certificate
// script.js
document.getElementById('saveButton').addEventListener('click', function () {
  const rightForm = document.getElementById('rightForm');
  const leftForm = document.getElementById('leftForm');

  if (!rightForm.checkValidity() || !leftForm.checkValidity()) {
    rightForm.reportValidity();
    leftForm.reportValidity();
    return;
  }

  window.mode = "save"; // Ensure mode is "save" for new certificates
  const isUnregistered = document.getElementById('companyStatus').value === 'غير مقيد';
  const office = isUnregistered ? "غير موجود" : document.getElementById('office').value;
  const branchName = document.getElementById('branchName').value;
  const registrationNumber = isUnregistered ? "غير موجود" : document.getElementById('registrationNumber').value;

  const certificateNumber = document.getElementById('certificateNumber').value;
  const companyName = document.getElementById('companyName').value;
  const companyAddress = document.getElementById('companyAddress').value;
  const companyStatus = document.getElementById('companyStatus').value;
  const companyType = document.getElementById('companyType').value;
  const importCompanyName = document.getElementById('importCompanyName').value;
  const importCompanyAddress = document.getElementById('importCompanyAddress').value;
  const importCompanyPhone = document.getElementById('importCompanyPhone').value;
  const exportCountry = document.getElementById('exportCountry').value;
  const originCountry = document.getElementById('originCountry').value;
  const processDate = document.getElementById('processDate').value;
  const receiptNumber = document.getElementById('receiptNumber').value;
  const receiptDate = document.getElementById('receiptDate').value;
  const paymentAmount = document.getElementById('paymentAmount').value;

  const shipmentGroups = document.querySelectorAll('#shipmentContainer .shipment-group');
  let shipments = [];
  shipmentGroups.forEach(group => {
    const cargoVal = group.querySelector('.cargo').value;
    const quantityVal = parseFloat(group.querySelector('.quantity').value) || 0;
    const costVal = parseFloat(group.querySelector('.cost_amount').value) || 0;
    if (cargoVal && quantityVal > 0 && costVal > 0) {
      shipments.push({ cargo: cargoVal, quantity: quantityVal, cost_amount: costVal });
    }
  });

  if (shipments.length === 0) {
    alert('يرجى إضافة شحنة واحدة على الأقل تحتوي على بضاعة وكمية وتكلفة صالحة.');
    return;
  }

  const quantityUnit = document.getElementById('quantity_unit').value;
  const costCurrency = document.getElementById('cost_currency').value;

  const data = {
    office: office,
    branchName: branchName,
    registrationNumber: registrationNumber,
    certificateNumber: certificateNumber,
    companyName: companyName,
    companyAddress: companyAddress,
    companyStatus: companyStatus,
    companyType: companyType,
    importCompanyName: importCompanyName,
    importCompanyAddress: importCompanyAddress,
    importCompanyPhone: importCompanyPhone,
    exportCountry: exportCountry,
    originCountry: originCountry,
    processDate: processDate,
    receiptNumber: receiptNumber,
    receiptDate: receiptDate,
    paymentAmount: paymentAmount,
    quantity_unit: quantityUnit,
    cost_currency: costCurrency,
    shipments: shipments
  };

  let url = '/save-certificate/';
  let method = 'POST';

  fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken'),
    },
    body: JSON.stringify(data),
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(errorData => { throw new Error(errorData.message || 'An error occurred'); });
    }
    return response.json();
  })
  .then(respData => {
    if (respData.status === 'success') {
      certificateId = respData.certificateId;
      alert('تم الحفظ بنجاح!');
      document.getElementById('saveButton').innerHTML = 'حفظ';

      const formData = {
        id: certificateId,
        office: office,
        branchName: respData.branchName, // Use server’s branchName
        registrationNumber: registrationNumber,
        certificateNumber: certificateNumber,
        companyName: companyName,
        companyAddress: companyAddress,
        companyStatus: companyStatus,
        companyType: companyType,
        importCompanyName: importCompanyName,
        importCompanyAddress: importCompanyAddress,
        importCompanyPhone: importCompanyPhone,
        exportCountry: exportCountry,
        originCountry: originCountry,
        issueDate: processDate,
        receiptNumber: receiptNumber,
        receiptDate: receiptDate,
        paymentAmount: paymentAmount,
        shipments: Array.isArray(respData.shipments) ? respData.shipments : [],
        quantity: typeof respData.total_quantity === 'number' ? respData.total_quantity : 0,
        cost: typeof respData.total_cost === 'number' ? respData.total_cost : 0,
        quantity_unit: respData.quantity_unit || 'كجم',
        currency: respData.currency || 'USD'
      };
      createCertificateTable(formData);
    } else {
      alert('حدث خطأ أثناء الحفظ: ' + respData.message);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    if (error.message.includes('403')) {
      alert('ليس لديك الصلاحية لحفظ الشهادة. يرجى التواصل مع المسؤول.');
    } else {
      alert('حدث خطأ أثناء الاتصال بالخادم: ' + error.message);
    }
  });
});

function createCertificateTable(formData) {
  console.log('Creating table with data:', formData);

  const table = document.createElement('table');
  table.setAttribute('border', '1');
  table.style.borderCollapse = 'collapse';

  const headers = [
    'اسم المكتب', 'اسم الفرع', 'رقم السجل', 'رقم الشهادة', 'اسم الشركة', 'عنوان الشركة',
    'حالة المنشأه', 'نوع الشركة', 'اسم الشركه المستورده', 'عنوان الشركه المستورده',
    'تليفون الشركه المستورده', 'البضاعة', 'بلد التصدير', 'بلد المنشأ', 'تاريخ العملية',
    'القيمة', 'التكلفة', 'رقم الايصال', 'تاريخ الايصال', 'القيمة المدفوعة', 'التعديل', 'الحذف'
  ];
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headers.forEach((text, index) => {
    const th = document.createElement('th');
    th.textContent = text;
    if (index === 11) {
      th.style.width = '150px';
      th.style.minWidth = '150px';
    }
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  let cargoContent = "لا توجد شحنات";
  if (formData.shipments && Array.isArray(formData.shipments) && formData.shipments.length > 0) {
    cargoContent = formData.shipments.map(shipment => {
      const cargo = shipment.cargo || 'غير محدد';
      const quantity = (shipment.quantity !== undefined && shipment.quantity !== null) ? shipment.quantity : '0';
      const cost = (shipment.cost_amount !== undefined && shipment.cost_amount !== null) ? shipment.cost_amount : '0';
      const quantityUnit = formData.quantity_unit || 'كجم';
      const currency = formData.currency || 'USD';
      return `${cargo}<br>${quantity} ${quantityUnit}<br>${cost} ${currency}`;
    }).join("<hr>");
  }

  const cellsData = [
    formData.office || '-',
    formData.branchName || '-', // Now uses server’s branchName
    formData.registrationNumber || '-',
    formData.certificateNumber || '-',
    formData.companyName || '-',
    formData.companyAddress || '-',
    formData.companyStatus || '-',
    formData.companyType || '-',
    formData.importCompanyName || '-',
    formData.importCompanyAddress || '-',
    formData.importCompanyPhone || '-',
    cargoContent,
    formData.exportCountry || '-',
    formData.originCountry || '-',
    formData.issueDate || '-',
    formData.quantity !== undefined ? `${formData.quantity} ${formData.quantity_unit || 'كجم'}` : '0',
    formData.cost !== undefined ? `${formData.cost} ${formData.currency || 'USD'}` : '0',
    formData.receiptNumber || '-',
    formData.receiptDate || '-',
    formData.paymentAmount || '-',
  ];

  const tbody = document.createElement('tbody');
  const dataRow = document.createElement('tr');
  cellsData.forEach((value, index) => {
    const td = document.createElement('td');
    if (index === 11) {
      td.style.whiteSpace = 'nowrap';
      td.innerHTML = value;
    } else {
      td.textContent = value;
    }
    dataRow.appendChild(td);
  });

  // Only show edit/delete buttons for branch admins
  if (window.isBranchAdmin) {
    const editCell = document.createElement('td');
    const editButton = document.createElement('button');
    editButton.textContent = 'تعديل';
    editButton.addEventListener('click', function () {
      // Implement edit functionality if needed
    });
    editCell.appendChild(editButton);
    dataRow.appendChild(editCell);

    const deleteCell = document.createElement('td');
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'حذف';
    deleteButton.addEventListener('click', function () {
      dataRow.remove();
    });
    deleteCell.appendChild(deleteButton);
    dataRow.appendChild(deleteCell);
  }

  tbody.appendChild(dataRow);
  table.appendChild(tbody);

  const container = document.getElementById('newTableContainer');
  if (container) {
    container.innerHTML = '';
    container.appendChild(table);
  } else {
    console.error('newTableContainer not found in the DOM');
  }
}

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Function to disable/enable office and registrationNumber fields
document.addEventListener('DOMContentLoaded', function () {
  const companyStatus = document.getElementById('companyStatus');
  const officeField = document.getElementById('office');
  const registrationNumberField = document.getElementById('registrationNumber');

  companyStatus.addEventListener('change', function () {
    if (this.value === 'غير مقيد') {
      officeField.disabled = true;
      registrationNumberField.disabled = true;
    } else {
      officeField.disabled = false;
      registrationNumberField.disabled = false;
    }
  });
});

// Search Certificates
function searchCertificates() {
  const office = document.getElementById('filterOffice').value;
  const registrationNumber = document.getElementById('filterRegistrationNumber').value;

  const url = `/filter_certificates/?office=${encodeURIComponent(office)}&registrationNumber=${encodeURIComponent(registrationNumber)}`;
  console.log("Fetching URL:", url);

  fetch(url)
    .then(response => {
      console.log("Response Status:", response.status);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      console.log("API Response:", data);
      const tableBody = document.querySelector('#resultsTable tbody');
      tableBody.innerHTML = '';

      if (data.certificates && data.certificates.length > 0) {
        console.log("Number of certificates:", data.certificates.length);
        data.certificates.forEach(cert => {
          console.log("Certificate Data:", cert);
          let cargoContent = "لا توجد شحنات";
          if (cert.shipments && Array.isArray(cert.shipments) && cert.shipments.length > 0) {
            cargoContent = cert.shipments.map(shipment => {
              const cargo = shipment.cargo || 'غير محدد';
              const quantity = (shipment.quantity !== undefined && shipment.quantity !== null) ? shipment.quantity : '0';
              const cost = (shipment.cost_amount !== undefined && shipment.cost_amount !== null) ? shipment.cost_amount : '0';
              const quantityUnit = shipment.quantity_unit || 'كجم';
              const currency = shipment.cost_currency || 'USD';
              return `${cargo}<br>${quantity} ${quantityUnit}<br>${cost} ${currency}`;
            }).join('<hr class="shipment-divider">');
          }

          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${cert.office_name || ''}</td>
            <td>${cert.registration_number || ''}</td>
            <td>${cert.certificate_number || ''}</td>
            <td>${cert.company_name || ''}</td>
            <td>${cert.company_address || ''}</td>
            <td>${cert.company_status || ''}</td>
            <td>${cert.company_type || ''}</td>
            <td>${cert.branch_name || ''}</td>
            <td>${cert.import_company_name || ''}</td>
            <td>${cert.import_company_address || ''}</td>
            <td>${cert.import_company_phone || ''}</td>
            <td>${cargoContent}</td>
            <td>${cert.export_country || ''}</td>
            <td>${cert.origin_country || ''}</td>
            <td>${cert.issue_date || ''}</td>
            <td>${cert.quantity_display || 'غير متوفر'}</td>
            <td>${cert.cost_display || 'غير متوفر'}</td>
            <td>${cert.receipt_number || ''}</td>
            <td>${cert.receipt_date || ''}</td>
            <td>${cert.payment_amount || ''}</td>
          `;

          // 🔥 Add edit and delete buttons ONLY if admin
          if (window.isBranchAdmin) {  // Ensure this is set correctly in template
            row.innerHTML += `
                <td><button onclick='openEditModal(${JSON.stringify(cert)})'>تعديل</button></td>
                <td><button onclick="deleteCertificate(${cert.id})">حذف</button></td>
            `;
        }


          tableBody.appendChild(row);
        });
      } else {
        console.log("No certificates found or data.certificates is undefined");
        tableBody.innerHTML = `<tr><td colspan="22">لا توجد نتائج</td></tr>`;
      }
    })
    .catch(error => {
      console.error('Error fetching data:', error);
      const tableBody = document.querySelector('#resultsTable tbody');
      tableBody.innerHTML = `<tr><td colspan="22">حدث خطأ أثناء جلب البيانات</td></tr>`;
    });
}

function editCertificate(cert) {
  openEditModal(cert);
}

function deleteCertificate(certId) {
  if (confirm("هل أنت متأكد من حذف الشهادة؟")) {
    fetch(`/delete-certificate/${certId}/`, {
      method: 'DELETE',
      headers: {
        'X-CSRFToken': getCookie('csrftoken'),
      },
    })
      .then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          alert('تم الحذف بنجاح');
          searchCertificates();
        } else {
          alert('خطأ في الحذف: ' + data.message);
        }
      })
      .catch(error => console.error('Error:', error));
  }
}

function editCargo(cargoId, currentGoods) {
  const newGoods = prompt("أدخل البضاعة الجديدة:", currentGoods);
  if (newGoods !== null && newGoods.trim() !== "") {
    fetch(`/update-cargo/${cargoId}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken')
      },
      body: JSON.stringify({ ExportedGoods: newGoods })
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === 'success') {
        alert('تم التحديث بنجاح');
        const row = document.querySelector(`tr[data-cargo-id="${cargoId}"]`);
        row.cells[0].textContent = newGoods;
      } else {
        alert('خطأ في التحديث: ' + data.message);
      }
    })
    .catch(error => console.error('Error:', error));
  }
}

function editCountry(countryId, currentCountryName) {
  const newCountryName = prompt("أدخل اسم الدولة الجديدة:", currentCountryName);
  if (newCountryName !== null && newCountryName.trim() !== "") {
    fetch(`/update-country/${countryId}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken')
      },
      body: JSON.stringify({ CountryName: newCountryName })
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === 'success') {
        alert('تم التحديث بنجاح');
        const row = document.querySelector(`tr[data-country-id="${countryId}"]`);
        row.cells[0].textContent = newCountryName;
      } else {
        alert('خطأ في التحديث: ' + data.message);
      }
    })
    .catch(error => console.error('Error:', error));
  }
}

// Updated helper function to apply asterisks to required fields, including shipment fields
function applyAsterisksToRequiredFields(container = document) {
  // Handle fields with IDs (static form fields)
  container.querySelectorAll('input[required], select[required]').forEach(element => {
    const label = container.querySelector(`label[for="${element.id}"]`);
    if (label && !label.querySelector('.required-asterisk')) {
      const asterisk = document.createElement('span');
      asterisk.className = 'required-asterisk';
      asterisk.textContent = '*';
      label.appendChild(asterisk);
    }
  });

  // Handle shipment fields (no IDs, using structure)
  container.querySelectorAll('.shipment-group').forEach(group => {
    group.querySelectorAll('select.cargo[required], input.quantity[required], input.cost_amount[required]').forEach(element => {
      const label = element.closest('div').querySelector('label');
      if (label && !label.querySelector('.required-asterisk')) {
        const asterisk = document.createElement('span');
        asterisk.className = 'required-asterisk';
        asterisk.textContent = '*';
        label.appendChild(asterisk);
      }
    });
  });
}

function applyAsterisksToShipmentFields() {
  const shipmentContainer = document.getElementById('shipmentContainer');
  if (shipmentContainer) {
    applyAsterisksToRequiredFields(shipmentContainer);
  }
}

function openEditModal(rowData) {
  console.log("Opening edit modal with data:", rowData);

  document.getElementById('editCertificateId').value = rowData.id;
  document.querySelector('#editForm #office').value = rowData.office_name || '';
  document.querySelector('#editForm #companyName').value = rowData.company_name || '';
  document.querySelector('#editForm #companyAddress').value = rowData.company_address || '';
  document.querySelector('#editForm #companyStatus').value = rowData.company_status || '';
  document.querySelector('#editForm #companyType').value = rowData.company_type || '';
  document.querySelector('#editForm #registrationNumber').value = rowData.registration_number || '';
  document.querySelector('#editForm #certificateNumber').value = rowData.certificate_number || '';
  document.querySelector('#editForm #exportCountry').value = rowData.export_country || '';
  document.querySelector('#editForm #originCountry').value = rowData.origin_country || '';
  document.querySelector('#editForm #processDate').value = rowData.issue_date || '';
  document.querySelector('#editForm #receiptNumber').value = rowData.receipt_number || '';
  document.querySelector('#editForm #receiptDate').value = rowData.receipt_date || '';
  document.querySelector('#editForm #paymentAmount').value = rowData.payment_amount || '';

  const branchNameSelect = document.querySelector('#editForm #branchName');
  console.log("Branch name from rowData:", rowData.branch_name);
  branchNameSelect.value = rowData.branch_name || '';
  if (!branchNameSelect.value) {
    console.warn("Branch name not set. Available options:", Array.from(branchNameSelect.options).map(opt => opt.value));
  }

  document.querySelector('#editForm #importCompanyName').value = rowData.import_company_name || '';
  document.querySelector('#editForm #importCompanyAddress').value = rowData.import_company_address || '';
  document.querySelector('#editForm #importCompanyPhone').value = rowData.import_company_phone || '';

  document.querySelector('#editForm #quantity_unit').value = rowData.shipments && rowData.shipments.length > 0 ? rowData.shipments[0].quantity_unit : 'كجم';
  document.querySelector('#editForm #cost_currency').value = rowData.shipments && rowData.shipments.length > 0 ? rowData.shipments[0].cost_currency : 'USD';

  if (rowData.company_status === 'غير مقيد') {
    document.querySelector('#editForm #office').disabled = true;
    document.querySelector('#editForm #registrationNumber').disabled = true;
  } else {
    document.querySelector('#editForm #office').disabled = false;
    document.querySelector('#editForm #registrationNumber').disabled = false;
  }

  const shipmentContainer = document.getElementById('shipmentContainer');
  if (!shipmentContainer) {
    console.error("shipmentContainer not found in the DOM");
    return;
  }
  shipmentContainer.innerHTML = '';

  const template = document.getElementById('shipmentTemplate');
  if (!template) {
    console.error("Shipment template not found!");
    return;
  }

  if (rowData.shipments && rowData.shipments.length > 0) {
    const promises = rowData.shipments.map(shipment => {
      const clone = template.content.cloneNode(true);
      const cargoSelect = clone.querySelector('.cargo');
      const quantityInput = clone.querySelector('.quantity');
      const costInput = clone.querySelector('.cost_amount');

      quantityInput.value = shipment.quantity || '0';
      costInput.value = shipment.cost_amount || '0';

      return loadItemsForGroup(cargoSelect).then(() => {
        console.log("Setting cargo value to:", shipment.cargo);
        cargoSelect.value = shipment.cargo || '';
        if (!cargoSelect.value) {
          console.warn("Cargo value not found in options:", shipment.cargo);
        }

        const removeBtn = clone.querySelector('.removeShipment');
        removeBtn.addEventListener('click', function () {
          this.closest('.shipment-group').remove();
        });

        shipmentContainer.appendChild(clone);
      });
    });

    Promise.all(promises).then(() => {
      attachAddShipmentListener();
      applyAsterisksToRequiredFields(document.getElementById('editModal')); // Apply asterisks after loading
      document.getElementById('editModal').style.display = "block";
    }).catch(error => {
      console.error("Error loading shipment options:", error);
      attachAddShipmentListener();
      applyAsterisksToRequiredFields(document.getElementById('editModal')); // Apply even on error
      document.getElementById('editModal').style.display = "block";
    });
  } else {
    const clone = template.content.cloneNode(true);
    const cargoSelect = clone.querySelector('.cargo');
    loadItemsForGroup(cargoSelect).then(() => {
      const removeBtn = clone.querySelector('.removeShipment');
      removeBtn.addEventListener('click', function () {
        this.closest('.shipment-group').remove();
      });
      shipmentContainer.appendChild(clone);
      attachAddShipmentListener();
      applyAsterisksToRequiredFields(document.getElementById('editModal')); // Apply asterisks after adding
      document.getElementById('editModal').style.display = "block";
    });
  }
}

function submitEditModal() {
  const certificateId = document.querySelector('#editForm #editCertificateId')?.value;
  if (!certificateId) {
    alert('خطأ: معرف الشهادة غير موجود');
    return;
  }

  const data = {
    office: document.querySelector('#editForm #office')?.value || '',
    branchName: document.querySelector('#editForm #branchName')?.value || '',
    companyStatus: document.querySelector('#editForm #companyStatus')?.value || '',
    registrationNumber: document.querySelector('#editForm #registrationNumber')?.value || '',
    certificateNumber: document.querySelector('#editForm #certificateNumber')?.value || '',
    companyName: document.querySelector('#editForm #companyName')?.value || '',
    companyAddress: document.querySelector('#editForm #companyAddress')?.value || '',
    companyType: document.querySelector('#editForm #companyType')?.value || '',
    exportCountry: document.querySelector('#editForm #exportCountry')?.value || '',
    originCountry: document.querySelector('#editForm #originCountry')?.value || '',
    importCompanyName: document.querySelector('#editForm #importCompanyName')?.value || '',
    importCompanyAddress: document.querySelector('#editForm #importCompanyAddress')?.value || '',
    importCompanyPhone: document.querySelector('#editForm #importCompanyPhone')?.value || '',
    processDate: document.querySelector('#editForm #processDate')?.value || '',
    receiptNumber: document.querySelector('#editForm #receiptNumber')?.value || '',
    receiptDate: document.querySelector('#editForm #receiptDate')?.value || '',
    paymentAmount: document.querySelector('#editForm #paymentAmount')?.value || '',
    quantity_unit: document.querySelector('#editForm #quantity_unit')?.value || '',
    cost_currency: document.querySelector('#editForm #cost_currency')?.value || '',
    shipments: collectShipments()
  };

  if (data.shipments.length === 0) {
    alert('يرجى إضافة شحنة واحدة على الأقل تحتوي على بضاعة وكمية وتكلفة صالحة.');
    return;
  }

  const url = `/update-certificate/${certificateId}/`;
  const csrfToken = getCookie('csrftoken');

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken || ''
    },
    body: JSON.stringify(data),
  })
  .then(response => {
    if (!response.ok) {
      return response.text().then(text => {
        throw new Error(`HTTP error! status: ${response.status}, response: ${text}`);
      });
    }
    return response.json();
  })
  .then(respData => {
    if (respData.status === 'success') {
      alert('تم تعديل البيانات بنجاح!');
      closeEditModal();
      searchCertificates();
    } else {
      throw new Error(`Unexpected response status: ${respData.status}, message: ${respData.message}`);
    }
  })
  .catch(error => {
    console.error('Fetch error details:', error);
    alert('حدث خطأ أثناء التعديل: ' + error.message);
  });
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
}

function collectShipments() {
  const shipmentGroups = document.querySelectorAll('#shipmentContainer .shipment-group');
  const shipments = [];
  shipmentGroups.forEach(group => {
    const cargo = group.querySelector('.cargo').value;
    const quantity = parseFloat(group.querySelector('.quantity').value) || 0;
    const cost_amount = parseFloat(group.querySelector('.cost_amount').value) || 0;
    if (cargo && quantity > 0 && cost_amount > 0) {
      shipments.push({ cargo, quantity, cost_amount });
    }
  });
  return shipments;
}

document.getElementById('addShipmentGroup').addEventListener('click', function () {
  const template = document.getElementById('shipmentTemplate');
  if (!template) {
    console.error('Shipment template not found!');
    return;
  }
  const clone = template.content.cloneNode(true);
  const cargoSelect = clone.querySelector('.cargo');
  if (cargoSelect) {
    loadItemsForGroup(cargoSelect);
  }
  const removeBtn = clone.querySelector('.removeShipment');
  if (removeBtn) {
    removeBtn.addEventListener('click', function () {
      this.closest('.shipment-group').remove();
    });
  }
  document.getElementById('shipmentContainer').appendChild(clone);
  applyAsterisksToRequiredFields(document.getElementById('shipmentContainer')); // Apply asterisks to new shipment
});

function loadItemsForGroup(selectElement) {
  return fetch(`/get_items/?item_type=cargo`)
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        selectElement.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.text = "اختر البضاعه";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        defaultOption.hidden = true;
        selectElement.appendChild(defaultOption);
        data.items.forEach(item => {
          const option = document.createElement('option');
          option.value = item.ExportedGoods;
          option.text = item.ExportedGoods;
          selectElement.appendChild(option);
        });
      }
    })
    .catch(error => console.error('Error loading cargo items:', error));
}

function attachAddShipmentListener() {
  const addShipmentButton = document.getElementById('addShipmentGroup');
  if (!addShipmentButton) {
    console.error("addShipmentGroup button not found!");
    return;
  }
  addShipmentButton.removeEventListener('click', handleAddShipment);
  addShipmentButton.addEventListener('click', handleAddShipment);
}

function handleAddShipment() {
  const template = document.getElementById('shipmentTemplate');
  if (!template) {
    console.error('Shipment template not found!');
    return;
  }
  const clone = template.content.cloneNode(true);
  const cargoSelect = clone.querySelector('.cargo');
  loadItemsForGroup(cargoSelect).then(() => {
    const removeBtn = clone.querySelector('.removeShipment');
    removeBtn.addEventListener('click', function () {
      this.closest('.shipment-group').remove();
    });
    document.getElementById('shipmentContainer').appendChild(clone);
    applyAsterisksToRequiredFields(document.getElementById('shipmentContainer')); // Apply asterisks to new shipment
  }).catch(error => console.error('Error adding shipment:', error));
}

document.addEventListener('DOMContentLoaded', function() {
  loadItems('cargo');
  loadItems('exportCountry');
  loadItems('originCountry');
});

document.addEventListener('DOMContentLoaded', function() {
  // Add red asterisks to labels of required fields on page load
  applyAsterisksToRequiredFields(document); // Apply to entire document initially

  loadItems('cargo');
  loadItems('exportCountry');
  loadItems('originCountry');

  // Add an initial shipment group on page load (for index.html)
  const shipmentContainer = document.getElementById('shipmentContainer');
  if (shipmentContainer && shipmentContainer.children.length === 0) {
    const template = document.getElementById('shipmentTemplate');
    const clone = template.content.cloneNode(true);
    const cargoSelect = clone.querySelector('.cargo');
    loadItemsForGroup(cargoSelect).then(() => {
      const removeBtn = clone.querySelector('.removeShipment');
      removeBtn.addEventListener('click', function () {
        this.closest('.shipment-group').remove();
      });
      shipmentContainer.appendChild(clone);
      applyAsterisksToShipmentFields(); // Apply asterisks to initial shipment
    });
  }

  const companyStatus = document.getElementById('companyStatus');
  const officeField = document.getElementById('office');
  const registrationNumberField = document.getElementById('registrationNumber');

  companyStatus.addEventListener('change', function () {
    if (this.value === 'غير مقيد') {
      officeField.disabled = true;
      registrationNumberField.disabled = true;
    } else {
      officeField.disabled = false;
      registrationNumberField.disabled = false;
    }
  });
});