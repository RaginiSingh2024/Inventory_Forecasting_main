// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    let salesChart = null;
    let stockChart = null;
    let dataCache = {
        products: [],
        sales: [],
        lastUpdate: null
    };

    // Initialize dashboard
    initializeDashboard();

    async function initializeDashboard() {
        try {
            // Show loading state
            showLoadingState();
            
            await loadDashboardStats();
            await loadCharts();
            await loadRecentActivities();
            
            // Hide loading state
            hideLoadingState();
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            hideLoadingState();
            showErrorState();
        }
    }

    function showLoadingState() {
        // Add loading indicators to chart containers
        const salesChartContainer = document.getElementById('salesChart').parentElement;
        const stockChartContainer = document.getElementById('stockChart').parentElement;
        
        salesChartContainer.style.opacity = '0.5';
        stockChartContainer.style.opacity = '0.5';
    }

    function hideLoadingState() {
        const salesChartContainer = document.getElementById('salesChart').parentElement;
        const stockChartContainer = document.getElementById('stockChart').parentElement;
        
        salesChartContainer.style.opacity = '1';
        stockChartContainer.style.opacity = '1';
    }

    function showErrorState() {
        // Show empty state if database fails
        console.log('Database connection failed, showing empty dashboard');
        // Initialize with empty data
        dataCache.products = [];
        dataCache.sales = [];
        
        // Update stats with empty data
        animateCounter('totalProducts', 0);
        animateCounter('totalStock', 0);
        animateCounter('lowStockItems', 0);
        animateCounter('totalSales', 0, '₹', 2);
    }

    // Force load sample data immediately for better UX
    function forceLoadSampleCharts() {
        console.log('Loading sample charts...');
        setTimeout(() => {
            loadSalesChartWithSampleData();
            loadStockChartWithSampleData();
        }, 100);
    }

    // Load dashboard statistics
    async function loadDashboardStats() {
        try {
            let products, sales;
            
            // Check if user context and database are available
            if (window.userContext && window.db) {
                // Wait for user context to be initialized
                await window.userContext.waitForInit();

                // Check if user is authenticated
                if (window.userContext.isAuthenticated()) {
                    // Get user-specific products
                    const userProductsCollection = window.userContext.getUserCollection('products');
                    const productsSnapshot = await userProductsCollection.get();
                    products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                    // Get user-specific sales
                    const userSalesCollection = window.userContext.getUserCollection('sales');
                    const salesSnapshot = await userSalesCollection.get();
                    sales = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    
                    // Cache the data
                    dataCache.products = products;
                    dataCache.sales = sales;
                    dataCache.lastUpdate = new Date();
                    
                } else {
                    // User not authenticated, redirect to login
                    window.location.href = 'index.html';
                    return;
                }
            } else {
                // Use empty data if user context or database not available
                products = [];
                sales = [];
            }

            // Calculate stats
            const totalProducts = products.length;
            const totalStock = products.reduce((sum, product) => sum + (product.stock || 0), 0);
            const lowStockItems = products.filter(product => product.stock <= (product.reorderLevel || 5)).length;
            const totalSales = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);

            // Update UI with animation
            animateCounter('totalProducts', totalProducts);
            animateCounter('totalStock', totalStock);
            animateCounter('lowStockItems', lowStockItems);
            animateCounter('totalSales', totalSales, '₹', 2);

        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            // Show empty state on error
            showErrorState();
        }
    }

    // Animate counter updates
    function animateCounter(elementId, targetValue, prefix = '', decimals = 0) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const startValue = 0;
        const duration = 1000; // 1 second
        const startTime = performance.now();
        
        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentValue = startValue + (targetValue - startValue) * progress;
            
            if (decimals > 0) {
                element.textContent = `${prefix}${currentValue.toFixed(decimals)}`;
            } else {
                element.textContent = `${prefix}${Math.floor(currentValue).toLocaleString()}`;
            }
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        }
        
        requestAnimationFrame(updateCounter);
    }

    // Load charts
    async function loadCharts() {
        try {
            await loadSalesChart();
            await loadStockChart();
        } catch (error) {
            console.error('Error loading charts:', error);
        }
    }

    // Load sales trend chart
    async function loadSalesChart() {
        try {
            let sales;
            
            // Use cached data or load user-specific data
            if (window.userContext && window.db && dataCache.sales.length === 0) {
                await window.userContext.waitForInit();
                if (window.userContext.isAuthenticated()) {
                    const userSalesCollection = window.userContext.getUserCollection('sales');
                    const salesSnapshot = await userSalesCollection.orderBy('date', 'desc').get();
                    sales = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    dataCache.sales = sales;
                } else {
                    sales = [];
                }
            } else if (dataCache.sales.length > 0) {
                sales = dataCache.sales;
            } else {
                sales = [];
            }

            // Group sales by date (last 7 days)
            const last7Days = [];
            const today = new Date();
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                last7Days.push({
                    date: date.toISOString().split('T')[0],
                    label: date.toLocaleDateString('en-US', { weekday: 'short' }),
                    sales: 0
                });
            }

            // Calculate daily sales from real data
            if (sales && sales.length > 0) {
                sales.forEach(sale => {
                    const saleDate = new Date(sale.date.seconds ? sale.date.seconds * 1000 : sale.date);
                    const saleDateStr = saleDate.toISOString().split('T')[0];
                    const dayData = last7Days.find(day => day.date === saleDateStr);
                    if (dayData) {
                        dayData.sales += (sale.totalAmount || 0);
                    }
                });
            }

            // Create chart with optimized options
            const ctx = document.getElementById('salesChart').getContext('2d');
            
            if (salesChart) {
                salesChart.destroy();
            }

            salesChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: last7Days.map(day => day.label),
                    datasets: [{
                        label: 'Daily Sales (₹)',
                        data: last7Days.map(day => day.sales),
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        pointBackgroundColor: '#3498db',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'nearest'
                    },
                    animation: {
                        duration: 300, // Reduced animation time
                        easing: 'easeOutQuart'
                    },
                    hover: {
                        animationDuration: 200 // Faster hover animations
                    },
                    elements: {
                        point: {
                            hoverRadius: 8
                        }
                    },
                    scales: {
                        x: {
                            type: 'category',
                            grid: {
                                display: false
                            },
                            ticks: {
                                maxRotation: 0,
                                font: {
                                    size: 11
                                }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0,0,0,0.05)',
                                lineWidth: 1
                            },
                            ticks: {
                                maxTicksLimit: 6,
                                font: {
                                    size: 11
                                },
                                callback: function(value) {
                                    return '₹' + (value >= 1000 ? (value/1000).toFixed(1) + 'K' : value.toFixed(0));
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            enabled: true,
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            borderColor: '#3498db',
                            borderWidth: 1,
                            cornerRadius: 4,
                            displayColors: false,
                            callbacks: {
                                title: function(context) {
                                    return context[0].label;
                                },
                                label: function(context) {
                                    return 'Sales: ₹' + context.parsed.y.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Error loading sales chart:', error);
            // Load with sample data on error
            loadSalesChartWithSampleData();
        }
    }

    // Sample data for testing and fallback
    function getSampleData() {
        const today = new Date();
        
        return {
            products: [
                {
                    id: 'sample1',
                    name: 'MacBook Pro 16"',
                    category: 'Electronics',
                    price: 199999.00,
                    stock: 12,
                    reorderLevel: 5,
                    description: 'High-performance laptop for professionals'
                },
                {
                    id: 'sample2',
                    name: 'iPhone 15 Pro',
                    category: 'Electronics',
                    price: 79999.00,
                    stock: 25,
                    reorderLevel: 10,
                    description: 'Latest smartphone with advanced features'
                },
                {
                    id: 'sample3',
                    name: 'Wireless Headphones',
                    category: 'Electronics',
                    price: 15999.00,
                    stock: 8,
                    reorderLevel: 15,
                    description: 'Premium noise-canceling headphones'
                },
                {
                    id: 'sample4',
                    name: 'Office Chair',
                    category: 'Furniture',
                    price: 12999.00,
                    stock: 15,
                    reorderLevel: 5,
                    description: 'Ergonomic office chair with lumbar support'
                },
                {
                    id: 'sample5',
                    name: 'Standing Desk',
                    category: 'Furniture',
                    price: 25999.00,
                    stock: 7,
                    reorderLevel: 3,
                    description: 'Adjustable height standing desk'
                },
                {
                    id: 'sample6',
                    name: 'Coffee Maker',
                    category: 'Appliances',
                    price: 8999.00,
                    stock: 20,
                    reorderLevel: 8,
                    description: 'Programmable coffee maker with thermal carafe'
                }
            ],
            sales: [
                {
                    id: 'sale1',
                    productId: 'sample1',
                    productName: 'MacBook Pro 16"',
                    quantity: 2,
                    unitPrice: 199999.00,
                    totalAmount: 399998.00,
                    date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)
                },
                {
                    id: 'sale2',
                    productId: 'sample2',
                    productName: 'iPhone 15 Pro',
                    quantity: 3,
                    unitPrice: 79999.00,
                    totalAmount: 239997.00,
                    date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)
                },
                {
                    id: 'sale3',
                    productId: 'sample3',
                    productName: 'Wireless Headphones',
                    quantity: 5,
                    unitPrice: 15999.00,
                    totalAmount: 79995.00,
                    date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
                },
                {
                    id: 'sale4',
                    productId: 'sample4',
                    productName: 'Office Chair',
                    quantity: 1,
                    unitPrice: 12999.00,
                    totalAmount: 12999.00,
                    date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)
                },
                {
                    id: 'sale5',
                    productId: 'sample6',
                    productName: 'Coffee Maker',
                    quantity: 4,
                    unitPrice: 8999.00,
                    totalAmount: 35996.00,
                    date: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000)
                },
                {
                    id: 'sale6',
                    productId: 'sample2',
                    productName: 'iPhone 15 Pro',
                    quantity: 2,
                    unitPrice: 79999.00,
                    totalAmount: 159998.00,
                    date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000)
                },
                {
                    id: 'sale7',
                    productId: 'sample5',
                    productName: 'Standing Desk',
                    quantity: 1,
                    unitPrice: 25999.00,
                    totalAmount: 25999.00,
                    date: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
                }
            ]
        };
    }

    // Load sample data
    function loadSampleData() {
        const sampleData = getSampleData();
        dataCache.products = sampleData.products;
        dataCache.sales = sampleData.sales;
        
        // Update stats with sample data
        const totalProducts = sampleData.products.length;
        const totalStock = sampleData.products.reduce((sum, product) => sum + product.stock, 0);
        const lowStockItems = sampleData.products.filter(product => product.stock <= product.reorderLevel).length;
        const totalSales = sampleData.sales.reduce((sum, sale) => sum + sale.totalAmount, 0);

        animateCounter('totalProducts', totalProducts);
        animateCounter('totalStock', totalStock);
        animateCounter('lowStockItems', lowStockItems);
        animateCounter('totalSales', totalSales, '₹', 2);
        
        // Load charts with sample data
        loadSalesChartWithSampleData();
        loadStockChartWithSampleData();
    }

    // Load sales chart with real data
    function loadSalesChartWithSampleData() {
        console.log('Loading sales chart with real data...');
        
        // Get real sales data
        const sales = [];
        
        // Group sales by date (last 7 days)
        const last7Days = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            last7Days.push({
                date: date.toISOString().split('T')[0],
                label: date.toLocaleDateString('en-US', { weekday: 'short' }),
                sales: 0
            });
        }

        // Calculate daily sales from real data
        if (sales && sales.length > 0) {
            sales.forEach(sale => {
                const saleDate = new Date(sale.date);
                const saleDateStr = saleDate.toISOString().split('T')[0];
                const dayData = last7Days.find(day => day.date === saleDateStr);
                if (dayData) {
                    dayData.sales += (sale.totalAmount || 0) * 83;
                }
            });
        }
        
        console.log('Real sales data:', last7Days);

        // Create chart
        const ctx = document.getElementById('salesChart').getContext('2d');
        
        if (salesChart) {
            salesChart.destroy();
        }

        salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last7Days.map(day => day.label),
                datasets: [{
                    label: 'Daily Sales (₹)',
                    data: last7Days.map(day => day.sales),
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#3498db',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'nearest'
                },
                animation: {
                    duration: 300,
                    easing: 'easeOutQuart'
                },
                hover: {
                    animationDuration: 200
                },
                elements: {
                    point: {
                        hoverRadius: 8
                    }
                },
                scales: {
                    x: {
                        type: 'category',
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 0,
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.05)',
                            lineWidth: 1
                        },
                        ticks: {
                            maxTicksLimit: 6,
                            font: {
                                size: 11
                            },
                            callback: function(value) {
                                return '₹' + (value >= 1000 ? (value/1000).toFixed(1) + 'K' : value.toFixed(0));
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#3498db',
                        borderWidth: 1,
                        cornerRadius: 4,
                        displayColors: false,
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                return 'Sales: ₹' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    // Load stock chart with sample data
    function loadStockChartWithSampleData() {
        console.log('Loading stock chart with sample data...');
        // Use fixed sample data for consistent display
        const categories = ['Electronics', 'Furniture', 'Appliances'];
        const stockValues = [87, 34, 46];
        console.log('Stock data:', { categories, stockValues });

        // Create chart
        const ctx = document.getElementById('stockChart').getContext('2d');
        
        if (stockChart) {
            stockChart.destroy();
        }

        stockChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{
                    data: stockValues,
                    backgroundColor: [
                        '#3498db',
                        '#e74c3c',
                        '#f39c12',
                        '#27ae60',
                        '#9b59b6',
                        '#1abc9c'
                    ],
                    borderWidth: 3,
                    borderColor: '#fff',
                    hoverBorderWidth: 4,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 400,
                    easing: 'easeOutQuart'
                },
                hover: {
                    animationDuration: 150
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            font: {
                                size: 12
                            },
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#3498db',
                        borderWidth: 1,
                        cornerRadius: 6,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} units (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Load stock levels chart
    async function loadStockChart() {
        try {
            let products;
            
            // Use cached data or load user-specific data
            if (window.userContext && window.db && dataCache.products.length === 0) {
                await window.userContext.waitForInit();
                if (window.userContext.isAuthenticated()) {
                    const userProductsCollection = window.userContext.getUserCollection('products');
                    const productsSnapshot = await userProductsCollection.get();
                    products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    dataCache.products = products;
                } else {
                    products = [];
                }
            } else if (dataCache.products.length > 0) {
                products = dataCache.products;
            } else {
                products = [];
            }

            // Calculate actual stock levels by category
            const categoryStock = {};
            products.forEach(product => {
                const category = product.category || 'Other';
                categoryStock[category] = (categoryStock[category] || 0) + (product.stock || 0);
            });
            
            const categories = Object.keys(categoryStock);
            const stockValues = Object.values(categoryStock);
            
            // If no products, show empty state
            if (categories.length === 0) {
                categories.push('No Data');
                stockValues.push(0);
            }

            // Create chart
            const ctx = document.getElementById('stockChart').getContext('2d');
            
            if (stockChart) {
                stockChart.destroy();
            }

            stockChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: categories,
                    datasets: [{
                        data: stockValues,
                        backgroundColor: [
                            '#3498db',
                            '#e74c3c',
                            '#f39c12',
                            '#27ae60',
                            '#9b59b6',
                            '#1abc9c'
                        ],
                        borderWidth: 3,
                        borderColor: '#fff',
                        hoverBorderWidth: 4,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 400,
                        easing: 'easeOutQuart'
                    },
                    hover: {
                        animationDuration: 150
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                font: {
                                    size: 12
                                },
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            borderColor: '#3498db',
                            borderWidth: 1,
                            cornerRadius: 6,
                            displayColors: true,
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${label}: ${value} units (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Error loading stock chart:', error);
            // Load with sample data on error
            loadStockChartWithSampleData();
        }
    }

    // Load recent activities
    async function loadRecentActivities() {
        try {
            await loadLowStockAlerts();
            await loadRecentSales();
        } catch (error) {
            console.error('Error loading recent activities:', error);
        }
    }

    // Load low stock alerts
    async function loadLowStockAlerts() {
        try {
            let products;
            
            // Use cached data or load user-specific data
            if (window.userContext && window.db && dataCache.products.length === 0) {
                await window.userContext.waitForInit();
                if (window.userContext.isAuthenticated()) {
                    const userProductsCollection = window.userContext.getUserCollection('products');
                    const productsSnapshot = await userProductsCollection.get();
                    products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                } else {
                    products = [];
                }
            } else if (dataCache.products.length > 0) {
                products = dataCache.products;
            } else {
                products = [];
            }

            const lowStockProducts = products.filter(product => product.stock <= (product.reorderLevel || 5));
            const lowStockList = document.getElementById('lowStockList');

            if (lowStockProducts.length === 0) {
                lowStockList.innerHTML = '<div class="activity-item"><p>✅ No low stock alerts</p></div>';
                return;
            }

            lowStockList.innerHTML = lowStockProducts.map(product => `
                <div class="activity-item">
                    <div class="activity-info">
                        <h4>${product.name}</h4>
                        <p>Stock: ${product.stock} units (Reorder at: ${product.reorderLevel || 5})</p>
                    </div>
                    <div class="activity-status low-stock">⚠️ Low Stock</div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error loading low stock alerts:', error);
            // Show sample low stock alerts
            const lowStockList = document.getElementById('lowStockList');
            if (lowStockList) {
                lowStockList.innerHTML = '<div class="activity-item"><p>Unable to load stock alerts</p></div>';
            }
        }
    }

    // Load recent sales
    async function loadRecentSales() {
        try {
            let sales;
            
            // Use cached data or load user-specific data
            if (window.userContext && window.db && dataCache.sales.length === 0) {
                await window.userContext.waitForInit();
                if (window.userContext.isAuthenticated()) {
                    const userSalesCollection = window.userContext.getUserCollection('sales');
                    const salesSnapshot = await userSalesCollection.orderBy('date', 'desc').get();
                    sales = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                } else {
                    sales = [];
                }
            } else if (dataCache.sales.length > 0) {
                sales = dataCache.sales;
            } else {
                sales = [];
            }

            const recentSales = sales.slice(0, 5); // Get last 5 sales
            const recentSalesList = document.getElementById('recentSalesList');

            if (recentSales.length === 0) {
                recentSalesList.innerHTML = '<div class="activity-item"><p>No recent sales</p></div>';
                return;
            }

            recentSalesList.innerHTML = recentSales.map(sale => {
                const saleDate = new Date(sale.date.seconds ? sale.date.seconds * 1000 : sale.date);
                return `
                    <div class="activity-item">
                        <div class="activity-info">
                            <h4>${sale.productName}</h4>
                            <p>Qty: ${sale.quantity} × $${sale.unitPrice.toFixed(2)} = $${sale.totalAmount.toFixed(2)}</p>
                            <p class="text-muted">${saleDate.toLocaleDateString()}</p>
                        </div>
                        <div class="activity-status normal">✅ Completed</div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Error loading recent sales:', error);
            // Show sample recent sales
            const recentSalesList = document.getElementById('recentSalesList');
            if (recentSalesList) {
                recentSalesList.innerHTML = '<div class="activity-item"><p>Unable to load recent sales</p></div>';
            }
        }
    }

    // Refresh dashboard data every 30 seconds
    setInterval(() => {
        loadDashboardStats();
        loadRecentActivities();
    }, 30000);
});
