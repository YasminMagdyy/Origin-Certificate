let mode;

function toggleSidebar() {
    var sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("active");
}

// Close the sidebar when clicking anywhere outside the sidebar and menu button
document.addEventListener('click', function (e) {
  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.querySelector('.menu-btn');

  // If sidebar is active and the click target is not inside the sidebar or the menu button, remove the active class.
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
  
  // Prepare data to send
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
      // Refresh the select list for the current field by calling loadItems again
      loadItems(currentField);
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
          selectElement = document.getElementById('cargo');
        } else if (item_type === 'exportCountry') {
          selectElement = document.getElementById('exportCountry');
        } else if (item_type === 'originCountry') {
          selectElement = document.getElementById('originCountry');
        }
        if (selectElement) {
          // Clear current options
          selectElement.innerHTML = '';

          if (item_type === 'cargo') {
            // Set default option for cargo with hidden attribute
            const defaultOption = document.createElement('option');
            defaultOption.value = "";
            defaultOption.text = "اختر البضاعه";
            defaultOption.disabled = true;
            defaultOption.selected = true;
            defaultOption.hidden = true;
            selectElement.appendChild(defaultOption);
          } else if (item_type === 'exportCountry') {
            // Set default option for exportCountry with hidden attribute
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.text = 'اختر بلد التصدير';
            defaultOption.disabled = true;
            defaultOption.selected = true;
            defaultOption.hidden = true;
            selectElement.appendChild(defaultOption);
          } else if (item_type === 'originCountry') {
            // For originCountry, add default "مصر" as a placeholder
            const defaultOption = document.createElement('option');
            defaultOption.value = "مصر";
            defaultOption.text = "مصر";
            defaultOption.selected = true;
            selectElement.appendChild(defaultOption);
          }

          // Append items from the response
          data.items.forEach(item => {
            // For originCountry, skip adding "مصر" if already added
            if (item_type === 'originCountry' && item.CountryName === "مصر") {
              return;
            }
            const option = document.createElement('option');
            option.value = (item_type === 'cargo') ? item.ExportedGoods : item.CountryName;
            option.text = (item_type === 'cargo') ? item.ExportedGoods : item.CountryName;
            selectElement.appendChild(option);
          });
        }
      }
    })
    .catch(error => console.error('Error loading items:', error));
}

// Load items for each select on page load
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
  console.log('Enter key pressed'); // Add this line
  if (e.key === 'Enter') {
      console.log('Fetching company data...'); // Add this line
      const office = document.getElementById('office').value;
      const registrationNumber = document.getElementById('registrationNumber').value;

      if (!office || !registrationNumber) {
          alert('يرجى اختيار اسم المكتب وإدخال رقم السجل.');
          return;
      }

      // Fetch company data from the backend
      fetch(`/get-company-data/?office=${office}&registrationNumber=${registrationNumber}`)
          .then(response => response.json())
          .then(data => {
              console.log('Response data:', data); // Add this line
              if (data.error) {
                  alert(data.error); // Show error message
              } else {
                  // Autofill the form fields
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
document.getElementById('saveButton').addEventListener('click', function () {

  const rightForm = document.getElementById('rightForm');
  const leftForm = document.getElementById('leftForm');

  // Check if both forms are valid
  if (!rightForm.checkValidity() || !leftForm.checkValidity()) {
    // Optionally display the validation messages
    rightForm.reportValidity();
    leftForm.reportValidity();
    // Prevent further processing if invalid
    return;
  }

  // Determine mode; default is "save"
  mode = mode || "save";

  // Check if office and registrationNumber fields are disabled
  const isUnregistered = document.getElementById('companyStatus').value === 'غير مقيد';
  const office = isUnregistered ? null : document.getElementById('office').value;
  const registrationNumber = isUnregistered ? null : document.getElementById('registrationNumber').value;

  // Existing fields
  const certificateNumber = document.getElementById('certificateNumber').value;
  const companyName = document.getElementById('companyName').value;
  const companyAddress = document.getElementById('companyAddress').value;
  const companyStatus = document.getElementById('companyStatus').value;
  const companyType = document.getElementById('companyType').value;
  const cargo = document.getElementById('cargo').value;
  const exportCountry = document.getElementById('exportCountry').value;
  const originCountry = document.getElementById('originCountry').value;
  const processDate = document.getElementById('processDate').value;
  const receiptNumber = document.getElementById('receiptNumber').value;
  const receiptDate = document.getElementById('receiptDate').value;
  const paymentAmount = document.getElementById('paymentAmount').value;

  // New fields for Quantity and Cost
  const quantity = document.getElementById('quantity').value;
  const quantityUnit = document.getElementById('quantity_unit').value;
  const costAmount = document.getElementById('cost_amount').value;
  const costCurrency = document.getElementById('cost_currency').value;

  // Prepare the data to be sent to the backend
  const data = {
    office: office,
    registrationNumber: registrationNumber,
    certificateNumber: certificateNumber,
    companyName: companyName,
    companyAddress: companyAddress,
    companyStatus: companyStatus,
    companyType: companyType,
    cargo: cargo,
    exportCountry: exportCountry,
    originCountry: originCountry,
    processDate: processDate,
    receiptNumber: receiptNumber,
    receiptDate: receiptDate,
    paymentAmount: paymentAmount,
    quantity: quantity,
    quantity_unit: quantityUnit,
    cost: costAmount,
    cost_currency: costCurrency,
  };

  let url, method;
  if (mode === "update") {
    url = `/update-certificate/${certificateId}/`;
    method = 'PUT';
  } else {
    url = '/save-certificate/';
    method = 'POST';
  }

  // Send the data to the backend
  fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken'),
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((respData) => {
      if (respData.status === 'success') {
        certificateId = respData.certificateId;
        alert('تم الحفظ بنجاح!');
        document.getElementById('saveButton').innerHTML = 'حفظ';

        // Create/update the certificate table with form data
        createCertificateTable({
          id: certificateId,
          office: office,
          // branch: 'فرع افتراضي', // Adjust if branch data is available
          registrationNumber: registrationNumber,
          certificateNumber: certificateNumber,
          companyName: companyName,
          companyAddress: companyAddress,
          companyStatus: companyStatus,
          companyType: companyType,
          exportCountry: exportCountry,
          originCountry: originCountry,
          cargo: cargo,
          issueDate: processDate,
          quantity: quantity + ' ' + quantityUnit,
          cost: costAmount + ' ' + costCurrency,
          receiptNumber: receiptNumber,
          receiptDate: receiptDate,
          paymentAmount: paymentAmount,
        });

        // Reset mode to "save" after updating
        mode = 'save';
      } else {
        alert('حدث خطأ أثناء الحفظ: ' + respData.message);
      }
    })
    .catch((error) => console.error('Error:', error));
});

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

// Create and display the certificate table
function createCertificateTable(formData) {
  // Create a new table element
  const table = document.createElement('table');
  table.setAttribute('border', '1');

  // Create the table header with additional columns for Quantity and Cost
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  const headers = [
    'اسم المكتب',
    // 'اسم الفرع',
    'رقم السجل',
    'رقم الشهادة',
    'اسم الشركة',
    'عنوان الشركة',
    'حالة المنشأه',
    'نوع الشركة',
    'البضاعة',
    'بلد التصدير',
    'بلد المنشأ',
    'تاريخ العملية',
    'القيمة',
    'التكلفة',
    'رقم الايصال',
    'تاريخ الايصال',
    'القيمة المدفوعة',
    'التعديل',
    'الحذف',
  ];

  headers.forEach((text) => {
    const th = document.createElement('th');
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create the table body with a single row (for demonstration)
  const tbody = document.createElement('tbody');
  const dataRow = document.createElement('tr');

  // Prepare the data array in the same order as headers
  const rowData = [
    formData.office,
    // formData.branch,
    formData.registrationNumber,
    formData.certificateNumber,
    formData.companyName,
    formData.companyAddress,
    formData.companyStatus,
    formData.companyType,
    formData.cargo,
    formData.exportCountry,
    formData.originCountry,
    formData.issueDate,
    formData.quantity,
    formData.cost,
    formData.receiptNumber,
    formData.receiptDate,
    formData.paymentAmount,
  ];

  rowData.forEach((value) => {
    const td = document.createElement('td');
    td.textContent = value;
    dataRow.appendChild(td);
  });

  // Create Edit button
  const editCell = document.createElement('td');
  const editButton = document.createElement('button');
  editButton.textContent = 'تعديل';
  editButton.addEventListener('click', function () {
    // Populate form fields with current data
    document.getElementById('office').value = formData.office;
    document.getElementById('registrationNumber').value = formData.registrationNumber;
    document.getElementById('certificateNumber').value = formData.certificateNumber;
    document.getElementById('companyName').value = formData.companyName;
    document.getElementById('companyAddress').value = formData.companyAddress;
    document.getElementById('companyStatus').value = formData.companyStatus;
    document.getElementById('companyType').value = formData.companyType;
    document.getElementById('cargo').value = formData.cargo;
    document.getElementById('exportCountry').value = formData.exportCountry;
    document.getElementById('originCountry').value = formData.originCountry;
    document.getElementById('processDate').value = formData.issueDate;
    document.getElementById('receiptNumber').value = formData.receiptNumber;
    document.getElementById('receiptDate').value = formData.receiptDate;
    document.getElementById('paymentAmount').value = formData.paymentAmount;

    // Populate new fields for Quantity and Cost
    const [quantityValue, quantityUnit] = formData.quantity.split(' ');
    document.getElementById('quantity').value = quantityValue;
    document.getElementById('quantity_unit').value = quantityUnit;

    const [costAmt, costCurr] = formData.cost.split(' ');
    document.getElementById('cost_amount').value = costAmt;
    document.getElementById('cost_currency').value = costCurr;

    mode = 'update';
    document.getElementById('saveButton').innerHTML = 'تعديل';
  });
  editCell.appendChild(editButton);
  dataRow.appendChild(editCell);

  // Create Delete button (assumes deleteCertificate is implemented)
  const deleteCell = document.createElement('td');
  const deleteButton = document.createElement('button');
  deleteButton.textContent = 'حذف';
  deleteButton.addEventListener('click', function () {
    deleteCertificate(certificateId);
    // Remove the row from the table
    dataRow.remove();
  });
  deleteCell.appendChild(deleteButton);
  dataRow.appendChild(deleteCell);

  tbody.appendChild(dataRow);
  table.appendChild(tbody);

  // Append the table to the container
  const container = document.getElementById('newTableContainer');
  container.innerHTML = ''; // Clear previous content
  container.appendChild(table);
}

// -------------------------
// Search Function (Example)
// -------------------------
// Search Certificates
function searchCertificates() {
  // Use unique IDs for the filter form fields
  const office = document.getElementById('filterOffice').value;
  const registrationNumber = document.getElementById('filterRegistrationNumber').value;

  // Construct the URL with encoded query parameters
  const url = `/filter_certificates/?office=${encodeURIComponent(office)}&registrationNumber=${encodeURIComponent(registrationNumber)}`;
  console.log("Fetching URL:", url); // Debug: check the URL in console

  fetch(url)
    .then(response => response.json())
    .then(data => {
      const tableBody = document.querySelector('#resultsTable tbody');
      tableBody.innerHTML = ''; // Clear any previous results

      if (data.certificates && data.certificates.length > 0) {
        data.certificates.forEach(cert => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${cert.office_name}</td>
            <td>${cert.registration_number}</td>
            <td>${cert.certificate_number}</td>
            <td>${cert.company_name}</td>
            <td>${cert.company_address}</td>
            <td>${cert.company_status}</td>
            <td>${cert.company_type}</td>
            <td>${cert.exported_goods}</td>
            <td>${cert.export_country}</td>
            <td>${cert.origin_country}</td>
            <td>${cert.issue_date}</td>
            <td>${cert.quantity_display}</td>
            <td>${cert.cost_display}</td>
            <td>${cert.receipt_number}</td>
            <td>${cert.receipt_date}</td>
            <td>${cert.payment_amount}</td>
            <td><button onclick='openEditModal(${JSON.stringify(cert)})'>تعديل</button></td>
            <td><button onclick="deleteCertificate(${cert.id})">حذف</button></td>
          `;
          tableBody.appendChild(row);
        });
      } else {
        tableBody.innerHTML = `<tr><td colspan="17">لا توجد نتائج</td></tr>`;
      }
    })
    .catch(error => console.error('Error fetching data:', error));
}

// Function to get CSRF token from cookies
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

function editCertificate(cert) {
  // For example, prompt to update certificate_number.
  openEditModal(cert);
}

// Delete Certificate
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
          searchCertificates(); // Refresh table
        } else {
          alert('خطأ في الحذف: ' + data.message);
        }
      })
      .catch(error => console.error('Error:', error));
  }
}
// EDIT and DELETE functions for Cargo
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
        // Update the table cell
        const row = document.querySelector(`tr[data-cargo-id="${cargoId}"]`);
        row.cells[0].textContent = newGoods;
      } else {
        alert('خطأ في التحديث: ' + data.message);
      }
    })
    .catch(error => console.error('Error:', error));
  }
}

// EDIT and DELETE functions for Country
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

// Open Edit Modal
function openEditModal(rowData) {
  // Populate the hidden certificate ID field
  document.getElementById('certificateId').value = rowData.id;

  // Populate the basic form fields
  document.querySelector('#editForm #office').value = rowData.office_name || '';
  document.querySelector('#editForm #companyName').value = rowData.company_name;
  document.querySelector('#editForm #companyAddress').value = rowData.company_address;
  document.querySelector('#editForm #companyStatus').value = rowData.company_status;
  document.querySelector('#editForm #companyType').value = rowData.company_type;
  document.querySelector('#editForm #registrationNumber').value = rowData.registration_number || '';
  document.querySelector('#editForm #certificateNumber').value = rowData.certificate_number;
  document.querySelector('#editForm #cargo').value = rowData.exported_goods;
  document.querySelector('#editForm #exportCountry').value = rowData.export_country;
  document.querySelector('#editForm #originCountry').value = rowData.origin_country;
  document.querySelector('#editForm #processDate').value = rowData.issue_date;
  document.querySelector('#editForm #receiptNumber').value = rowData.receipt_number;
  document.querySelector('#editForm #receiptDate').value = rowData.receipt_date;
  document.querySelector('#editForm #paymentAmount').value = rowData.payment_amount;

  // Populate the new fields using raw values from the JSON response
  document.querySelector('#editForm #quantity').value = rowData.quantity;
  document.querySelector('#editForm #quantity_unit').value = rowData.quantity_unit;
  document.querySelector('#editForm #cost_amount').value = rowData.cost_amount || '';
  document.querySelector('#editForm #cost_currency').value = rowData.cost_currency;

  // Disable office and registrationNumber fields if company status is "غير مقيد"
  if (rowData.company_status === 'غير مقيد') {
    document.querySelector('#editForm #office').disabled = true;
    document.querySelector('#editForm #registrationNumber').disabled = true;
  } else {
    document.querySelector('#editForm #office').disabled = false;
    document.querySelector('#editForm #registrationNumber').disabled = false;
  }

  // Display the edit modal
  document.getElementById('editModal').style.display = "block";
}

// Close Edit Modal
function closeEditModal() {
  document.getElementById('editModal').style.display = "none";
}

// Submit Edit Modal
function submitEditModal() {
  const editForm = document.getElementById('editForm');
  if (!editForm.checkValidity()) {
    // Show browser validation messages if the form is invalid.
    editForm.reportValidity();
    return; // Stop processing if the form is not valid.
  }
  const certificateId = document.getElementById('certificateId').value;
  const office = document.querySelector('#editForm #office').value;
  const companyName = document.querySelector('#editForm #companyName').value;
  const companyAddress = document.querySelector('#editForm #companyAddress').value;
  const companyStatus = document.querySelector('#editForm #companyStatus').value;
  const companyType = document.querySelector('#editForm #companyType').value;
  const registrationNumber = document.querySelector('#editForm #registrationNumber').value;
  const certificateNumber = document.querySelector('#editForm #certificateNumber').value;
  const cargo = document.querySelector('#editForm #cargo').value;
  const exportCountry = document.querySelector('#editForm #exportCountry').value;
  const originCountry = document.querySelector('#editForm #originCountry').value;
  const processDate = document.querySelector('#editForm #processDate').value;
  const receiptNumber = document.querySelector('#editForm #receiptNumber').value;
  const receiptDate = document.querySelector('#editForm #receiptDate').value;
  const paymentAmount = document.querySelector('#editForm #paymentAmount').value;

  // Retrieve the new fields
  const quantity = document.querySelector('#editForm #quantity').value;
  const quantityUnit = document.querySelector('#editForm #quantity_unit').value;
  const costAmount = document.querySelector('#editForm #cost_amount').value;
  const costCurrency = document.querySelector('#editForm #cost_currency').value;

  // Prepare the data to be sent to the backend
  const data = {
    office: companyStatus === 'غير مقيد' ? null : office,
    registrationNumber: companyStatus === 'غير مقيد' ? null : registrationNumber,
    certificateNumber: certificateNumber,
    companyName: companyName,
    companyAddress: companyAddress,
    companyStatus: companyStatus,
    companyType: companyType,
    cargo: cargo,
    exportCountry: exportCountry,
    originCountry: originCountry,
    processDate: processDate,
    receiptNumber: receiptNumber,
    receiptDate: receiptDate,
    paymentAmount: paymentAmount,
    quantity: quantity,
    quantity_unit: quantityUnit,
    cost: costAmount,
    cost_currency: costCurrency,
  };

  if (!certificateId) {
    alert("لا يوجد شهادة محددة للتعديل!");
    return;
  }

  const url = `/update-certificate/${certificateId}/`;
  const method = 'PUT';

  fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken'),
    },
    body: JSON.stringify(data),
  })
    .then(response => response.json())
    .then(respData => {
      if (respData.status === 'success') {
        alert('تم تعديل البيانات بنجاح!');
        closeEditModal();
        searchCertificates(); // Refresh the table
      } else {
        alert('خطأ: ' + respData.message);
      }
    })
    .catch(error => console.error('Error:', error));
}