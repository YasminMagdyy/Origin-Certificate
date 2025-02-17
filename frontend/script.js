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
            // Set default option for cargo
            const defaultOption = document.createElement('option');
            defaultOption.value = "";
            defaultOption.text = "اختر البضاعه";
            defaultOption.selected = true;
            selectElement.appendChild(defaultOption);
          } else if (item_type === 'exportCountry') {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.text = 'اختر دوله التصدير';
            selectElement.appendChild(defaultOption);
          } else if (item_type === 'originCountry') {
            // For originCountry, add default "مصر"
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
// Save or update certificate when the saveButton is clicked
document.getElementById('saveButton').addEventListener('click', function() {
  // Determine mode; default is "save"
  mode = mode || "save";
  const office = document.getElementById('office').value;
  const registrationNumber = document.getElementById('registrationNumber').value;
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

  // Prepare the data to be sent to the backend
  const data = {
      office: office,
      registrationNumber: registrationNumber,
      certificateNumber: certificateNumber,
      companyName: companyName,
      companyAddress: companyAddress,
      companyStatus: companyStatus,
      companyType: companyType,
      cargo: cargo,           // Expected to be the cargo id or value
      exportCountry: exportCountry, // Expected to be the country id or value
      originCountry: originCountry, // Expected to be the country id or value
      processDate: processDate,
      receiptNumber: receiptNumber,
      receiptDate: receiptDate,
      paymentAmount: paymentAmount
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
          'X-CSRFToken': getCookie('csrftoken')  // Not needed if CSRF is exempt
      },
      body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(respData => {
      if (respData.status === 'success') {
        certificateId = respData.certificateId;
        alert('Data saved successfully!');
        document.getElementById('saveButton').innerHTML = "حفظ";
        
        // Create/update the certificate table with form data
        createCertificateTable({
          office: office,
          branch: 'فرع افتراضي', // Adjust if you have branch data
          companyName: companyName,
          companyAddress: companyAddress,
          companyType: companyType,
          companyStatus: companyStatus,
          registrationNumber: registrationNumber,
          certificateNumber: certificateNumber,
          exportCountry: exportCountry,
          originCountry: originCountry,
          cargo: cargo,
          issueDate: processDate,
          receiptNumber: receiptNumber,
          receiptDate: receiptDate,
          paymentAmount: paymentAmount
        });
        
        // Reset mode to "save" after updating
        mode = "save";
      } else {
          alert('Error saving data: ' + respData.message);
      }
  })
  .catch(error => console.error('Error:', error));
});

// Create and display the certificate table
function createCertificateTable(formData) {
  // Create a new table element
  const table = document.createElement('table');
  table.setAttribute('border', '1');

  // Create the table header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  const headers = [
      'اسم المكتب', 'اسم الفرع', 'اسم الشركة', 'عنوان الشركة', 'نوع الشركة', 'حالة الشركة',
      'رقم السجل', 'رقم الشهادة', 'بلد التصدير', 'بلد المنشأ', 'البضاعة', 'تاريخ العملية',
      'رقم الايصال', 'تاريخ الايصال', 'القيمة المدفوعة', 'التعديل', 'الحذف'
  ];

  headers.forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create the table body with a single row (for demonstration)
  const tbody = document.createElement('tbody');
  const dataRow = document.createElement('tr');

  Object.values(formData).forEach(value => {
      const td = document.createElement('td');
      td.textContent = value;
      dataRow.appendChild(td);
  });

  // Create Edit button
  const editCell = document.createElement('td');
  const editButton = document.createElement('button');
  editButton.textContent = 'تعديل';
  editButton.addEventListener('click', function() {
      // Populate form fields with current data
      document.getElementById('office').value = formData.office;
      document.getElementById('companyName').value = formData.companyName;
      document.getElementById('companyAddress').value = formData.companyAddress;
      document.getElementById('companyType').value = formData.companyType;
      document.getElementById('companyStatus').value = formData.companyStatus;
      document.getElementById('registrationNumber').value = formData.registrationNumber;
      document.getElementById('certificateNumber').value = formData.certificateNumber;
      document.getElementById('cargo').value = formData.cargo;
      document.getElementById('exportCountry').value = formData.exportCountry;
      document.getElementById('originCountry').value = formData.originCountry;
      document.getElementById('processDate').value = formData.issueDate;
      document.getElementById('receiptNumber').value = formData.receiptNumber;
      document.getElementById('receiptDate').value = formData.receiptDate;
      document.getElementById('paymentAmount').value = formData.paymentAmount;
      mode = "update";
      document.getElementById('saveButton').innerHTML = "تعديل";
  });
  editCell.appendChild(editButton);
  dataRow.appendChild(editCell);

  // Create Delete button (function deleteCertificate must be implemented)
  const deleteCell = document.createElement('td');
  const deleteButton = document.createElement('button');
  deleteButton.textContent = 'حذف';
  deleteButton.addEventListener('click', function() {
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
            <td>${cert.branch_name}</td>
            <td>${cert.registration_number}</td>
            <td>${cert.certificate_number}</td>
            <td>${cert.company_name}</td>
            <td>${cert.company_address}</td>
            <td>${cert.company_status}</td>
            <td>${cert.company_type}</td>
            <td>${cert.exported_goods}</td>
            <td>${cert.origin_country}</td>
            <td>${cert.export_country}</td>
            <td>${cert.issue_date}</td>
            <td>${cert.receipt_number}</td>
            <td>${cert.receipt_date || ''}</td>
            <td>${cert.payment_amount || ''}</td>
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

function deleteCertificate(certId) {
  if (confirm("هل أنت متأكد من حذف الشهادة؟")) {
    fetch(`/delete-certificate/${certId}/`, {
      method: 'DELETE',
      headers: {
        'X-CSRFToken': getCookie('csrftoken')
      }
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
function openEditModal(rowData) {
  document.getElementById('certificateId').value = rowData.id;
  document.querySelector('#editForm #office').value = rowData.office_name;
  document.querySelector('#editForm #companyName').value = rowData.company_name;
  document.querySelector('#editForm #companyAddress').value = rowData.
  company_address;
  document.querySelector('#editForm #companyType').value = rowData.company_type;
  document.querySelector('#editForm #companyStatus').value = rowData.company_status;
  document.querySelector('#editForm #registrationNumber').value = rowData.registration_number;
  document.querySelector('#editForm #certificateNumber').value = rowData.certificate_number;
  document.querySelector('#editForm #cargo').value = rowData.exported_goods;
  document.querySelector('#editForm #exportCountry').value = rowData.export_country;
  document.querySelector('#editForm #originCountry').value = rowData.origin_country;
  document.querySelector('#editForm #processDate').value = rowData.issue_date;
  document.querySelector('#editForm #receiptNumber').value = rowData.receipt_number;
  document.querySelector('#editForm #receiptDate').value = rowData.receipt_date;
  document.querySelector('#editForm #paymentAmount').value = rowData.payment_amount;
  document.getElementById('editModal').style.display = "block";
 
}

function closeEditModal() {
  document.getElementById('editModal').style.display = "none";
}

function submitEditModal() {
 
  const certificateId = document.getElementById('certificateId').value;
  const office = document.querySelector('#editForm #office').value;
  const  companyName = document.querySelector('#editForm #companyName').value;
  const companyAddress = document.querySelector('#editForm #companyAddress').value;
  const companyType = document.querySelector('#editForm #companyType').value;
  const companyStatus = document.querySelector('#editForm #companyStatus').value;
  const registrationNumber = document.querySelector('#editForm #registrationNumber').value;
  const certificateNumber = document.querySelector('#editForm #certificateNumber').value;
  const cargo = document.querySelector('#editForm #cargo').value;
  const exportCountry = document.querySelector('#editForm #exportCountry').value;
  const originCountry = document.querySelector('#editForm #originCountry').value;
  const processDate = document.querySelector('#editForm #processDate').value;
  const receiptNumber = document.querySelector('#editForm #receiptNumber').value;
  const receiptDate = document.querySelector('#editForm #receiptDate').value;
  const paymentAmount = document.querySelector('#editForm #paymentAmount').value;

  // Prepare the data to be sent to the backend
  const data = {
      office: office,
      registrationNumber: registrationNumber,
      certificateNumber: certificateNumber,
      companyName: companyName,
      companyAddress: companyAddress,
      companyStatus: companyStatus,
      companyType: companyType,
      cargo: cargo,           // Expected to be the cargo id or value
      exportCountry: exportCountry, // Expected to be the country id or value
      originCountry: originCountry, // Expected to be the country id or value
      processDate: processDate,
      receiptNumber: receiptNumber,
      receiptDate: receiptDate,
      paymentAmount: paymentAmount
  };

if (!certificateId) {
    alert("لا يوجد شهادة محددة للتعديل!");
    return;
}

const url = `/update-certificate/${certificateId}/`;
const method = 'PUT';

// إرسال البيانات إلى السيرفر
fetch(url, {
    method: method,
    headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken') // إذا كنت بحاجة إلى CSRF Token
    },
    body: JSON.stringify(data) // تحويل البيانات إلى JSON
})
.then(response => response.json())
.then(respData => {
    if (respData.status === 'success') {
        alert('تم تعديل البيانات بنجاح!');
        closeEditModal(); // إغلاق المودال بعد الحفظ
    } else {
        alert('خطأ: ' + respData.message);
    }
})
.catch(error => console.error('Error:', error));
};
