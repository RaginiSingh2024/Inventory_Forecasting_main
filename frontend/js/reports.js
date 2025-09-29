// Reports functionality
document.addEventListener('DOMContentLoaded', function() {
    let products = [];
    let sales = [];
    let salesPerformanceChart = null;
    let topProductsChart = null;

    // DOM elements
    const reportDateFromInput = document.getElementById('reportDateFrom');
    const reportDateToInput = document.getElementById('reportDateTo');
    const generateReportBtn = document.getElementById('generateReport');
    
    // Export buttons
    const exportSalesCSVBtn = document.getElementById('exportSalesCSV');
    const exportInventoryCSVBtn = document.getElementById('exportInventoryCSV');
    const exportForecastCSVBtn = document.getElementById('exportForecastCSV');
    const printReportBtn = document.getElementById('printReport');

    // Summary elements
    const totalRevenueElement = document.getElementById('totalRevenue');
    const totalUnitsSoldElement = document.getElementById('totalUnitsSold');
    const avgOrderValueElement = document.getElementById('avgOrderValue');
    const inventoryValueElement = document.getElementById('inventoryValue');

    // Table elements
    const salesByProductBody = document.getElementById('salesByProductBody');
    const salesByCategoryBody = document.getElementById('salesByCategoryBody');
    const inventoryStatusBody = document.getElementById('inventoryStatusBody');

    // Initialize
    init();

    async function init() {
        setupEventListeners();
        setDefaultDateRange();
        await loadData();
        await generateReport();
    }

    function setupEventListeners() {
        generateReportBtn.addEventListener('click', generateReport);
        exportSalesCSVBtn.addEventListener('click', () => exportToCSV('sales'));
        exportInventoryCSVBtn.addEventListener('click', () => exportToCSV('inventory'));
        exportForecastCSVBtn.addEventListener('click', () => exportToCSV('forecast'));
        printReportBtn.addEventListener('click', printReport);
    }

    // Set default date range (last 30 days)
    function setDefaultDateRange() {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        reportDateToInput.value = today.toISOString().split('T')[0];
        reportDateFromInput.value = thirtyDaysAgo.toISOString().split('T')[0];
    }

    // Load data
    async function loadData() {
        try {
            // Check if user context and database are available
            if (!window.userContext || !window.db) {
                console.warn('User context or database not available');
                products = [];
                sales = [];
                return;
            }

            // Wait for user context to be initialized
            await window.userContext.waitForInit();

            // Check if user is authenticated
            if (!window.userContext.isAuthenticated()) {
                console.warn('User not authenticated, redirecting to login');
                window.location.href = 'index.html';
                return;
            }

            // Load user-specific products
            const userProductsCollection = window.userContext.getUserCollection('products');
            const productsSnapshot = await userProductsCollection.get();
            products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Load user-specific sales
            const userSalesCollection = window.userContext.getUserCollection('sales');
            const salesSnapshot = await userSalesCollection.get();
            sales = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));


        } catch (error) {
            console.error('Error loading data:', error);
            showNotification('Error loading data', 'error');
        }
    }

    // Generate report
    async function generateReport() {
        try {
            // Show loading state
            generateReportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            generateReportBtn.disabled = true;

            const dateFrom = new Date(reportDateFromInput.value);
            const dateTo = new Date(reportDateToInput.value);
            dateTo.setHours(23, 59, 59, 999); // Include the entire end date

            // Filter sales by date range
            const filteredSales = sales.filter(sale => {
                const saleDate = new Date(sale.date.seconds ? sale.date.seconds * 1000 : sale.date);
                return saleDate >= dateFrom && saleDate <= dateTo;
            });

            // Update summary
            updateReportSummary(filteredSales);

            // Update tables
            updateSalesByProductTable(filteredSales);
            updateSalesByCategoryTable(filteredSales);
            updateInventoryStatusTable();

            // Update charts
            updateSalesPerformanceChart(filteredSales);
            updateTopProductsChart(filteredSales);

            // Show green success notification for 3 seconds
            if (window.NotificationSystem) {
                window.NotificationSystem.success('Report generated successfully', 3000);
            } else {
                showNotification('Report generated successfully', 'success');
            }

        } catch (error) {
            console.error('Error generating report:', error);
            showNotification('Error generating report', 'error');
        } finally {
            // Reset button state
            generateReportBtn.innerHTML = '<i class="fas fa-chart-bar"></i> Generate Report';
            generateReportBtn.disabled = false;
        }
    }

    // Update report summary
    function updateReportSummary(filteredSales) {
        const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
        const totalUnitsSold = filteredSales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
        const avgOrderValue = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;
        const inventoryValue = products.reduce((sum, product) => sum + (product.stock * product.price), 0);

        totalRevenueElement.textContent = `₹${totalRevenue.toFixed(2)}`;
        totalUnitsSoldElement.textContent = totalUnitsSold.toLocaleString();
        avgOrderValueElement.textContent = `₹${avgOrderValue.toFixed(2)}`;
        inventoryValueElement.textContent = `₹${inventoryValue.toFixed(2)}`;
    }

    // Update sales by product table
    function updateSalesByProductTable(filteredSales) {
        // Group sales by product
        const productSales = {};
        
        filteredSales.forEach(sale => {
            if (!productSales[sale.productId]) {
                const product = products.find(p => p.id === sale.productId);
                productSales[sale.productId] = {
                    product: product,
                    unitsSold: 0,
                    revenue: 0,
                    salesCount: 0
                };
            }
            
            productSales[sale.productId].unitsSold += sale.quantity;
            productSales[sale.productId].revenue += sale.totalAmount;
            productSales[sale.productId].salesCount++;
        });

        const sortedProductSales = Object.values(productSales)
            .sort((a, b) => b.revenue - a.revenue);

        if (sortedProductSales.length === 0) {
            salesByProductBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">No sales data for the selected period</td>
                </tr>
            `;
            return;
        }

        salesByProductBody.innerHTML = sortedProductSales.map(item => {
            const avgPrice = item.unitsSold > 0 ? item.revenue / item.unitsSold : 0;
            return `
                <tr>
                    <td>${item.product ? item.product.name : 'Unknown Product'}</td>
                    <td>${item.product ? item.product.category : 'Unknown'}</td>
                    <td>${item.unitsSold}</td>
                    <td>₹${item.revenue.toFixed(2)}</td>
                    <td>₹${avgPrice.toFixed(2)}</td>
                    <td>${item.product ? item.product.stock : 0}</td>
                </tr>
            `;
        }).join('');
    }

    // Update sales by category table
    function updateSalesByCategoryTable(filteredSales) {
        // Group sales by category
        const categorySales = {};
        
        filteredSales.forEach(sale => {
            const product = products.find(p => p.id === sale.productId);
            const category = product ? product.category : 'Unknown';
            
            if (!categorySales[category]) {
                categorySales[category] = {
                    products: new Set(),
                    unitsSold: 0,
                    revenue: 0
                };
            }
            
            if (product) {
                categorySales[category].products.add(product.id);
            }
            categorySales[category].unitsSold += sale.quantity;
            categorySales[category].revenue += sale.totalAmount;
        });

        const totalRevenue = Object.values(categorySales).reduce((sum, cat) => sum + cat.revenue, 0);
        const sortedCategorySales = Object.entries(categorySales)
            .map(([category, data]) => ({
                category,
                productCount: data.products.size,
                unitsSold: data.unitsSold,
                revenue: data.revenue,
                percentage: totalRevenue > 0 ? (data.revenue / totalRevenue * 100) : 0
            }))
            .sort((a, b) => b.revenue - a.revenue);

        if (sortedCategorySales.length === 0) {
            salesByCategoryBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">No sales data for the selected period</td>
                </tr>
            `;
            return;
        }

        salesByCategoryBody.innerHTML = sortedCategorySales.map(item => `
            <tr>
                <td>${item.category}</td>
                <td>${item.productCount}</td>
                <td>${item.unitsSold}</td>
                <td>₹${(item.revenue * 83).toFixed(2)}</td>
                <td>${item.percentage.toFixed(1)}%</td>
            </tr>
        `).join('');
    }

    // Update inventory status table
    function updateInventoryStatusTable() {
        const sortedProducts = products.sort((a, b) => a.name.localeCompare(b.name));

        inventoryStatusBody.innerHTML = sortedProducts.map(product => {
            const stockValue = product.stock * product.price;
            let status = 'Normal';
            let statusClass = 'normal-stock';

            if (product.stock <= product.reorderLevel) {
                status = 'Low Stock';
                statusClass = 'low-stock';
            } else if (product.stock > product.reorderLevel * 3) {
                status = 'Excess';
                statusClass = 'high-stock';
            }

            return `
                <tr>
                    <td>${product.name}</td>
                    <td>${product.category}</td>
                    <td>${product.stock}</td>
                    <td>${product.reorderLevel}</td>
                    <td>₹${stockValue.toFixed(2)}</td>
                    <td><span class="status-badge ${statusClass}">${status}</span></td>
                </tr>
            `;
        }).join('');
    }

    // Update sales performance chart
    function updateSalesPerformanceChart(filteredSales) {
        const ctx = document.getElementById('salesPerformanceChart').getContext('2d');

        // Group sales by date
        const dailySales = {};
        const dateFrom = new Date(reportDateFromInput.value);
        const dateTo = new Date(reportDateToInput.value);

        // Initialize all dates with 0
        for (let d = new Date(dateFrom); d <= dateTo; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            dailySales[dateStr] = 0;
        }

        // Add actual sales
        filteredSales.forEach(sale => {
            const saleDate = new Date(sale.date.seconds ? sale.date.seconds * 1000 : sale.date);
            const dateStr = saleDate.toISOString().split('T')[0];
            if (dailySales.hasOwnProperty(dateStr)) {
                dailySales[dateStr] += sale.totalAmount;
            }
        });

        const labels = Object.keys(dailySales).map(date => {
            return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        const data = Object.values(dailySales);

        if (salesPerformanceChart) {
            salesPerformanceChart.destroy();
        }
        salesPerformanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Daily Sales (₹)',
                    data: data,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + value.toFixed(0);
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    // Update top products chart
    function updateTopProductsChart(filteredSales) {
        const ctx = document.getElementById('topProductsChart').getContext('2d');

        // Group sales by product
        const productSales = {};
        
        filteredSales.forEach(sale => {
            if (!productSales[sale.productId]) {
                const product = products.find(p => p.id === sale.productId);
                productSales[sale.productId] = {
                    name: product ? product.name : 'Unknown Product',
                    revenue: 0
                };
            }
            productSales[sale.productId].revenue += sale.totalAmount;
        });

        const sortedProducts = Object.values(productSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 8); // Top 8 products

        const labels = sortedProducts.map(p => p.name);
        const data = sortedProducts.map(p => p.revenue);

        if (topProductsChart) {
            topProductsChart.destroy();
        }

        topProductsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#3498db', '#e74c3c', '#f39c12', '#27ae60',
                        '#9b59b6', '#1abc9c', '#34495e', '#e67e22'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ₹' + context.parsed.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    }

    // Export to CSV
    function exportToCSV(type) {
        let csvContent = '';
        let filename = '';

        switch (type) {
            case 'sales':
                csvContent = generateSalesCSV();
                filename = 'sales_report.csv';
                break;
            case 'inventory':
                csvContent = generateInventoryCSV();
                filename = 'inventory_report.csv';
                break;
            case 'forecast':
                csvContent = generateForecastCSV();
                filename = 'forecast_report.csv';
                break;
        }

        downloadCSV(csvContent, filename);
    }

    // Generate sales CSV
    function generateSalesCSV() {
        const dateFrom = new Date(reportDateFromInput.value);
        const dateTo = new Date(reportDateToInput.value);
        dateTo.setHours(23, 59, 59, 999);

        const filteredSales = sales.filter(sale => {
            const saleDate = new Date(sale.date.seconds ? sale.date.seconds * 1000 : sale.date);
            return saleDate >= dateFrom && saleDate <= dateTo;
        });

        let csv = 'Date,Product,Category,Quantity,Unit Price,Total Amount,Notes\n';
        
        filteredSales.forEach(sale => {
            const product = products.find(p => p.id === sale.productId);
            const saleDate = new Date(sale.date.seconds ? sale.date.seconds * 1000 : sale.date);
            
            csv += `${saleDate.toLocaleDateString()},`;
            csv += `"${sale.productName}",`;
            csv += `"${product ? product.category : 'Unknown'}",`;
            csv += `${sale.quantity},`;
            csv += `${sale.unitPrice.toFixed(2)},`;
            csv += `${sale.totalAmount.toFixed(2)},`;
            csv += `"${sale.notes || ''}"\n`;
        });

        return csv;
    }

    // Generate inventory CSV
    function generateInventoryCSV() {
        let csv = 'Product,Category,Current Stock,Reorder Level,Unit Price,Stock Value,Status\n';
        
        products.forEach(product => {
            const stockValue = product.stock * product.price;
            let status = 'Normal';
            
            if (product.stock <= product.reorderLevel) {
                status = 'Low Stock';
            } else if (product.stock > product.reorderLevel * 3) {
                status = 'Excess';
            }

            csv += `"${product.name}",`;
            csv += `"${product.category}",`;
            csv += `${product.stock},`;
            csv += `${product.reorderLevel},`;
            csv += `${product.price.toFixed(2)},`;
            csv += `${stockValue.toFixed(2)},`;
            csv += `"${status}"\n`;
        });

        return csv;
    }

    // Generate forecast CSV (simplified)
    function generateForecastCSV() {
        let csv = 'Product,Category,Current Stock,Avg Daily Sales,Forecasted Demand (7 days),Status\n';
        
        products.forEach(product => {
            // Simple forecast calculation
            const productSales = sales.filter(sale => sale.productId === product.id);
            const last30Days = productSales.filter(sale => {
                const saleDate = new Date(sale.date.seconds ? sale.date.seconds * 1000 : sale.date);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return saleDate >= thirtyDaysAgo;
            });

            const totalSales = last30Days.reduce((sum, sale) => sum + sale.quantity, 0);
            const avgDailySales = totalSales / 30;
            const forecastedDemand = avgDailySales * 7;

            let status = 'Normal';
            if (product.stock <= product.reorderLevel) {
                status = 'Critical';
            } else if (forecastedDemand > product.stock) {
                status = 'Warning';
            }

            csv += `"${product.name}",`;
            csv += `"${product.category}",`;
            csv += `${product.stock},`;
            csv += `${avgDailySales.toFixed(2)},`;
            csv += `${forecastedDemand.toFixed(2)},`;
            csv += `"${status}"\n`;
        });

        return csv;
    }

    // Download CSV file
    function downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        // Show green success notification for CSV download
        if (window.NotificationSystem) {
            window.NotificationSystem.success(`${filename} downloaded successfully`, 3000);
        } else {
            showNotification(`${filename} downloaded successfully`, 'success');
        }
    }

    // Print report
    function printReport() {
        window.print();
    }

    // Show notification
    function showNotification(message, type = 'info') {
        // Remove any existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notif => {
            notif.remove();
        });

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const iconClass = type === 'success' ? 'fa-check-circle' : 
                         type === 'error' ? 'fa-exclamation-circle' : 
                         type === 'warning' ? 'fa-exclamation-triangle' : 
                         'fa-info-circle';
        
        notification.innerHTML = `
            <i class="fas ${iconClass}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show', 'slide-in');
        }, 50);

        // Auto-hide after 4 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            notification.classList.add('slide-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
});
