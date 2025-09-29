// Sales management functionality
document.addEventListener('DOMContentLoaded', function() {
    let sales = [];
    let products = [];
    let editingSaleId = null;

    // DOM elements
    const addSaleBtn = document.getElementById('addSaleBtn');
    const saleModal = document.getElementById('saleModal');
    const deleteSaleModal = document.getElementById('deleteSaleModal');
    const saleForm = document.getElementById('saleForm');
    const salesTableBody = document.getElementById('salesTableBody');
    const searchInput = document.getElementById('searchSales');
    const dateFromInput = document.getElementById('dateFrom');
    const dateToInput = document.getElementById('dateTo');
    const productFilter = document.getElementById('productFilter');
    const clearFiltersBtn = document.getElementById('clearFilters');

    // Sale form elements
    const saleProductSelect = document.getElementById('saleProduct');
    const saleQuantityInput = document.getElementById('saleQuantity');
    const saleDateInput = document.getElementById('saleDate');
    const unitPriceInput = document.getElementById('unitPrice');
    const totalAmountInput = document.getElementById('totalAmount');
    const availableStockInput = document.getElementById('availableStock');

    // Modal close elements
    const closeBtns = document.querySelectorAll('.close');
    const cancelSaleBtn = document.getElementById('cancelSaleBtn');
    const cancelDeleteSaleBtn = document.getElementById('cancelDeleteSaleBtn');
    const confirmDeleteSaleBtn = document.getElementById('confirmDeleteSaleBtn');

    // Initialize
    init();

    async function init() {
        setupEventListeners();
        await loadProducts();
        await loadSales();
        updateSalesSummary();
        setDefaultDate();
    }

    function setupEventListeners() {
        // Add sale button
        addSaleBtn.addEventListener('click', () => openSaleModal());

        // Form submission
        saleForm.addEventListener('submit', handleFormSubmit);

        // Modal close buttons
        closeBtns.forEach(btn => {
            btn.addEventListener('click', closeModals);
        });

        cancelSaleBtn.addEventListener('click', closeModals);
        cancelDeleteSaleBtn.addEventListener('click', closeModals);
        confirmDeleteSaleBtn.addEventListener('click', handleDeleteConfirm);

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target === saleModal || e.target === deleteSaleModal) {
                closeModals();
            }
        });

        // Search and filters
        searchInput.addEventListener('input', filterSales);
        dateFromInput.addEventListener('change', filterSales);
        dateToInput.addEventListener('change', filterSales);
        productFilter.addEventListener('change', filterSales);
        clearFiltersBtn.addEventListener('click', clearFilters);

        // Product selection change
        saleProductSelect.addEventListener('change', handleProductChange);
        saleQuantityInput.addEventListener('input', calculateTotal);
    }

    // Set default date to today
    function setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        saleDateInput.value = today;
    }

    // Load products
    async function loadProducts() {
        try {
            // Check if user context and database are available
            if (!window.userContext || !window.db) {
                console.warn('User context or database not available');
                products = [];
                populateProductSelects();
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

            // Get user-specific products
            const userProductsCollection = window.userContext.getUserCollection('products');
            const snapshot = await userProductsCollection.orderBy('name').get();
            products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            populateProductSelects();
        } catch (error) {
            console.error('Error loading products:', error);
            showNotification('Error loading products', 'error');
        }
    }

    // Populate product select dropdowns
    function populateProductSelects() {
        // Sale form product select
        saleProductSelect.innerHTML = '<option value="">Select Product</option>';
        products.forEach(product => {
            saleProductSelect.innerHTML += `<option value="${product.id}">${product.name} (Stock: ${product.stock})</option>`;
        });

        // Filter product select
        productFilter.innerHTML = '<option value="">All Products</option>';
        products.forEach(product => {
            productFilter.innerHTML += `<option value="${product.id}">${product.name}</option>`;
        });
    }

    // Handle product selection change
    function handleProductChange() {
        const selectedProductId = saleProductSelect.value;
        if (selectedProductId) {
            const product = products.find(p => p.id === selectedProductId);
            if (product) {
                unitPriceInput.value = product.price.toFixed(2);
                availableStockInput.value = product.stock;
                saleQuantityInput.max = product.stock;
                calculateTotal();
            }
        } else {
            unitPriceInput.value = '';
            availableStockInput.value = '';
            totalAmountInput.value = '';
            saleQuantityInput.max = '';
        }
    }

    // Calculate total amount
    function calculateTotal() {
        const quantity = parseInt(saleQuantityInput.value) || 0;
        const unitPrice = parseFloat(unitPriceInput.value) || 0;
        const total = quantity * unitPrice;
        totalAmountInput.value = total.toFixed(2);
    }

    // Load sales
    async function loadSales() {
        try {
            // Check if user context and database are available
            if (!window.userContext || !window.db) {
                console.warn('User context or database not available');
                sales = [];
                renderSales(sales);
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

            // Get user-specific sales
            const userSalesCollection = window.userContext.getUserCollection('sales');
            const snapshot = await userSalesCollection.orderBy('date', 'desc').get();
            sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            renderSales(sales);
        } catch (error) {
            console.error('Error loading sales:', error);
            showNotification('Error loading sales', 'error');
        }
    }

    // Render sales table
    function renderSales(salesToRender) {
        if (salesToRender.length === 0) {
            salesTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">No sales found</td>
                </tr>
            `;
            return;
        }

        salesTableBody.innerHTML = salesToRender.map(sale => {
            const saleDate = new Date(sale.date.seconds ? sale.date.seconds * 1000 : sale.date);
            return `
                <tr>
                    <td>${saleDate.toLocaleDateString()}</td>
                    <td>${sale.productName}</td>
                    <td>${sale.quantity}</td>
                    <td>₹${sale.unitPrice.toFixed(2)}</td>
                    <td>₹${sale.totalAmount.toFixed(2)}</td>
                    <td>
                        <button class="action-btn delete" onclick="deleteSale('${sale.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Filter sales
    function filterSales() {
        const searchTerm = searchInput.value.toLowerCase();
        const dateFrom = dateFromInput.value;
        const dateTo = dateToInput.value;
        const selectedProduct = productFilter.value;

        let filteredSales = sales.filter(sale => {
            const saleDate = new Date(sale.date.seconds ? sale.date.seconds * 1000 : sale.date);
            const saleDateStr = saleDate.toISOString().split('T')[0];

            const matchesSearch = sale.productName.toLowerCase().includes(searchTerm);
            const matchesDateFrom = !dateFrom || saleDateStr >= dateFrom;
            const matchesDateTo = !dateTo || saleDateStr <= dateTo;
            const matchesProduct = !selectedProduct || sale.productId === selectedProduct;

            return matchesSearch && matchesDateFrom && matchesDateTo && matchesProduct;
        });

        renderSales(filteredSales);
    }

    // Clear filters
    function clearFilters() {
        searchInput.value = '';
        dateFromInput.value = '';
        dateToInput.value = '';
        productFilter.value = '';
        renderSales(sales);
    }

    // Update sales summary
    function updateSalesSummary() {
        const today = new Date();
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        let todaySales = 0;
        let weekSales = 0;
        let monthSales = 0;
        let totalSales = 0;

        sales.forEach(sale => {
            const saleDate = new Date(sale.date.seconds ? sale.date.seconds * 1000 : sale.date);
            const amount = sale.totalAmount || 0;

            totalSales += amount;

            if (saleDate.toDateString() === new Date().toDateString()) {
                todaySales += amount;
            }

            if (saleDate >= startOfWeek) {
                weekSales += amount;
            }

            if (saleDate >= startOfMonth) {
                monthSales += amount;
            }
        });

        document.getElementById('todaySales').textContent = `₹${todaySales.toFixed(2)}`;
        document.getElementById('weekSales').textContent = `₹${weekSales.toFixed(2)}`;
        document.getElementById('monthSales').textContent = `₹${monthSales.toFixed(2)}`;
        document.getElementById('totalSalesValue').textContent = `₹${totalSales.toFixed(2)}`;
    }

    // Open sale modal
    function openSaleModal() {
        saleModal.style.display = 'block';
        setDefaultDate();
        saleProductSelect.focus();
    }

    // Handle form submission
    async function handleFormSubmit(e) {
        e.preventDefault();

        const productId = saleProductSelect.value;
        const quantity = parseInt(saleQuantityInput.value);
        const saleDate = new Date(saleDateInput.value);
        const notes = document.getElementById('saleNotes').value.trim();

        // Validation
        if (!productId || !quantity || quantity <= 0) {
            showNotification('Please select a product and enter a valid quantity', 'error');
            return;
        }

        const product = products.find(p => p.id === productId);
        if (!product) {
            showNotification('Selected product not found', 'error');
            return;
        }

        if (quantity > product.stock) {
            showNotification(`Insufficient stock. Available: ${product.stock}`, 'error');
            return;
        }

        const saleData = {
            productId: productId,
            productName: product.name,
            quantity: quantity,
            unitPrice: product.price,
            totalAmount: quantity * product.price,
            date: saleDate,
            notes: notes,
            createdAt: new Date()
        };

        try {
            // Check if user context and database are available
            if (!window.userContext || !window.db) {
                throw new Error('User context or database not available');
            }

            // Wait for user context to be initialized
            await window.userContext.waitForInit();

            // Check if user is authenticated
            if (!window.userContext.isAuthenticated()) {
                throw new Error('User not authenticated');
            }

            // Add user ID to sale data
            saleData.userId = window.userContext.getCurrentUserId();

            // Get user-specific collections
            const userSalesCollection = window.userContext.getUserCollection('sales');
            const userProductsCollection = window.userContext.getUserCollection('products');

            // Add sale record
            await userSalesCollection.add(saleData);

            // Update product stock
            const newStock = product.stock - quantity;
            await userProductsCollection.doc(productId).update({
                stock: newStock,
                updatedAt: new Date()
            });

            showNotification('Sale recorded successfully', 'success');
            closeModals();
            await loadProducts();
            await loadSales();
            updateSalesSummary();
        } catch (error) {
            console.error('Error recording sale:', error);
            showNotification('Error recording sale', 'error');
        }
    }

    // Delete sale
    window.deleteSale = function(saleId) {
        editingSaleId = saleId;
        deleteSaleModal.style.display = 'block';
    };

    // Handle delete confirmation
    async function handleDeleteConfirm() {
        if (!editingSaleId) return;

        try {
            // Check if user context and database are available
            if (!window.userContext || !window.db) {
                throw new Error('User context or database not available');
            }

            // Wait for user context to be initialized
            await window.userContext.waitForInit();

            // Check if user is authenticated
            if (!window.userContext.isAuthenticated()) {
                throw new Error('User not authenticated');
            }

            const sale = sales.find(s => s.id === editingSaleId);
            if (sale) {
                // Get user-specific collections
                const userSalesCollection = window.userContext.getUserCollection('sales');
                const userProductsCollection = window.userContext.getUserCollection('products');

                // Delete sale record
                await userSalesCollection.doc(editingSaleId).delete();

                // Restore product stock
                const product = products.find(p => p.id === sale.productId);
                if (product) {
                    const newStock = product.stock + sale.quantity;
                    await userProductsCollection.doc(sale.productId).update({
                        stock: newStock,
                        updatedAt: new Date()
                    });
                }

                showNotification('Sale deleted successfully', 'success');
                closeModals();
                await loadProducts();
                await loadSales();
                updateSalesSummary();
            }
        } catch (error) {
            console.error('Error deleting sale:', error);
            showNotification('Error deleting sale', 'error');
        }
    }

    // Close modals
    function closeModals() {
        saleModal.style.display = 'none';
        deleteSaleModal.style.display = 'none';
        editingSaleId = null;
        saleForm.reset();
        setDefaultDate();
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
