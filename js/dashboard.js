// ========================================
// DASHBOARD LOGIC
// ========================================

let allTransactions = [];
let filteredTransactions = [];
let charts = {};
let currentUser = { email: 'Guest', role: 'guest' };

// Helper: get total value per transaksi
function getTransactionTotal(t) {
    const explicitTotal = parseFloat(t.total_price);
    if (!isNaN(explicitTotal)) return explicitTotal;

    const price = parseFloat(t.price_per_unit);
    const qty = parseFloat(t.quantity);
    if (!isNaN(price) && !isNaN(qty)) return price * qty;

    return 0;
}

// Initialize dashboard (no login required)
(async function initDashboard() {
    utils.showLoading(true, 'Memuat dashboard...');

    // Update user badge as Guest
    const userBadge = document.getElementById('userBadge');

    if (userBadge) {
        userBadge.textContent = 'Guest (No Login)';
    }

    // Load data
    await loadTransactions();

    // Initialize filters
    initializeFilters();

    // Set default date range (last 6 months)
    setDefaultDateRange();

    // Apply initial filters
    await applyFilters();

    utils.showLoading(false);
})();

// Load all transactions
async function loadTransactions() {
    try {
        const { data, error } = await supabaseClient
            .from('transactions')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;

        allTransactions = data || [];
        console.log(`Loaded ${allTransactions.length} transactions`);
    } catch (error) {
        console.error('Error loading transactions:', error);
        utils.showAlert('alertMessage', 'Gagal memuat data transaksi: ' + error.message, 'error');
    }
}

// Initialize filter dropdowns
function initializeFilters() {
    const products = utils.getUniqueValues(allTransactions, 'product_name');
    const regions = utils.getUniqueValues(allTransactions, 'region_name');

    // Populate product filter
    const productFilter = document.getElementById('productFilter');
    const productTrendSelect = document.getElementById('productTrendSelect');
    
    products.forEach(product => {
        productFilter.add(new Option(product, product));
        productTrendSelect.add(new Option(product, product));
    });

    // Populate region filter
    const regionFilter = document.getElementById('regionFilter');
    regions.forEach(region => {
        regionFilter.add(new Option(region, region));
    });
}

// Set default date range
function setDefaultDateRange() {
    // Jika ada data transaksi, gunakan rentang tanggal dari data
    if (allTransactions && allTransactions.length > 0) {
        const dates = allTransactions
            .map(t => new Date(t.date))
            .filter(d => !isNaN(d.getTime()));

        if (dates.length > 0) {
            const minDate = new Date(Math.min(...dates));
            const maxDate = new Date(Math.max(...dates));

            document.getElementById('startDate').value = utils.formatDateForInput(minDate);
            document.getElementById('endDate').value = utils.formatDateForInput(maxDate);
            return;
        }
    }

    // Fallback: 6 bulan terakhir dari hari ini
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);

    document.getElementById('startDate').value = utils.formatDateForInput(startDate);
    document.getElementById('endDate').value = utils.formatDateForInput(endDate);
}

// Apply filters
async function applyFilters() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const productFilter = document.getElementById('productFilter').value;
    const regionFilter = document.getElementById('regionFilter').value;

    // Filter transactions
    filteredTransactions = allTransactions.filter(transaction => {
        let valid = true;

        // Date filter
        if (startDate && transaction.date < startDate) valid = false;
        if (endDate && transaction.date > endDate) valid = false;

        // Product filter
        if (productFilter && transaction.product_name !== productFilter) valid = false;

        // Region filter
        if (regionFilter && transaction.region_name !== regionFilter) valid = false;

        return valid;
    });

    console.log(`Filtered to ${filteredTransactions.length} transactions`);

    // Update dashboard
    updateStats();
    updateCharts();
}

// Reset filters
function resetFilters() {
    document.getElementById('productFilter').value = '';
    document.getElementById('regionFilter').value = '';
    setDefaultDateRange();
    applyFilters();
}

// Update statistics cards
function updateStats() {
    // Calculate total sales
    const totalSales = filteredTransactions.reduce((sum, t) => sum + getTransactionTotal(t), 0);
    const totalOrders = filteredTransactions.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Get top product
    const salesByProduct = {};
    filteredTransactions.forEach(t => {
        salesByProduct[t.product_name] = (salesByProduct[t.product_name] || 0) + getTransactionTotal(t);
    });
    const topProduct = Object.keys(salesByProduct).reduce((a, b) => 
        salesByProduct[a] > salesByProduct[b] ? a : b, '');

    // Get top region
    const salesByRegion = {};
    filteredTransactions.forEach(t => {
        salesByRegion[t.region_name] = (salesByRegion[t.region_name] || 0) + getTransactionTotal(t);
    });
    const topRegion = Object.keys(salesByRegion).reduce((a, b) => 
        salesByRegion[a] > salesByRegion[b] ? a : b, '');

    // Update UI
    document.getElementById('totalSales').textContent = utils.formatCurrency(totalSales);
    document.getElementById('totalOrders').textContent = `${utils.formatNumber(totalOrders)} transaksi`;
    document.getElementById('topProduct').textContent = topProduct || '-';
    document.getElementById('topProductSales').textContent = utils.formatCurrency(salesByProduct[topProduct] || 0);
    document.getElementById('topRegion').textContent = topRegion || '-';
    document.getElementById('topRegionSales').textContent = utils.formatCurrency(salesByRegion[topRegion] || 0);
    document.getElementById('avgOrderValue').textContent = utils.formatCurrency(avgOrderValue);
}

// Update all charts
function updateCharts() {
    updateSalesByProductChart();
    updateSalesByRegionChart();
    updateSalesByMonthChart();
    updateAOVByRegionChart();
}

// Sales by Product Chart
function updateSalesByProductChart() {
    const salesByProduct = {};
    filteredTransactions.forEach(t => {
        salesByProduct[t.product_name] = (salesByProduct[t.product_name] || 0) + getTransactionTotal(t);
    });

    // Sort and get top 10
    const sorted = Object.entries(salesByProduct)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const labels = sorted.map(([product]) => product);
    const data = sorted.map(([, total]) => total);

    if (charts.salesByProduct) {
        charts.salesByProduct.destroy();
    }

    const ctx = document.getElementById('salesByProductChart').getContext('2d');
    charts.salesByProduct = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Penjualan',
                data: data,
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => utils.formatCurrency(context.parsed.y)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => utils.formatCurrency(value)
                    }
                }
            }
        }
    });
}

// Sales by Region Chart
function updateSalesByRegionChart() {
    const salesByRegion = {};
    filteredTransactions.forEach(t => {
        salesByRegion[t.region_name] = (salesByRegion[t.region_name] || 0) + getTransactionTotal(t);
    });

    const labels = Object.keys(salesByRegion).sort();
    const data = labels.map(region => salesByRegion[region]);

    if (charts.salesByRegion) {
        charts.salesByRegion.destroy();
    }

    const ctx = document.getElementById('salesByRegionChart').getContext('2d');
    charts.salesByRegion = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Penjualan',
                data: data,
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => utils.formatCurrency(context.parsed.y)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => utils.formatCurrency(value)
                    }
                }
            }
        }
    });
}

// Sales by Month Chart
function updateSalesByMonthChart() {
    const salesByMonth = {};
    filteredTransactions.forEach(t => {
        const month = t.date.substring(0, 7); // YYYY-MM
        salesByMonth[month] = (salesByMonth[month] || 0) + getTransactionTotal(t);
    });

    const labels = Object.keys(salesByMonth).sort().map(m => utils.getMonthName(m + '-01'));
    const data = Object.keys(salesByMonth).sort().map(m => salesByMonth[m]);

    if (charts.salesByMonth) {
        charts.salesByMonth.destroy();
    }

    const ctx = document.getElementById('salesByMonthChart').getContext('2d');
    charts.salesByMonth = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Penjualan',
                data: data,
                borderColor: 'rgba(59, 130, 246, 1)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => utils.formatCurrency(context.parsed.y)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => utils.formatCurrency(value)
                    }
                }
            }
        }
    });
}

// Product Trend Chart (Monthly sales for selected product)
function updateProductTrendChart() {
    const selectedProduct = document.getElementById('productTrendSelect').value;
    
    if (!selectedProduct) {
        if (charts.productTrend) {
            charts.productTrend.destroy();
        }
        return;
    }

    const productTransactions = filteredTransactions.filter(t => t.product_name === selectedProduct);
    const salesByMonth = {};
    
    productTransactions.forEach(t => {
        const month = t.date.substring(0, 7);
        salesByMonth[month] = (salesByMonth[month] || 0) + getTransactionTotal(t);
    });

    const labels = Object.keys(salesByMonth).sort().map(m => utils.getMonthName(m + '-01'));
    const data = Object.keys(salesByMonth).sort().map(m => salesByMonth[m]);

    if (charts.productTrend) {
        charts.productTrend.destroy();
    }

    const ctx = document.getElementById('productTrendChart').getContext('2d');
    charts.productTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: selectedProduct,
                data: data,
                borderColor: 'rgba(245, 158, 11, 1)',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => utils.formatCurrency(context.parsed.y)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => utils.formatCurrency(value)
                    }
                }
            }
        }
    });
}

// AOV by Region Chart
function updateAOVByRegionChart() {
    const aovByRegion = {};
    const countByRegion = {};

    filteredTransactions.forEach(t => {
        const region = t.region_name;
        aovByRegion[region] = (aovByRegion[region] || 0) + getTransactionTotal(t);
        countByRegion[region] = (countByRegion[region] || 0) + 1;
    });

    const labels = Object.keys(aovByRegion).sort();
    const data = labels.map(region => aovByRegion[region] / countByRegion[region]);

    if (charts.aovByRegion) {
        charts.aovByRegion.destroy();
    }

    const ctx = document.getElementById('aovByRegionChart').getContext('2d');
    charts.aovByRegion = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Average Order Value',
                data: data,
                backgroundColor: 'rgba(139, 92, 246, 0.8)',
                borderColor: 'rgba(139, 92, 246, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => utils.formatCurrency(context.parsed.y)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => utils.formatCurrency(value)
                    }
                }
            }
        }
    });
}

// Rating Distribution Chart
function updateRatingChart() {
    const ratingCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    filteredTransactions.forEach(t => {
        if (t.rating) {
            ratingCount[t.rating] = (ratingCount[t.rating] || 0) + 1;
        }
    });

    const labels = ['★', '★★', '★★★', '★★★★', '★★★★★'];
    const data = [ratingCount[1], ratingCount[2], ratingCount[3], ratingCount[4], ratingCount[5]];

    if (charts.rating) {
        charts.rating.destroy();
    }

    const ctx = document.getElementById('ratingChart').getContext('2d');
    charts.rating = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(234, 179, 8, 0.8)',
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(16, 185, 129, 0.8)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Handle logout
async function handleLogout() {
    // Tidak ada sesi login, cukup kembali ke halaman start
    window.location.href = 'login.html';
}
