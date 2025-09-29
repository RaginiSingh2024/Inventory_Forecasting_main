// Forecast page functionality
document.addEventListener('DOMContentLoaded', function() {
    let products = [];
    let sales = [];
    let forecastEngine = new ForecastingEngine();
    let forecastChart = null;

    // DOM elements
    const forecastPeriodSelect = document.getElementById('forecastPeriod');
    const forecastMethodSelect = document.getElementById('forecastMethod');
    const generateForecastBtn = document.getElementById('generateForecast');
    const productForecastFilter = document.getElementById('productForecastFilter');
    const categoryForecastFilter = document.getElementById('categoryForecastFilter');

    // Summary elements
    const restockCountElement = document.getElementById('restockCount');
    const predictedSalesElement = document.getElementById('predictedSales');
    const stockOutRiskElement = document.getElementById('stockOutRisk');
    const forecastAccuracyElement = document.getElementById('forecastAccuracy');

    // Table elements
    const restockTableBody = document.getElementById('restockTableBody');
    const detailedForecastBody = document.getElementById('detailedForecastBody');

    // Initialize
    init();

    async function init() {
        setupEventListeners();
        await loadData();
        await generateInitialForecast();
    }

    function setupEventListeners() {
        generateForecastBtn.addEventListener('click', generateForecast);
        productForecastFilter.addEventListener('change', filterDetailedForecastTable);
        categoryForecastFilter.addEventListener('change', filterDetailedForecastTable);
    }

    // Load products and sales data
    async function loadData() {
        try {
            // Check if user context and database are available
            if (!window.userContext || !window.db) {
                console.warn('User context or database not available');
                products = [];
                sales = [];
                populateFilters();
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


            // Populate filter dropdowns
            populateFilters();

        } catch (error) {
            console.error('Error loading data:', error);
            showNotification('Error loading data', 'error');
        }
    }

    // Populate filter dropdowns
    function populateFilters() {
        // Product filter
        productForecastFilter.innerHTML = '<option value="">All Products</option>';
        products.forEach(product => {
            productForecastFilter.innerHTML += `<option value="${product.id}">${product.name}</option>`;
        });
    }

    // Generate initial forecast
    async function generateInitialForecast() {
        await generateForecast();
    }

    // Generate forecast
    async function generateForecast() {
        try {
            const period = parseInt(forecastPeriodSelect.value);
            const method = forecastMethodSelect.value;

            // Show loading state
            generateForecastBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            generateForecastBtn.disabled = true;

            // Generate restock recommendations
            const restockRecommendations = forecastEngine.calculateRestockRecommendations(products, sales, period);
            
            // Generate detailed forecasts
            const detailedForecasts = forecastEngine.generateDetailedForecast(products, sales, method, period);

            // Update summary
            updateForecastSummary(restockRecommendations, detailedForecasts, period);

            // Update tables
            updateRestockTable(restockRecommendations);
            updateDetailedForecastTable(detailedForecasts);

            // Update chart
            updateForecastChart(detailedForecasts, period);

            showNotification('Forecast generated successfully', 'success');

        } catch (error) {
            console.error('Error generating forecast:', error);
            showNotification('Error generating forecast', 'error');
        } finally {
            // Reset button state
            generateForecastBtn.innerHTML = '<i class="fas fa-chart-line"></i> Generate Forecast';
            generateForecastBtn.disabled = false;
        }
    }

    // Update forecast summary
    function updateForecastSummary(restockRecommendations, detailedForecasts, period) {
        // Products to restock
        const restockCount = restockRecommendations.length;
        restockCountElement.textContent = restockCount;

        // Predicted sales
        const totalPredictedSales = detailedForecasts.reduce((sum, forecast) => {
            return sum + (forecast.forecastedDemand * forecast.product.price);
        }, 0);
        predictedSalesElement.textContent = `₹${totalPredictedSales.toFixed(2)}`;

        // Stock out risk
        const stockOutRisk = detailedForecasts.filter(forecast => 
            forecast.stockStatus === 'critical' || forecast.daysUntilStockOut <= period
        ).length;
        stockOutRiskElement.textContent = stockOutRisk;

        // Forecast accuracy (simplified calculation)
        const accuracy = calculateForecastAccuracy(detailedForecasts);
        forecastAccuracyElement.textContent = `${accuracy.toFixed(1)}%`;
    }

    // Calculate forecast accuracy
    function calculateForecastAccuracy(forecasts) {
        // This is a simplified accuracy calculation
        // In a real application, you would compare with historical data
        let totalAccuracy = 0;
        let validForecasts = 0;

        forecasts.forEach(forecast => {
            if (forecast.avgDailySales > 0) {
                // Simple accuracy based on how well the forecast aligns with recent trends
                const recentTrend = forecast.avgDailySales * forecast.forecastPeriod;
                const forecastDiff = Math.abs(forecast.forecastedDemand - recentTrend);
                const accuracy = Math.max(0, 100 - (forecastDiff / recentTrend * 100));
                totalAccuracy += accuracy;
                validForecasts++;
            }
        });

        return validForecasts > 0 ? totalAccuracy / validForecasts : 85; // Default accuracy
    }

    // Update restock recommendations table
    function updateRestockTable(recommendations) {
        if (recommendations.length === 0) {
            restockTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">No restock recommendations</td>
                </tr>
            `;
            return;
        }

        restockTableBody.innerHTML = recommendations.map(rec => `
            <tr>
                <td>${rec.product.name}</td>
                <td>${rec.currentStock}</td>
                <td>${rec.forecastedDemand.toFixed(1)}</td>
                <td>${rec.daysUntilStockOut === Infinity ? '∞' : rec.daysUntilStockOut}</td>
                <td>${rec.recommendedOrder}</td>
                <td><span class="priority-${rec.priority}">${rec.priority.toUpperCase()}</span></td>
            </tr>
        `).join('');
    }

    // Update detailed forecast table
    function updateDetailedForecastTable(forecasts) {
        const filteredForecasts = filterForecasts(forecasts);

        if (filteredForecasts.length === 0) {
            detailedForecastBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">No forecasts match the selected filters</td>
                </tr>
            `;
            return;
        }

        detailedForecastBody.innerHTML = filteredForecasts.map(forecast => {
            const statusClass = getStatusClass(forecast.stockStatus);
            const statusText = getStatusText(forecast.stockStatus);

            return `
                <tr>
                    <td>${forecast.product.name}</td>
                    <td>${forecast.product.category}</td>
                    <td>${forecast.product.stock}</td>
                    <td>${forecast.avgDailySales.toFixed(2)}</td>
                    <td>${forecast.forecastPeriod} days</td>
                    <td>${forecast.forecastedDemand.toFixed(1)}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                </tr>
            `;
        }).join('');
    }

    // Filter forecasts based on selected filters
    function filterForecasts(forecasts) {
        const selectedProduct = productForecastFilter.value;
        const selectedCategory = categoryForecastFilter.value;

        return forecasts.filter(forecast => {
            const matchesProduct = !selectedProduct || forecast.product.id === selectedProduct;
            const matchesCategory = !selectedCategory || forecast.product.category === selectedCategory;
            return matchesProduct && matchesCategory;
        });
    }

    // Filter detailed forecast table
    function filterDetailedForecastTable() {
        // This will be called when filters change
        // We need to regenerate the forecast with current data
        generateForecast();
    }

    // Get status class for styling
    function getStatusClass(status) {
        switch (status) {
            case 'critical': return 'low-stock';
            case 'warning': return 'warning-stock';
            case 'excess': return 'high-stock';
            default: return 'normal-stock';
        }
    }

    // Get status text
    function getStatusText(status) {
        switch (status) {
            case 'critical': return 'Critical';
            case 'warning': return 'Warning';
            case 'excess': return 'Excess';
            default: return 'Normal';
        }
    }

    // Update forecast chart
    function updateForecastChart(forecasts, period) {
        const ctx = document.getElementById('forecastChart').getContext('2d');

        // Prepare data for top 10 products by forecast demand
        const topForecasts = forecasts
            .sort((a, b) => b.forecastedDemand - a.forecastedDemand)
            .slice(0, 10);

        const labels = topForecasts.map(f => f.product.name);
        const currentStock = topForecasts.map(f => f.product.stock);
        const forecastedDemand = topForecasts.map(f => f.forecastedDemand);

        if (forecastChart) {
            forecastChart.destroy();
        }

        forecastChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Current Stock',
                        data: currentStock,
                        backgroundColor: 'rgba(52, 152, 219, 0.7)',
                        borderColor: '#3498db',
                        borderWidth: 1
                    },
                    {
                        label: `Forecasted Demand (${period} days)`,
                        data: forecastedDemand,
                        backgroundColor: 'rgba(231, 76, 60, 0.7)',
                        borderColor: '#e74c3c',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantity'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Products'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Current Stock vs Forecasted Demand'
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
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
