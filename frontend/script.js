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

// Close the sidebar when clicking outside
document.addEventListener('click', function (e) {
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.querySelector('.menu-btn');
    if (sidebar.classList.contains('active') && !sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
        sidebar.classList.remove('active');
    }
});

// Global variable to store the current field
let currentField = '';

function openModal(field) {
    currentField = field;
    document.getElementById('modal').style.display = 'block';
    document.getElementById('newItem').value = '';
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
                if (item_type === 'cargo') {
                    $('.cargo').each(function() {
                        const $select = $(this);
                        const currentValue = $select.val();
                        $select.empty();
                        const defaultOption = new Option("اختر البضاعه", "", true, true);
                        defaultOption.disabled = true;
                        defaultOption.hidden = true;
                        $select.append(defaultOption);
                        data.items.forEach(item => {
                            const option = new Option(item.ExportedGoods, item.ExportedGoods);
                            $select.append(option);
                        });
                        if (currentValue) {
                            $select.val(currentValue);
                        }
                        $select.trigger('change');
                    });
                } else if (item_type === 'exportCountry' || item_type === 'originCountry') {
                    const selectElement = document.getElementById(item_type);
                    if (selectElement) {
                        if (item_type === 'originCountry') {
                            selectElement.innerHTML = '';
                            const egyptOption = new Option("مصر", "مصر", true, true);
                            selectElement.add(egyptOption);
                        } else {
                            selectElement.innerHTML = '';
                            const defaultOption = new Option("اختر بلد التصدير", "", true, true);
                            defaultOption.disabled = true;
                            defaultOption.hidden = true;
                            selectElement.add(defaultOption);
                        }
                        data.items.forEach(item => {
                            if (item_type === 'originCountry' && item.CountryName === "مصر") return;
                            const option = new Option(item.CountryName, item.CountryName);
                            selectElement.add(option);
                        });
                        $(selectElement).select2('destroy').select2({
                            placeholder: item_type === 'exportCountry' ? 'ابحث واختر بلد التصدير' : 'ابحث واختر بلد المنشأ',
                            allowClear: item_type !== 'originCountry',
                            language: {
                                noResults: function() { return "لا توجد نتائج"; },
                                searching: function() { return "جاري البحث..."; }
                            },
                            dir: 'rtl'
                        });
                        if (item_type === 'originCountry') {
                            $(selectElement).val("مصر").trigger('change');
                        }
                    }
                }
            }
        })
        .catch(error => {
            console.error('Error loading items:', error);
            if (item_type === 'originCountry') {
                $('#originCountry').val("مصر").trigger('change');
            }
        });
}

function initializeSelect2() {
    $('#exportCountry').select2({
        placeholder: 'ابحث واختر بلد التصدير',
        allowClear: true,
        language: {
            noResults: function() { return "لا توجد نتائج"; },
            searching: function() { return "جاري البحث..."; }
        },
        dir: 'rtl'
    });
    $('#originCountry').select2({
        placeholder: 'مصر',
        allowClear: false,
        language: {
            noResults: function() { return "لا توجد نتائج"; },
            searching: function() { return "جاري البحث..."; }
        },
        dir: 'rtl'
    });
    $('.cargo').select2({
        placeholder: 'ابحث واختر البضاعة',
        allowClear: true,
        language: {
            noResults: function() { return "لا توجد نتائج"; },
            searching: function() { return "جاري البحث..."; }
        },
        dir: 'rtl'
    });
}

function getSelectedCountries() {
    const exportCountry = $('#exportCountry').select2('data')[0]?.text || '';
    const originCountry = $('#originCountry').select2('data')[0]?.text || '';
    return { exportCountry, originCountry };
}

function showCenteredAlert(message, type) {
    const existingAlerts = document.querySelectorAll('.centered-alert');
    existingAlerts.forEach(alert => alert.remove());
    const alertDiv = document.createElement('div');
    alertDiv.className = `centered-alert ${type}`;
    alertDiv.innerHTML = `
        <div class="alert-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => {
        alertDiv.classList.add('fade-out');
        setTimeout(() => alertDiv.remove(), 500);
    }, 3000);
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

function applyAsterisksToRequiredFields(container = document) {
    container.querySelectorAll('input[required], select[required]').forEach(element => {
        const label = container.querySelector(`label[for="${element.id}"]`);
        if (label && !label.querySelector('.required-asterisk')) {
            const asterisk = document.createElement('span');
            asterisk.className = 'required-asterisk';
            asterisk.textContent = '*';
            label.appendChild(asterisk);
        }
    });
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

function handleAddShipment() {
    const template = document.getElementById('shipmentTemplate');
    if (!template) {
        console.error('Shipment template not found!');
        return;
    }
    const clone = template.content.cloneNode(true);
    const shipmentContainer = document.getElementById('shipmentContainer');
    if (!shipmentContainer) {
        console.error('shipmentContainer not found!');
        return;
    }
    shipmentContainer.appendChild(clone);
    const newCargoSelect = shipmentContainer.lastElementChild.querySelector('.cargo');
    if (newCargoSelect) {
        loadItemsForGroup(newCargoSelect).then(() => {
            $(newCargoSelect).select2({
                placeholder: 'ابحث واختر البضاعة',
                allowClear: true,
                language: {
                    noResults: function() { return "لا توجد نتائج"; },
                    searching: function() { return "جاري البحث..."; }
                },
                dir: 'rtl'
            });
        });
    }
    const removeBtn = shipmentContainer.lastElementChild.querySelector('.removeShipment');
    if (removeBtn) {
        removeBtn.addEventListener('click', function() {
            $(this).closest('.shipment-group').find('.cargo').select2('destroy');
            this.closest('.shipment-group').remove();
        });
    }
    applyAsterisksToRequiredFields(shipmentContainer);
}

function loadItemsForGroup(selectElement) {
    return fetch(`/get_items/?item_type=cargo`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const $select = $(selectElement);
                $select.empty();
                const defaultOption = new Option("اختر البضاعه", "", true, true);
                defaultOption.disabled = true;
                defaultOption.hidden = true;
                $select.append(defaultOption);
                data.items.forEach(item => {
                    const option = new Option(item.ExportedGoods, item.ExportedGoods);
                    $select.append(option);
                });
                $select.trigger('change');
            }
        })
        .catch(error => {
            console.error('Error loading cargo items:', error);
            $(selectElement).select2({
                placeholder: 'ابحث واختر البضاعة',
                allowClear: true,
                dir: 'rtl'
            });
        });
}

document.addEventListener('DOMContentLoaded', function() {
    initializeSelect2();
    loadItems('cargo');
    loadItems('exportCountry');
    loadItems('originCountry');
    $('#originCountry').val('مصر').trigger('change');
    
    // Add one initial shipment group on page load
    const shipmentContainer = document.getElementById('shipmentContainer');
    if (shipmentContainer) {
        // Clear any existing content first (just in case)
        shipmentContainer.innerHTML = '';
        
        // Create and add the initial shipment
        handleAddShipment();
    } else {
        console.error('shipmentContainer not found!');
    }    
    const addShipmentButton = document.getElementById('addShipmentGroup');
    if (addShipmentButton) {
        addShipmentButton.removeEventListener('click', handleAddShipment);
        addShipmentButton.addEventListener('click', handleAddShipment);
    }

    const companyStatus = document.getElementById('companyStatus');
    const officeField = document.getElementById('office');
    const registrationNumberField = document.getElementById('registrationNumber');
    if (companyStatus && officeField && registrationNumberField) {
        companyStatus.addEventListener('change', function() {
            if (this.value === 'غير مقيد') {
                officeField.disabled = true;
                registrationNumberField.disabled = true;
            } else {
                officeField.disabled = false;
                registrationNumberField.disabled = false;
            }
        });
    }

    applyAsterisksToRequiredFields(document);
});

document.getElementById('registrationNumber').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        const office = document.getElementById('office').value;
        const registrationNumber = document.getElementById('registrationNumber').value;
        if (!office || !registrationNumber) {
            alert('يرجى اختيار اسم المكتب وإدخال رقم السجل.');
            return;
        }
        fetch(`/get-company-data/?office=${office}&registrationNumber=${registrationNumber}`)
            .then(response => response.json())
            .then(data => {
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

document.getElementById('saveButton').addEventListener('click', function () {
    const rightForm = document.getElementById('rightForm');
    const leftForm = document.getElementById('leftForm');
    if (!rightForm.checkValidity() || !leftForm.checkValidity()) {
        rightForm.reportValidity();
        leftForm.reportValidity();
        return;
    }
    const saveButton = document.getElementById('saveButton');
    const originalButtonText = saveButton.innerHTML;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
    saveButton.disabled = true;
    const { exportCountry, originCountry } = getSelectedCountries();
    if (!exportCountry) {
        alert('يرجى اختيار بلد التصدير');
        saveButton.innerHTML = originalButtonText;
        saveButton.disabled = false;
        return;
    }
    if (!originCountry) {
        alert('يرجى اختيار بلد المنشأ');
        saveButton.innerHTML = originalButtonText;
        saveButton.disabled = false;
        return;
    }
    window.mode = "save";
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
        if (cargoVal && (quantityVal > 0 || costVal > 0)) {
            shipments.push({ 
                cargo: cargoVal, 
                quantity: quantityVal, 
                cost_amount: costVal 
            });
        }
    });
    if (shipments.length === 0) {
        showCenteredAlert('يرجى إضافة شحنة واحدة على الأقل تحتوي على بضاعة وكمية أو تكلفة صالحة.', 'error');
        saveButton.innerHTML = originalButtonText;
        saveButton.disabled = false;
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
    .then(async response => {
        const responseData = await response.json().catch(() => ({}));
        if (!response.ok) {
            if (responseData.message && responseData.message.includes('يوجد بالفعل شهادة')) {
                return Promise.reject({ 
                    type: 'DUPLICATE_CERTIFICATE',
                    message: responseData.message
                });
            }
            return Promise.reject({
                type: 'SERVER_ERROR',
                message: responseData.message || 'حدث خطأ في الخادم',
                status: response.status
            });
        }
        return responseData;
    })
.then(respData => {
    if (respData.status === 'success') {
        showCenteredAlert('تم الحفظ بنجاح!', 'success');
        const certificateId = respData.certificateId;
        const formData = {
            id: certificateId,
            office: office,
            branchName: respData.branchName || branchName,
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
            shipments: Array.isArray(respData.shipments) ? respData.shipments : shipments,
            quantity: typeof respData.total_quantity === 'number' ? respData.total_quantity : 
                     shipments.reduce((sum, s) => sum + s.quantity, 0),
            cost: typeof respData.total_cost === 'number' ? respData.total_cost : 
                  shipments.reduce((sum, s) => sum + s.cost_amount, 0),
            quantity_unit: respData.quantity_unit || quantityUnit,
            currency: respData.currency || costCurrency
        };
        createCertificateTable(formData);

        // Reset form fields
        document.getElementById('office').value = '';
        document.getElementById('registrationNumber').value = '';
        document.getElementById('certificateNumber').value = '';
        document.getElementById('companyName').value = '';
        document.getElementById('companyAddress').value = '';
        document.getElementById('companyStatus').value = 'مقيد';
        document.getElementById('companyType').value = '';
        document.getElementById('importCompanyName').value = '';
        document.getElementById('importCompanyAddress').value = '';
        document.getElementById('importCompanyPhone').value = '';
        document.getElementById('processDate').value = '';
        document.getElementById('receiptNumber').value = '';
        document.getElementById('receiptDate').value = '';
        document.getElementById('paymentAmount').value = '';
        document.getElementById('quantity_unit').value = '';
        document.getElementById('cost_currency').value = '';

        // Reset branchName for superusers
        const branchNameSelect = document.getElementById('branchName');
        if (branchNameSelect) {
            branchNameSelect.value = ''; // Reset branchName
        }

        // Reset Select2 fields
        $('#exportCountry').val(null).trigger('change'); // Clear exportCountry
        $('#originCountry').val('مصر').trigger('change'); // Reset originCountry to default (Egypt)

        // Clear all shipments and add one empty shipment group
        const shipmentContainer = document.getElementById('shipmentContainer');
        if (shipmentContainer) {
            shipmentContainer.innerHTML = ''; // Clear existing shipments
            handleAddShipment(); // Add one empty shipment group
        } else {
            console.error('shipmentContainer not found!');
        }
    } else {
        throw {
            type: 'VALIDATION_ERROR',
            message: respData.message || 'حدث خطأ أثناء الحفظ'
        };
    }
})
    .catch(error => {
        console.error('Error:', error);
        let errorMessage = 'حدث خطأ غير متوقع';
        if (error.type === 'DUPLICATE_CERTIFICATE') {
            errorMessage = error.message;
            document.getElementById('branchName').classList.add('error-field');
            document.getElementById('office').classList.add('error-field');
            document.getElementById('registrationNumber').classList.add('error-field');
            document.getElementById('certificateNumber').classList.add('error-field');
            setTimeout(() => {
                document.getElementById('branchName').classList.remove('error-field');
                document.getElementById('office').classList.remove('error-field');
                document.getElementById('registrationNumber').classList.remove('error-field');
                document.getElementById('certificateNumber').classList.remove('error-field');
            }, 3000);
        } else if (error.status === 403) {
            errorMessage = 'ليس لديك الصلاحية لحفظ الشهادة. يرجى التواصل مع المسؤول.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        showCenteredAlert(errorMessage, 'error');
    })
    .finally(() => {
        saveButton.innerHTML = originalButtonText;
        saveButton.disabled = false;
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
        'القيمة', 'التكلفة', 'رقم الايصال', 'تاريخ الايصال', 'القيمة المدفوعة', 
        // 'التعديل', 'الحذف'
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
        formData.branchName || '-',
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

function searchCertificates() {
    const office = document.getElementById('filterOffice').value;
    const registrationNumber = document.getElementById('filterRegistrationNumber').value;
    const url = `/filter_certificates/?office=${encodeURIComponent(office)}&registrationNumber=${encodeURIComponent(registrationNumber)}`;
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const tableBody = document.querySelector('#resultsTable tbody');
            tableBody.innerHTML = '';
            if (data.certificates && data.certificates.length > 0) {
                data.certificates.forEach(cert => {
                    console.log("Certificate data:", cert); // Add this line to log the cert object
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
                    if (window.isBranchAdmin) {
                        row.innerHTML += `
                            <td><button onclick='openEditModal(${JSON.stringify(cert)})'>تعديل</button></td>
                            <td><button onclick="deleteCertificate(${cert.id})">حذف</button></td>
                        `;
                    }
                    tableBody.appendChild(row);
                });
            } else {
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

function openEditModal(rowData) {
    console.log("Opening edit modal with data:", rowData);
    
    // Populate basic form fields
    document.getElementById('editCertificateId').value = rowData.id;
    document.querySelector('#editForm #office').value = rowData.office_name || '';
    document.querySelector('#editForm #companyName').value = rowData.company_name || '';
    document.querySelector('#editForm #companyAddress').value = rowData.company_address || '';
    document.querySelector('#editForm #companyStatus').value = rowData.company_status || '';
    document.querySelector('#editForm #companyType').value = rowData.company_type || '';
    document.querySelector('#editForm #registrationNumber').value = rowData.registration_number || '';
    document.querySelector('#editForm #certificateNumber').value = rowData.certificate_number || '';
    document.querySelector('#editForm #processDate').value = rowData.issue_date || '';
    document.querySelector('#editForm #receiptNumber').value = rowData.receipt_number || '';
    document.querySelector('#editForm #receiptDate').value = rowData.receipt_date || '';
    document.querySelector('#editForm #paymentAmount').value = rowData.payment_amount || '';
    const branchNameSelect = document.querySelector('#editForm #branchName');
    branchNameSelect.value = rowData.branch_name || '';
    document.querySelector('#editForm #importCompanyName').value = rowData.import_company_name || '';
    document.querySelector('#editForm #importCompanyAddress').value = rowData.import_company_address || '';
    document.querySelector('#editForm #importCompanyPhone').value = rowData.import_company_phone || '';
    document.querySelector('#editForm #quantity_unit').value = rowData.shipments && rowData.shipments.length > 0 ? rowData.shipments[0].quantity_unit : 'كجم';
    document.querySelector('#editForm #cost_currency').value = rowData.shipments && rowData.shipments.length > 0 ? rowData.shipments[0].cost_currency : 'USD';

    // Enable/disable fields based on company status
    if (rowData.company_status === 'غير مقيد') {
        document.querySelector('#editForm #office').disabled = true;
        document.querySelector('#editForm #registrationNumber').disabled = true;
    } else {
        document.querySelector('#editForm #office').disabled = false;
        document.querySelector('#editForm #registrationNumber').disabled = false;
    }

    // Initialize Select2 for exportCountry and originCountry
    const exportCountrySelect = document.querySelector('#editForm #exportCountry');
    const originCountrySelect = document.querySelector('#editForm #originCountry');

    // Destroy existing Select2 instances
    $(exportCountrySelect).select2('destroy');
    $(originCountrySelect).select2('destroy');

    // Fetch options for exportCountry and originCountry
    const exportCountryPromise = fetch(`/get_items/?item_type=exportCountry`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                exportCountrySelect.innerHTML = '';
                const defaultOption = new Option("اختر بلد التصدير", "", true, true);
                defaultOption.disabled = true;
                defaultOption.hidden = true;
                exportCountrySelect.add(defaultOption);
                data.items.forEach(item => {
                    const option = new Option(item.CountryName, item.CountryName);
                    exportCountrySelect.add(option);
                });
                $(exportCountrySelect).select2({
                    placeholder: 'ابحث واختر بلد التصدير',
                    allowClear: true,
                    language: {
                        noResults: function() { return "لا توجد نتائج"; },
                        searching: function() { return "جاري البحث..."; }
                    },
                    dir: 'rtl'
                });
                if (rowData.export_country) {
                    $(exportCountrySelect).val(rowData.export_country).trigger('change');
                }
            }
        })
        .catch(error => {
            console.error('Error loading exportCountry items:', error);
            $(exportCountrySelect).select2({
                placeholder: 'ابحث واختر بلد التصدير',
                allowClear: true,
                dir: 'rtl'
            });
        });

    const originCountryPromise = fetch(`/get_items/?item_type=originCountry`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                originCountrySelect.innerHTML = '';
                const egyptOption = new Option("مصر", "مصر", true, true);
                originCountrySelect.add(egyptOption);
                data.items.forEach(item => {
                    if (item.CountryName === "مصر") return;
                    const option = new Option(item.CountryName, item.CountryName);
                    originCountrySelect.add(option);
                });
                $(originCountrySelect).select2({
                    placeholder: 'ابحث واختر بلد المنشأ',
                    allowClear: false,
                    language: {
                        noResults: function() { return "لا توجد نتائج"; },
                        searching: function() { return "جاري البحث..."; }
                    },
                    dir: 'rtl'
                });
                if (rowData.origin_country) {
                    $(originCountrySelect).val(rowData.origin_country).trigger('change');
                } else {
                    $(originCountrySelect).val("مصر").trigger('change');
                }
            }
        })
        .catch(error => {
            console.error('Error loading originCountry items:', error);
            $(originCountrySelect).val("مصر").trigger('change');
        });

    // Handle shipments
    const shipmentContainer = document.getElementById('shipmentContainer');
    if (!shipmentContainer) {
        console.error("shipmentContainer not found in the DOM");
        return;
    }
    shipmentContainer.innerHTML = ''; // Clear existing shipments

    const template = document.getElementById('shipmentTemplate');
    if (!template) {
        console.error("Shipment template not found!");
        return;
    }

    const shipmentPromises = [];
    if (rowData.shipments && Array.isArray(rowData.shipments) && rowData.shipments.length > 0) {
        rowData.shipments.forEach((shipment, index) => {
            console.log(`Processing shipment ${index}:`, shipment);
            const clone = template.content.cloneNode(true);
            const cargoSelect = clone.querySelector('.cargo');
            const quantityInput = clone.querySelector('.quantity');
            const costInput = clone.querySelector('.cost_amount');

            // Set quantity and cost values
            quantityInput.value = shipment.quantity !== undefined ? shipment.quantity : '0';
            costInput.value = shipment.cost_amount !== undefined ? shipment.cost_amount : '0';

            // Append the clone to the container first
            shipmentContainer.appendChild(clone);

            // Get the newly appended cargo select element
            const appendedCargoSelect = shipmentContainer.children[shipmentContainer.children.length - 1].querySelector('.cargo');

            // Load cargo options and initialize Select2
            const shipmentPromise = loadItemsForGroup(appendedCargoSelect)
                .then(() => {
                    $(appendedCargoSelect).select2({
                        placeholder: 'ابحث واختر البضاعة',
                        allowClear: true,
                        language: {
                            noResults: function() { return "لا توجد نتائج"; },
                            searching: function() { return "جاري البحث..."; }
                        },
                        dir: 'rtl'
                    });
                    // Set the cargo value after options are loaded
                    if (shipment.cargo) {
                        $(appendedCargoSelect).val(shipment.cargo).trigger('change');
                    }
                })
                .catch(error => {
                    console.error(`Error loading cargo for shipment ${index}:`, error);
                    $(appendedCargoSelect).select2({
                        placeholder: 'ابحث واختر البضاعة',
                        allowClear: true,
                        dir: 'rtl'
                    });
                    if (shipment.cargo) {
                        $(appendedCargoSelect).val(shipment.cargo).trigger('change');
                    }
                });

            // Add remove button functionality
            const removeBtn = shipmentContainer.children[shipmentContainer.children.length - 1].querySelector('.removeShipment');
            if (removeBtn) {
                removeBtn.addEventListener('click', function () {
                    $(this).closest('.shipment-group').find('.cargo').select2('destroy');
                    this.closest('.shipment-group').remove();
                });
            }

            shipmentPromises.push(shipmentPromise);
        });
    } else {
        console.log("No shipments found, adding a default empty shipment group");
        const clone = template.content.cloneNode(true);
        const cargoSelect = clone.querySelector('.cargo');
        shipmentContainer.appendChild(clone);

        const appendedCargoSelect = shipmentContainer.children[shipmentContainer.children.length - 1].querySelector('.cargo');
        const shipmentPromise = loadItemsForGroup(appendedCargoSelect)
            .then(() => {
                $(appendedCargoSelect).select2({
                    placeholder: 'ابحث واختر البضاعة',
                    allowClear: true,
                    language: {
                        noResults: function() { return "لا توجد نتائج"; },
                        searching: function() { return "جاري البحث..."; }
                    },
                    dir: 'rtl'
                });
            })
            .catch(error => {
                console.error("Error loading cargo for default shipment:", error);
                $(appendedCargoSelect).select2({
                    placeholder: 'ابحث واختر البضاعة',
                    allowClear: true,
                    dir: 'rtl'
                });
            });

        const removeBtn = shipmentContainer.children[shipmentContainer.children.length - 1].querySelector('.removeShipment');
        if (removeBtn) {
            removeBtn.addEventListener('click', function () {
                $(this).closest('.shipment-group').find('.cargo').select2('destroy');
                this.closest('.shipment-group').remove();
            });
        }

        shipmentPromises.push(shipmentPromise);
    }

    // Wait for all promises to resolve before showing the modal
    Promise.all([exportCountryPromise, originCountryPromise, ...shipmentPromises])
        .then(() => {
            console.log("All promises resolved, showing modal");
            applyAsterisksToRequiredFields(document.getElementById('editModal'));
            document.getElementById('editModal').style.display = "block";
        })
        .catch(error => {
            console.error("Error in Promise.all:", error);
            applyAsterisksToRequiredFields(document.getElementById('editModal'));
            document.getElementById('editModal').style.display = "block";
        });
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