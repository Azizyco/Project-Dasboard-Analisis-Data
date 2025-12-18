// ========================================
// UTILITY FUNCTIONS
// ========================================

const utils = {
    // Format currency IDR
    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    },

    // Format number with thousand separator
    formatNumber(number) {
        return new Intl.NumberFormat('id-ID').format(number);
    },

    // Format date
    formatDate(dateString) {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date);
    },

    // Format date untuk input
    formatDateForInput(dateString) {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    },

    // Get month name
    getMonthName(monthString) {
        const date = new Date(monthString);
        return new Intl.DateTimeFormat('id-ID', { 
            year: 'numeric', 
            month: 'short' 
        }).format(date);
    },

    // Show alert message
    showAlert(elementId, message, type = 'success') {
        const alertEl = document.getElementById(elementId);
        if (!alertEl) return;

        alertEl.className = `alert alert-${type} show`;
        alertEl.textContent = message;

        setTimeout(() => {
            alertEl.classList.remove('show');
        }, 5000);
    },

    // Show loading overlay
    showLoading(show = true, text = 'Loading...') {
        let overlay = document.getElementById('loadingOverlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div style="text-align: center;">
                    <div class="spinner"></div>
                    <div class="loading-text" id="loadingText">${text}</div>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        const loadingText = document.getElementById('loadingText');
        if (loadingText) loadingText.textContent = text;

        overlay.classList.toggle('show', show);
    },

    // Parse CSV string
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length !== headers.length) continue;

            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index].trim();
            });
            data.push(row);
        }

        return data;
    },

    // Parse single CSV line (handle quoted values)
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current);
        return result;
    },

    // Validate transaction data
    validateTransaction(data) {
        const errors = [];

        // Validate date (support DD-MM-YYYY and YYYY-MM-DD)
        if (!data.date) {
            errors.push('date is required');
        } else {
            const rawDate = data.date.trim();

            let parsedDate = null;
            const ddmmyyyyMatch = rawDate.match(/^(\d{2})-(\d{2})-(\d{4})$/); // 27-01-2024
            const yyyymmddMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/); // 2024-01-27

            if (ddmmyyyyMatch) {
                const [, dd, mm, yyyy] = ddmmyyyyMatch;
                parsedDate = new Date(`${yyyy}-${mm}-${dd}`);
            } else if (yyyymmddMatch) {
                parsedDate = new Date(rawDate);
            } else {
                // Fallback to native parser for any other formats
                parsedDate = new Date(rawDate);
            }

            if (!parsedDate || isNaN(parsedDate.getTime())) {
                errors.push('date is not a valid date');
            }
        }

        // Validate product_name
        if (!data.product_name || data.product_name.trim() === '') {
            errors.push('product_name is required');
        }

        // Validate region_name
        if (!data.region_name || data.region_name.trim() === '') {
            errors.push('region_name is required');
        }

        // Validate quantity
        if (data.quantity !== undefined && data.quantity !== null && data.quantity !== '') {
            const quantity = parseFloat(data.quantity);
            if (isNaN(quantity) || quantity < 0) {
                errors.push('quantity must be a positive number');
            }
        }

        // Validate price_per_unit
        const pricePerUnit = parseFloat(data.price_per_unit);
        if (isNaN(pricePerUnit) || pricePerUnit < 0) {
            errors.push('price_per_unit must be a positive number');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },

    // Clean transaction data
    cleanTransaction(data) {
        // Normalise date ke format YYYY-MM-DD untuk disimpan di database
        let cleanedDate = data.date?.trim();
        if (cleanedDate) {
            const ddmmyyyyMatch = cleanedDate.match(/^(\d{2})-(\d{2})-(\d{4})$/);
            if (ddmmyyyyMatch) {
                const [, dd, mm, yyyy] = ddmmyyyyMatch;
                cleanedDate = `${yyyy}-${mm}-${dd}`;
            }
        }

        const cleaned = {
            date: cleanedDate,
            product_name: data.product_name?.trim(),
            region_name: data.region_name?.trim(),
            price_per_unit: parseFloat(data.price_per_unit)
        };

        // Add optional fields
        if (data.transaction_id) cleaned.transaction_id = data.transaction_id.trim();
        if (data.product_id) cleaned.product_id = data.product_id.trim();
        if (data.region_id) cleaned.region_id = data.region_id.trim();
        
        if (data.quantity !== undefined && data.quantity !== null && data.quantity !== '') {
            cleaned.quantity = parseFloat(data.quantity);
        }

        if (data.total_price !== undefined && data.total_price !== null && data.total_price !== '') {
            cleaned.total_price = parseFloat(data.total_price);
        }

        return cleaned;
    },

    // Chunk array for batch processing
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    },

    // Download data as CSV
    downloadCSV(data, filename) {
        if (!data || data.length === 0) {
            alert('No data to download');
            return;
        }

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header];
                    // Escape quotes and wrap in quotes if contains comma
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Get unique values from array
    getUniqueValues(array, key) {
        return [...new Set(array.map(item => item[key]))].sort();
    },

    // Calculate statistics
    calculateStats(data) {
        if (!data || data.length === 0) return null;

        const values = data.map(d => parseFloat(d));
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const sorted = [...values].sort((a, b) => a - b);
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const median = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];

        return { sum, avg, min, max, median, count: values.length };
    }
};

// Export
window.utils = utils;
