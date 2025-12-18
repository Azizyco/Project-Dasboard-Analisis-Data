// ========================================
// ADMIN PANEL LOGIC (no login required)
// ========================================

let currentUser = { email: 'Guest', role: 'guest' };
let parsedData = [];
let validData = [];
let invalidData = [];

// Initialize admin panel (no auth check)
(function initAdmin() {
    utils.showLoading(true, 'Memuat admin panel...');

    // Tampilkan badge sebagai Guest
    const userBadge = document.getElementById('userBadge');
    if (userBadge) {
        userBadge.textContent = 'Guest (No Login)';
    }

    utils.showLoading(false);
})();

// Setup drag & drop
const uploadArea = document.getElementById('uploadArea');

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// Handle file reading
function handleFile(file) {
    if (!file.name.endsWith('.csv')) {
        utils.showAlert('alertMessage', 'File harus berformat .csv', 'error');
        return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
        const csvText = e.target.result;
        document.getElementById('csvTextarea').value = csvText;
        processCSVData();
    };

    reader.onerror = () => {
        utils.showAlert('alertMessage', 'Gagal membaca file', 'error');
    };

    reader.readAsText(file);
}

// Process CSV data
function processCSVData() {
    const csvText = document.getElementById('csvTextarea').value.trim();
    
    if (!csvText) {
        utils.showAlert('alertMessage', 'Masukkan data CSV terlebih dahulu', 'warning');
        return;
    }

    try {
        // Parse CSV
        parsedData = utils.parseCSV(csvText);
        
        if (parsedData.length === 0) {
            utils.showAlert('alertMessage', 'Tidak ada data valid dalam CSV', 'error');
            return;
        }

        // Validate and clean data
        validData = [];
        invalidData = [];

        parsedData.forEach((row, index) => {
            const cleaned = utils.cleanTransaction(row);
            const validation = utils.validateTransaction(cleaned);

            if (validation.isValid) {
                validData.push({ ...cleaned, rowNumber: index + 2 }); // +2 karena header + 1-based
            } else {
                invalidData.push({
                    rowNumber: index + 2,
                    data: row,
                    errors: validation.errors
                });
            }
        });

        // Show preview
        showPreview();

    } catch (error) {
        console.error('Error processing CSV:', error);
        utils.showAlert('alertMessage', 'Error parsing CSV: ' + error.message, 'error');
    }
}

// Show preview
function showPreview() {
    const previewSection = document.getElementById('previewSection');
    const previewCount = document.getElementById('previewCount');
    const previewBody = document.getElementById('previewBody');
    const validationResults = document.getElementById('validationResults');

    // Update count
    previewCount.textContent = `${validData.length} valid, ${invalidData.length} invalid`;

    // Show validation summary
    let validationHTML = '';
    
    if (validData.length > 0) {
        validationHTML += `<div class="alert alert-success show">
            ✅ ${validData.length} baris data valid siap diupload
        </div>`;
    }

    if (invalidData.length > 0) {
        validationHTML += `<div class="alert alert-error show">
            ❌ ${invalidData.length} baris data invalid akan dilewati:<br>
            <ul style="margin-top: 0.5rem;">`;
        
        invalidData.slice(0, 5).forEach(item => {
            validationHTML += `<li>Baris ${item.rowNumber}: ${item.errors.join(', ')}</li>`;
        });

        if (invalidData.length > 5) {
            validationHTML += `<li>... dan ${invalidData.length - 5} baris lainnya</li>`;
        }

        validationHTML += `</ul></div>`;
    }

    validationResults.innerHTML = validationHTML;

    // Show preview table (max 100 rows)
    const displayData = [...validData.slice(0, 50), ...invalidData.slice(0, 50)];
    let tableHTML = '';

    displayData.forEach((row, index) => {
        const isValid = validData.includes(row);
        const rowClass = isValid ? '' : 'style="background: #fee2e2;"';
        
        tableHTML += `<tr ${rowClass}>
            <td>${row.rowNumber || index + 1}</td>
            <td>${row.transaction_id || row.data?.transaction_id || '-'}</td>
            <td>${row.date || row.data?.date || '-'}</td>
            <td>${row.product_name || row.data?.product_name || '-'}</td>
            <td>${row.region_name || row.data?.region_name || '-'}</td>
            <td>${row.quantity || row.data?.quantity || '-'}</td>
            <td>${utils.formatCurrency(row.price_per_unit || 0)}</td>
            <td>${utils.formatCurrency(row.total_price || 0)}</td>
            <td>${isValid ? '✅ Valid' : '❌ ' + (row.errors?.[0] || 'Invalid')}</td>
        </tr>`;
    });

    previewBody.innerHTML = tableHTML;

    // Show section
    previewSection.style.display = 'block';
    previewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    if (validData.length === 0) {
        document.getElementById('uploadBtn').disabled = true;
    } else {
        document.getElementById('uploadBtn').disabled = false;
    }
}

// Hide preview
function hidePreview() {
    document.getElementById('previewSection').style.display = 'none';
    parsedData = [];
    validData = [];
    invalidData = [];
}

// Clear all data
function clearData() {
    document.getElementById('csvTextarea').value = '';
    document.getElementById('fileInput').value = '';
    hidePreview();
    document.getElementById('alertMessage').classList.remove('show');
}

// Upload to Supabase
async function uploadToSupabase() {
    if (validData.length === 0) {
        utils.showAlert('alertMessage', 'Tidak ada data valid untuk diupload', 'error');
        return;
    }

    if (!confirm(`Upload ${validData.length} baris data ke database?`)) {
        return;
    }

    const uploadBtn = document.getElementById('uploadBtn');
    const progressSection = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    uploadBtn.disabled = true;
    progressSection.style.display = 'block';

    try {
        // Prepare data for upload (remove rowNumber)
        const dataToUpload = validData.map(({ rowNumber, ...data }) => data);

        // Chunk data (200 rows per batch)
        const chunks = utils.chunkArray(dataToUpload, 200);
        let uploaded = 0;
        let failed = 0;

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            
            try {
                const { data, error } = await supabaseClient
                    .from('transactions')
                    .insert(chunk);

                if (error) throw error;

                uploaded += chunk.length;
            } catch (error) {
                console.error('Error uploading chunk:', error);
                failed += chunk.length;
            }

            // Update progress
            const progress = Math.round(((i + 1) / chunks.length) * 100);
            progressBar.style.width = progress + '%';
            progressBar.textContent = progress + '%';
            progressText.textContent = `Uploaded ${uploaded} rows${failed > 0 ? `, ${failed} failed` : ''}`;
        }

        // Show result
        if (failed === 0) {
            utils.showAlert('alertMessage', 
                `✅ Berhasil upload ${uploaded} baris data!`, 
                'success');
        } else {
            utils.showAlert('alertMessage', 
                `⚠️ Upload selesai: ${uploaded} berhasil, ${failed} gagal`, 
                'warning');
        }

        // Clear after success
        setTimeout(() => {
            clearData();
            progressSection.style.display = 'none';
            progressBar.style.width = '0%';
        }, 3000);

    } catch (error) {
        console.error('Upload error:', error);
        utils.showAlert('alertMessage', 'Error saat upload: ' + error.message, 'error');
    } finally {
        uploadBtn.disabled = false;
    }
}

// Download sample CSV
function downloadSample() {
    const sampleData = [
        {
            transaction_id: 'T0001',
            product_name: 'Laptop',
            region_name: 'Jakarta',
            date: '15-01-2024',
            quantity: 2,
            price_per_unit: 8500000,
            total_price: 17000000
        },
        {
            transaction_id: 'T0002',
            product_name: 'Mouse',
            region_name: 'Bandung',
            date: '20-01-2024',
            quantity: 10,
            price_per_unit: 150000,
            total_price: 1500000
        },
        {
            transaction_id: 'T0003',
            product_name: 'Keyboard',
            region_name: 'Surabaya',
            date: '25-01-2024',
            quantity: 5,
            price_per_unit: 500000,
            total_price: 2500000
        },
        {
            transaction_id: 'T0004',
            product_name: 'Monitor',
            region_name: 'Medan',
            date: '10-02-2024',
            quantity: 3,
            price_per_unit: 2500000,
            total_price: 7500000
        },
        {
            transaction_id: 'T0005',
            product_name: 'Headset',
            region_name: 'Jakarta',
            date: '15-02-2024',
            quantity: 8,
            price_per_unit: 350000,
            total_price: 2800000
        }
    ];

    utils.downloadCSV(sampleData, 'sample_transactions.csv');
}

// Upload sample data directly to database
async function uploadSampleData() {
    if (!confirm('Upload data sample ke database? Ini akan menambahkan sekitar 50 transaksi sample.')) {
        return;
    }

    utils.showLoading(true, 'Mengupload sample data...');

    try {
        // Data sample yang sudah sesuai schema baru
        const sampleTransactions = [
            // Januari 2024
            { date: '2024-01-15', product_name: 'Laptop', region_name: 'Jakarta', quantity: 2, price_per_unit: 8500000, total_price: 17000000 },
            { date: '2024-01-20', product_name: 'Mouse', region_name: 'Bandung', quantity: 10, price_per_unit: 150000, total_price: 1500000 },
            { date: '2024-01-25', product_name: 'Keyboard', region_name: 'Surabaya', quantity: 5, price_per_unit: 500000, total_price: 2500000 },
            { date: '2024-01-28', product_name: 'Monitor', region_name: 'Medan', quantity: 3, price_per_unit: 2500000, total_price: 7500000 },
            { date: '2024-01-30', product_name: 'Headset', region_name: 'Jakarta', quantity: 8, price_per_unit: 350000, total_price: 2800000 },

            // Februari 2024
            { date: '2024-02-05', product_name: 'Laptop', region_name: 'Bandung', quantity: 1, price_per_unit: 8500000, total_price: 8500000 },
            { date: '2024-02-10', product_name: 'Mouse', region_name: 'Jakarta', quantity: 15, price_per_unit: 150000, total_price: 2250000 },
            { date: '2024-02-12', product_name: 'Keyboard', region_name: 'Surabaya', quantity: 7, price_per_unit: 500000, total_price: 3500000 },
            { date: '2024-02-15', product_name: 'Monitor', region_name: 'Medan', quantity: 2, price_per_unit: 2500000, total_price: 5000000 },
            { date: '2024-02-18', product_name: 'Headset', region_name: 'Bandung', quantity: 10, price_per_unit: 350000, total_price: 3500000 },
            { date: '2024-02-20', product_name: 'Webcam', region_name: 'Jakarta', quantity: 5, price_per_unit: 750000, total_price: 3750000 },
            { date: '2024-02-25', product_name: 'SSD', region_name: 'Surabaya', quantity: 12, price_per_unit: 1200000, total_price: 14400000 },

            // Maret 2024
            { date: '2024-03-02', product_name: 'Laptop', region_name: 'Jakarta', quantity: 3, price_per_unit: 8500000, total_price: 25500000 },
            { date: '2024-03-05', product_name: 'Mouse', region_name: 'Bandung', quantity: 20, price_per_unit: 150000, total_price: 3000000 },
            { date: '2024-03-08', product_name: 'Keyboard', region_name: 'Medan', quantity: 6, price_per_unit: 500000, total_price: 3000000 },
            { date: '2024-03-10', product_name: 'Monitor', region_name: 'Surabaya', quantity: 4, price_per_unit: 2500000, total_price: 10000000 },
            { date: '2024-03-15', product_name: 'Headset', region_name: 'Jakarta', quantity: 9, price_per_unit: 350000, total_price: 3150000 },
            { date: '2024-03-18', product_name: 'Webcam', region_name: 'Bandung', quantity: 7, price_per_unit: 750000, total_price: 5250000 },
            { date: '2024-03-22', product_name: 'SSD', region_name: 'Jakarta', quantity: 15, price_per_unit: 1200000, total_price: 18000000 },
            { date: '2024-03-28', product_name: 'RAM', region_name: 'Surabaya', quantity: 10, price_per_unit: 800000, total_price: 8000000 },

            // April 2024
            { date: '2024-04-03', product_name: 'Laptop', region_name: 'Medan', quantity: 2, price_per_unit: 8500000, total_price: 17000000 },
            { date: '2024-04-07', product_name: 'Mouse', region_name: 'Jakarta', quantity: 18, price_per_unit: 150000, total_price: 2700000 },
            { date: '2024-04-10', product_name: 'Keyboard', region_name: 'Bandung', quantity: 8, price_per_unit: 500000, total_price: 4000000 },
            { date: '2024-04-12', product_name: 'Monitor', region_name: 'Surabaya', quantity: 5, price_per_unit: 2500000, total_price: 12500000 },
            { date: '2024-04-15', product_name: 'Headset', region_name: 'Medan', quantity: 11, price_per_unit: 350000, total_price: 3850000 },
            { date: '2024-04-18', product_name: 'Webcam', region_name: 'Jakarta', quantity: 6, price_per_unit: 750000, total_price: 4500000 },
            { date: '2024-04-20', product_name: 'SSD', region_name: 'Bandung', quantity: 14, price_per_unit: 1200000, total_price: 16800000 },
            { date: '2024-04-25', product_name: 'RAM', region_name: 'Jakarta', quantity: 12, price_per_unit: 800000, total_price: 9600000 },

            // Mei 2024
            { date: '2024-05-02', product_name: 'Laptop', region_name: 'Jakarta', quantity: 4, price_per_unit: 8500000, total_price: 34000000 },
            { date: '2024-05-05', product_name: 'Mouse', region_name: 'Surabaya', quantity: 22, price_per_unit: 150000, total_price: 3300000 },
            { date: '2024-05-08', product_name: 'Keyboard', region_name: 'Bandung', quantity: 9, price_per_unit: 500000, total_price: 4500000 },
            { date: '2024-05-10', product_name: 'Monitor', region_name: 'Medan', quantity: 3, price_per_unit: 2500000, total_price: 7500000 },
            { date: '2024-05-15', product_name: 'Headset', region_name: 'Jakarta', quantity: 13, price_per_unit: 350000, total_price: 4550000 },
            { date: '2024-05-18', product_name: 'Webcam', region_name: 'Surabaya', quantity: 8, price_per_unit: 750000, total_price: 6000000 },
            { date: '2024-05-22', product_name: 'SSD', region_name: 'Bandung', quantity: 16, price_per_unit: 1200000, total_price: 19200000 },
            { date: '2024-05-28', product_name: 'RAM', region_name: 'Jakarta', quantity: 14, price_per_unit: 800000, total_price: 11200000 },

            // Juni 2024
            { date: '2024-06-03', product_name: 'Laptop', region_name: 'Bandung', quantity: 3, price_per_unit: 8500000, total_price: 25500000 },
            { date: '2024-06-07', product_name: 'Mouse', region_name: 'Jakarta', quantity: 25, price_per_unit: 150000, total_price: 3750000 },
            { date: '2024-06-10', product_name: 'Keyboard', region_name: 'Medan', quantity: 10, price_per_unit: 500000, total_price: 5000000 },
            { date: '2024-06-15', product_name: 'Monitor', region_name: 'Surabaya', quantity: 6, price_per_unit: 2500000, total_price: 15000000 },
            { date: '2024-06-18', product_name: 'Headset', region_name: 'Jakarta', quantity: 12, price_per_unit: 350000, total_price: 4200000 },
            { date: '2024-06-22', product_name: 'Webcam', region_name: 'Bandung', quantity: 9, price_per_unit: 750000, total_price: 6750000 },
            { date: '2024-06-25', product_name: 'SSD', region_name: 'Jakarta', quantity: 18, price_per_unit: 1200000, total_price: 21600000 },
            { date: '2024-06-28', product_name: 'RAM', region_name: 'Surabaya', quantity: 15, price_per_unit: 800000, total_price: 12000000 },

            // Juli 2024
            { date: '2024-07-02', product_name: 'Laptop', region_name: 'Jakarta', quantity: 5, price_per_unit: 8500000, total_price: 42500000 },
            { date: '2024-07-08', product_name: 'Mouse', region_name: 'Bandung', quantity: 20, price_per_unit: 150000, total_price: 3000000 },
            { date: '2024-07-12', product_name: 'Keyboard', region_name: 'Surabaya', quantity: 11, price_per_unit: 500000, total_price: 5500000 },
            { date: '2024-07-18', product_name: 'Monitor', region_name: 'Medan', quantity: 4, price_per_unit: 2500000, total_price: 10000000 },
            { date: '2024-07-22', product_name: 'Headset', region_name: 'Jakarta', quantity: 14, price_per_unit: 350000, total_price: 4900000 },
            { date: '2024-07-28', product_name: 'Webcam', region_name: 'Bandung', quantity: 10, price_per_unit: 750000, total_price: 7500000 }
        ];

        const { data, error } = await supabaseClient
            .from('transactions')
            .insert(sampleTransactions);

        if (error) throw error;

        utils.showLoading(false);
        utils.showAlert('alertMessage', 
            `✅ Berhasil upload ${sampleTransactions.length} transaksi sample!`, 
            'success');

        setTimeout(() => {
            // Redirect ke dashboard untuk lihat hasilnya
            if (confirm('Data berhasil diupload! Mau lihat di dashboard?')) {
                window.location.href = 'dashboard.html';
            }
        }, 1500);

    } catch (error) {
        utils.showLoading(false);
        console.error('Upload error:', error);
        utils.showAlert('alertMessage', 
            'Error saat upload sample data: ' + error.message, 
            'error');
    }
}

// Handle logout
async function handleLogout() {
    // Tidak ada sesi login, cukup kembali ke halaman start
    window.location.href = 'login.html';
}
