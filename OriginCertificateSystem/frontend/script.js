// Sample data for dropdowns
let cargoList = [""];
let exportCountryList = [""];
let originCountryList = ["مصر"];

function toggleSidebar() {
    var sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("active");
}

// Populate dropdowns on page load
window.onload = function () {
  populateDropdown("cargo", cargoList);
  populateDropdown("exportCountry", exportCountryList);
  populateDropdown("originCountry", originCountryList);
};

// Function to populate a dropdown
function populateDropdowns() {
    // Add default placeholder options
    const cargoDropdown = document.getElementById('cargo');
    const exportCountryDropdown = document.getElementById('exportCountry');
    const originCountryDropdown = document.getElementById('originCountry');
  
    // Clear existing options
    cargoDropdown.innerHTML = '';
    exportCountryDropdown.innerHTML = '';
    originCountryDropdown.innerHTML = '';
  
    // Add default options
    addDefaultOption(cargoDropdown, 'اختر البضاعة');
    addDefaultOption(exportCountryDropdown, 'اختر بلد التصدير');
    addDefaultOption(originCountryDropdown, 'اختر بلد المنشأ');
  
    // Fetch and populate dynamic items
    fetchItems('cargo', cargoDropdown);
    fetchItems('exportCountry', exportCountryDropdown);
    fetchItems('originCountry', originCountryDropdown);
  }
  
  function addDefaultOption(dropdown, placeholderText) {
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.text = placeholderText;
    defaultOption.disabled = true;
    defaultOption.selected = true;
    dropdown.add(defaultOption);
  }
  
  function fetchItems(listType, dropdown) {
    fetch(`/get-items/?listType=${listType}`)
      .then(response => response.json())
      .then(items => {
        items.forEach(item => {
          const option = document.createElement('option');
          option.value = item;
          option.text = item;
          dropdown.add(option);
        });
      })
      .catch(error => console.error('Error:', error));
  }
  
// Call this function when the page loads
window.onload = function () {
  populateDropdowns();
};

// Modal functionality
let currentDropdown;

function openModal(dropdown) {
  currentDropdown = dropdown;
  document.getElementById("modal").style.display = "block";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

function addItem() {
  const newItem = document.getElementById('newItem').value.trim(); // Trim whitespace
  const listType = currentDropdown; // 'cargo', 'exportCountry', or 'originCountry'

  if (newItem) {
      // Check if the item already exists in the dropdown
      const dropdown = document.getElementById(currentDropdown);
      const options = Array.from(dropdown.options).map(option => option.value);

      if (options.includes(newItem)) {
          alert('هذا العنصر موجود بالفعل!'); // Alert if the item already exists
          return; // Stop further execution
      }

      // If the item doesn't exist, send it to the backend
      fetch('/add-item/', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCookie('csrftoken')  // Include CSRF token
          },
          body: JSON.stringify({
              listType: listType,
              item: newItem
          })
      })
      .then(response => response.json())
      .then(data => {
          if (data.status === 'success') {
              // Add the new item to the current dropdown
              const dropdown = document.getElementById(currentDropdown);
              const option = document.createElement('option');
              option.value = newItem;
              option.text = newItem;
              dropdown.add(option);

              // If the item is added to exportCountry, also add it to originCountry (and vice versa)
              if (listType === 'exportCountry' || listType === 'originCountry') {
                  const otherDropdownId = listType === 'exportCountry' ? 'originCountry' : 'exportCountry';
                  const otherDropdown = document.getElementById(otherDropdownId);

                  // Check if the item already exists in the other dropdown
                  const otherOptions = Array.from(otherDropdown.options).map(option => option.value);
                  if (!otherOptions.includes(newItem)) {
                      const otherOption = document.createElement('option');
                      otherOption.value = newItem;
                      otherOption.text = newItem;
                      otherDropdown.add(otherOption);
                  }
              }

              // Reset the modal input field
              document.getElementById('newItem').value = ''; // Clear the input field
              document.getElementById('newItem').placeholder = 'ادخل العنصر الجديد'; // Reset placeholder

              // Close the modal
              closeModal();
          } else {
              alert(data.message); // Show backend error message
          }
      })
      .catch(error => console.error('Error:', error));
  }
}

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

// Search functionality (mock implementation)document.getElementById('registrationNumber').addEventListener('keypress', function (e) {
  document.getElementById('registrationNumber').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        const office = document.getElementById('office').value;
        const registrationNumber = document.getElementById('registrationNumber').value;

        fetch(`/search-certificates/?officeName=${office}&registrationNumber=${registrationNumber}`)
            .then(response => response.json())
            .then(data => {
                const tbody = document.querySelector("#resultsTable tbody");
                tbody.innerHTML = data.map(item => `
                    <tr>
                        <td>${item.officeName}</td>
                        <td>${item.branchName}</td>
                        <td>${item.registrationNumber}</td>
                        <td>${item.companyName}</td>
                        <td>${item.companyAddress}</td>
                        <td>${item.companyStatus}</td>
                        <td>${item.companyType}</td>
                        <td>${item.cargo}</td>
                        <td>${item.originCountry}</td>
                        <td>${item.exportCountry}</td>
                        <td>${item.issueDate}</td>
                        <td>${item.receiptNumber}</td>
                        <td>${item.receiptDate}</td>
                        <td>${item.paymentAmount}</td>
                    </tr>
                `).join("");

                // Auto-populate company data if only one result
                if (data.length === 1) {
                    const company = data[0];
                    document.getElementById('companyName').value = company.companyName;
                    document.getElementById('companyAddress').value = company.companyAddress;
                    document.getElementById('companyType').value = company.companyType;
                    document.getElementById('companyStatus').value = company.companyStatus;
                }
            })
            .catch(error => console.error("Error:", error));
    }
});

// Save functionality
document.getElementById('saveButton').addEventListener('click', function() {
  const office = document.getElementById('office').value;
  const registrationNumber = document.getElementById('registrationNumber').value;
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
 

  const data = {
      office: office,
      registrationNumber: registrationNumber,
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
      paymentAmount: paymentAmount
  };

  fetch('/save-certificate/', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken')  // Ensure you handle CSRF token
      },
      body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(data => {
      if (data.status === 'success') {
          alert('Data saved successfully!');
          // Optionally, you can clear the form or update the table here
      } else {
          alert('Error saving data: ' + data.message);
      }
  })
  .catch(error => console.error('Error:', error));

  // Create a new table element
  const table = document.createElement('table');
  table.setAttribute('border', '1');  // Add a border for visibility

  // Create the table header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  // Define the column headers
  const headers = [
      'اسم المكتب', 'اسم الفرع', 'اسم الشركة', 'عنوان الشركة', 'نوع الشركة', 'حالة الشركة',
      'رقم السجل', 'رقم الشهادة', 'بلد التصدير', 'بلد المنشأ', 'البضاعة', 'تاريخ الإصدار', 'التعديل', 'الحذف'
  ];

  // Add headers to the table
  headers.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create the table body
  const tbody = document.createElement('tbody');
  const dataRow = document.createElement('tr');

  // Get form data
  const formData = {
      office: document.getElementById('office').value,
      branch: 'فرع افتراضي',  // Replace with actual branch data if available
      companyName: document.getElementById('companyName').value,
      companyAddress: document.getElementById('companyAddress').value,
      companyType: document.getElementById('companyType').value,
      companyStatus: document.getElementById('companyStatus').value,
      registrationNumber: document.getElementById('registrationNumber').value,
      certificateNumber: '12345',  // Replace with actual certificate number if available
      exportCountry: document.getElementById('exportCountry').value,
      originCountry: document.getElementById('originCountry').value,
      cargo: document.getElementById('cargo').value,
      issueDate: document.getElementById('processDate').value,
  };

  // Add form data to the table row
  Object.values(formData).forEach(value => {
      const td = document.createElement('td');
      td.textContent = value;
      dataRow.appendChild(td);
  });
  document.getElementById('office').value = "";
  document.getElementById('companyName').value = "";
  document.getElementById('companyAddress').value = "";
  document.getElementById('companyType').value = "";
  document.getElementById('companyStatus').value = "";
  document.getElementById('registrationNumber').value = "";
  document.getElementById('cargo').value = "";
  document.getElementById('office').value = "";
  document.getElementById('companyName').value = "";
  document.getElementById('companyAddress').value = "";
  document.getElementById('companyType').value = "";
  document.getElementById('companyStatus').value = "";
  document.getElementById('registrationNumber').value = "";
  document.getElementById('cargo').value = "";
  document.getElementById('exportCountry').value = "";
  document.getElementById('originCountry').value = "";
  document.getElementById('processDate').value = "";
  document.getElementById('office').value = "";
  document.getElementById('companyName').value = "";
  document.getElementById('companyAddress').value = "";
  document.getElementById('companyType').value = "";
  document.getElementById('companyStatus').value = "";
  document.getElementById('registrationNumber').value = "";
  document.getElementById('cargo').value = "";
  document.getElementById('receiptNumber').value = "";
  document.getElementById('receiptDate').value = "";
  document.getElementById('paymentAmount').value = "";
  // Create the Edit button
  const editButton = document.createElement('button');
  editButton.textContent = 'تعديل';
  editButton.addEventListener('click', function() {
      // Populate form fields with the current row's data
      document.getElementById('office').value = formData.office;
      document.getElementById('companyName').value = formData.companyName;
      document.getElementById('companyAddress').value = formData.companyAddress;
      document.getElementById('companyType').value = formData.companyType;
      document.getElementById('companyStatus').value = formData.companyStatus;
      document.getElementById('registrationNumber').value = formData.registrationNumber;
      document.getElementById('cargo').value = formData.cargo;
      document.getElementById('exportCountry').value = formData.exportCountry;
      document.getElementById('originCountry').value = formData.originCountry;
      document.getElementById('processDate').value = formData.issueDate;
  });

  // Create the Delete button
  const deleteButton = document.createElement('button');
  deleteButton.textContent = 'حذف';
  deleteButton.addEventListener('click', function() {
      // Remove the row from the table

      table.deleteRow(dataRow.rowIndex);
      // Optionally, send a request to the server to delete the data from the database
      fetch(`/delete-certificate/${certificateId}/`, {
        method: 'DELETE',
        headers: {
          'accept': 'application/json'
      },
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            row.remove(); // Remove row from table on successful deletion
        } else {
            alert('خطأ في الحذف: ' + data.message);
        }
    })
    .catch(error => console.error('Error:', error));

  });

  // Add the buttons to the row
  const editCell = document.createElement('td');
  editCell.appendChild(editButton);
  dataRow.appendChild(editCell);

  const deleteCell = document.createElement('td');
  deleteCell.appendChild(deleteButton);
  dataRow.appendChild(deleteCell);

  tbody.appendChild(dataRow);
  table.appendChild(tbody);

  // Append the table to the container
  const container = document.getElementById('newTableContainer');
  container.innerHTML = '';  // Clear any existing content
  container.appendChild(table);

  // Optionally, add a message or style to indicate the table was created
  console.log('New table created and populated with form data!');
});


// document.getElementById('saveButton').addEventListener('click', function () {
//   // Create a new table element
//   const table = document.createElement('table');
//   table.setAttribute('border', '1');  // Add a border for visibility

//   // Create the table header
//   const thead = document.createElement('thead');
//   const headerRow = document.createElement('tr');

//   // Define the column headers
//   const headers = [
//       'اسم المكتب', 'اسم الفرع', 'اسم الشركة', 'عنوان الشركة', 'نوع الشركة', 'حالة الشركة',
//       'رقم السجل', 'رقم الشهادة', 'بلد التصدير', 'بلد المنشأ', 'البضاعة', 'تاريخ الإصدار', 'التعديل', 'الحذف'
//   ];

//   // Add headers to the table
//   headers.forEach(headerText => {
//       const th = document.createElement('th');
//       th.textContent = headerText;
//       headerRow.appendChild(th);
//   });

//   thead.appendChild(headerRow);
//   table.appendChild(thead);

//   // Create the table body
//   const tbody = document.createElement('tbody');
//   const dataRow = document.createElement('tr');

//   // Get form data
//   const formData = {
//       office: document.getElementById('office').value,
//       branch: 'فرع افتراضي',  // Replace with actual branch data if available
//       companyName: document.getElementById('companyName').value,
//       companyAddress: document.getElementById('companyAddress').value,
//       companyType: document.getElementById('companyType').value,
//       companyStatus: document.getElementById('companyStatus').value,
//       registrationNumber: document.getElementById('registrationNumber').value,
//       certificateNumber: '12345',  // Replace with actual certificate number if available
//       exportCountry: document.getElementById('exportCountry').value,
//       originCountry: document.getElementById('originCountry').value,
//       cargo: document.getElementById('cargo').value,
//       issueDate: document.getElementById('processDate').value,
//   };

//   // Add form data to the table row
//   Object.values(formData).forEach(value => {
//       const td = document.createElement('td');
//       td.textContent = value;
//       dataRow.appendChild(td);
//   });

//   // Create the Edit button
//   const editButton = document.createElement('button');
//   editButton.textContent = 'تعديل';
//   editButton.addEventListener('click', function() {
//       // Populate form fields with the current row's data
//       document.getElementById('office').value = formData.office;
//       document.getElementById('companyName').value = formData.companyName;
//       document.getElementById('companyAddress').value = formData.companyAddress;
//       document.getElementById('companyType').value = formData.companyType;
//       document.getElementById('companyStatus').value = formData.companyStatus;
//       document.getElementById('registrationNumber').value = formData.registrationNumber;
//       document.getElementById('cargo').value = formData.cargo;
//       document.getElementById('exportCountry').value = formData.exportCountry;
//       document.getElementById('originCountry').value = formData.originCountry;
//       document.getElementById('processDate').value = formData.issueDate;
//   });

//   // Create the Delete button
//   const deleteButton = document.createElement('button');
//   deleteButton.textContent = 'حذف';
//   deleteButton.addEventListener('click', function() {
//       // Remove the row from the table
//       table.deleteRow(dataRow.rowIndex);
//       // Optionally, send a request to the server to delete the data from the database
//   });

//   // Add the buttons to the row
//   const editCell = document.createElement('td');
//   editCell.appendChild(editButton);
//   dataRow.appendChild(editCell);

//   const deleteCell = document.createElement('td');
//   deleteCell.appendChild(deleteButton);
//   dataRow.appendChild(deleteCell);

//   tbody.appendChild(dataRow);
//   table.appendChild(tbody);

//   // Append the table to the container
//   const container = document.getElementById('newTableContainer');
//   container.innerHTML = '';  // Clear any existing content
//   container.appendChild(table);

//   // Optionally, add a message or style to indicate the table was created
//   console.log('New table created and populated with form data!');
// });

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



function searchCertificates() {
  const office = document.getElementById('office').value;
  const registrationNumber = document.getElementById('registrationNumber').value;

  console.log('Office:', office);
  console.log('Registration Number:', registrationNumber);

  fetch(`/filter_certificates/?office=${office}&registrationNumber=${registrationNumber}`)
    .then(response => response.json())
    .then(data => {
      console.log('Response Data:', data);  // Log the response data
      const tableBody = document.querySelector('#resultsTable tbody');
      tableBody.innerHTML = ''; // Clear existing rows

      if (data.certificates.length > 0) {
        data.certificates.forEach(cert => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${cert.office_name}</td>
            <td>${cert.branch_name}</td>
            <td>${cert.registration_number}</td>
            <td>${cert.company_name}</td>
            <td>${cert.company_address}</td>
            <td>${cert.company_status}</td>
            <td>${cert.company_type}</td>
            <td>${cert.exported_goods}</td>
            <td>${cert.origin_country}</td>
            <td>${cert.export_country}</td>
            <td>${cert.issue_date}</td>
            <td>${cert.receipt_number}</td>
            <td>${cert.receipt_date}</td>
            <td>${cert.payment_amount}</td>
          `;
          tableBody.appendChild(row);
        });
      } else {
        tableBody.innerHTML = '<tr><td colspan="14">لا توجد نتائج</td></tr>';
      }
    })
    .catch(error => {
      console.error('Error fetching data:', error);
    });
}