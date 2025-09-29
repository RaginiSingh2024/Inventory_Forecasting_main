// Products management functionality
document.addEventListener('DOMContentLoaded', function() {
    let products = [];
    let editingProductId = null;

    // DOM elements
    const addProductBtn = document.getElementById('addProductBtn');
    const productModal = document.getElementById('productModal');
    const deleteModal = document.getElementById('deleteModal');
    const productForm = document.getElementById('productForm');
    const productsTableBody = document.getElementById('productsTableBody');
    const searchInput = document.getElementById('searchProducts');
    const categoryFilter = document.getElementById('categoryFilter');
    const stockFilter = document.getElementById('stockFilter');

    // Modal elements
    const modalTitle = document.getElementById('modalTitle');
    const submitBtnText = document.getElementById('submitBtnText');
    const closeBtns = document.querySelectorAll('.close');
    const cancelBtn = document.getElementById('cancelBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    // Initialize
    init();

    async function init() {
        setupEventListeners();
        await loadProducts();
    }

    function setupEventListeners() {
        // Add product button
        addProductBtn.addEventListener('click', () => openProductModal());

        // Form submission
        productForm.addEventListener('submit', handleFormSubmit);

        // Modal close buttons
        closeBtns.forEach(btn => {
            btn.addEventListener('click', closeModals);
        });

        cancelBtn.addEventListener('click', closeModals);
        cancelDeleteBtn.addEventListener('click', closeModals);
        confirmDeleteBtn.addEventListener('click', handleDeleteConfirm);

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target === productModal || e.target === deleteModal) {
                closeModals();
            }
        });

        // Search and filters
        searchInput.addEventListener('input', filterProducts);
        categoryFilter.addEventListener('change', filterProducts);
        stockFilter.addEventListener('change', filterProducts);
        
        // Category selection handler for "Other" option
        document.addEventListener('change', function(e) {
            if (e.target && e.target.id === 'productCategory') {
                handleCategoryChange();
            }
        });
    }

    // Handle category selection change
    function handleCategoryChange() {
        console.log('Category changed!');
        const categorySelect = document.getElementById('productCategory');
        const customCategoryGroup = document.getElementById('customCategoryGroup');
        const customCategoryInput = document.getElementById('customCategory');
        
        console.log('Category value:', categorySelect.value);
        
        if (categorySelect.value === 'Other') {
            console.log('Showing custom category input');
            customCategoryGroup.style.display = 'block';
            customCategoryInput.required = true;
            customCategoryInput.focus();
        } else {
            console.log('Hiding custom category input');
            customCategoryGroup.style.display = 'none';
            customCategoryInput.required = false;
            customCategoryInput.value = '';
        }
    }

    // Load products from database
    async function loadProducts() {
        try {
            // Check if user context and database are available
            if (!window.userContext || !window.db) {
                console.warn('User context or database not available, showing empty products list');
                products = [];
                renderProducts(products);
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

            // Get user-specific products collection
            const userProductsCollection = window.userContext.getUserCollection('products');
            const snapshot = await userProductsCollection.orderBy('name').get();
            products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderProducts(products);
        } catch (error) {
            console.error('Error loading products:', error);
            showNotification('Error loading products. Please check your database connection.', 'error');
            // Show empty products list on error
            products = [];
            renderProducts(products);
        }
    }

    // Render products table
    function renderProducts(productsToRender) {
        if (productsToRender.length === 0) {
            productsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">No products found</td>
                </tr>
            `;
            return;
        }

        productsTableBody.innerHTML = productsToRender.map(product => {
            const stockStatus = getStockStatus(product);
            const statusClass = stockStatus === 'Low Stock' ? 'low-stock' : 
                               stockStatus === 'High Stock' ? 'high-stock' : 'normal-stock';

            return `
                <tr>
                    <td>${product.name}</td>
                    <td>${product.category}</td>
                    <td>₹${product.price.toFixed(2)}</td>
                    <td>${product.stock}</td>
                    <td>${product.reorderLevel}</td>
                    <td><span class="status-badge ${statusClass}">${stockStatus}</span></td>
                    <td>
                        <button class="action-btn edit" onclick="editProduct('${product.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="action-btn delete" onclick="deleteProduct('${product.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Get stock status
    function getStockStatus(product) {
        if (product.stock <= product.reorderLevel) {
            return 'Low Stock';
        } else if (product.stock > product.reorderLevel * 3) {
            return 'High Stock';
        } else {
            return 'Normal Stock';
        }
    }

    // Filter products
    function filterProducts() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedCategory = categoryFilter.value;
        const selectedStockFilter = stockFilter.value;

        let filteredProducts = products.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
                                product.category.toLowerCase().includes(searchTerm);
            
            const matchesCategory = !selectedCategory || product.category === selectedCategory;
            
            let matchesStock = true;
            if (selectedStockFilter === 'low') {
                matchesStock = product.stock <= product.reorderLevel;
            } else if (selectedStockFilter === 'normal') {
                matchesStock = product.stock > product.reorderLevel && product.stock <= product.reorderLevel * 3;
            } else if (selectedStockFilter === 'high') {
                matchesStock = product.stock > product.reorderLevel * 3;
            }

            return matchesSearch && matchesCategory && matchesStock;
        });

        renderProducts(filteredProducts);
    }

    // Open product modal
    function openProductModal(productId = null) {
        editingProductId = productId;
        
        if (productId) {
            // Edit mode
            const product = products.find(p => p.id === productId);
            if (product) {
                modalTitle.textContent = 'Edit Product';
                submitBtnText.textContent = 'Update Product';
                fillForm(product);
            }
        } else {
            // Add mode
            modalTitle.textContent = 'Add Product';
            submitBtnText.textContent = 'Add Product';
            productForm.reset();
        }

        productModal.style.display = 'block';
        document.getElementById('productName').focus();
        
        // Set up category change listener after modal is shown
        setTimeout(() => {
            const productCategorySelect = document.getElementById('productCategory');
            if (productCategorySelect) {
                productCategorySelect.removeEventListener('change', handleCategoryChange);
                productCategorySelect.addEventListener('change', handleCategoryChange);
            }
        }, 100);
    }

    // Fill form with product data
    function fillForm(product) {
        document.getElementById('productName').value = product.name;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productStock').value = product.stock;
        document.getElementById('reorderLevel').value = product.reorderLevel;
        document.getElementById('productDescription').value = product.description || '';
    }

    // Handle form submission
    async function handleFormSubmit(e) {
        e.preventDefault();

        // Get category value (use custom category if "Other" is selected)
        const categorySelect = document.getElementById('productCategory');
        const customCategoryInput = document.getElementById('customCategory');
        let categoryValue = categorySelect.value;
        
        if (categoryValue === 'Other' && customCategoryInput.value.trim()) {
            categoryValue = customCategoryInput.value.trim();
        }

        const formData = {
            name: document.getElementById('productName').value.trim(),
            category: categoryValue,
            price: parseFloat(document.getElementById('productPrice').value),
            stock: parseInt(document.getElementById('productStock').value),
            reorderLevel: parseInt(document.getElementById('reorderLevel').value),
            description: document.getElementById('productDescription').value.trim(),
            updatedAt: new Date()
        };

        // Validation
        if (!formData.name || !formData.category || formData.price < 0 || formData.stock < 0 || formData.reorderLevel < 0) {
            showNotification('Please fill all required fields with valid values', 'error');
            return;
        }

        // Additional validation for custom category
        if (categorySelect.value === 'Other' && !customCategoryInput.value.trim()) {
            showNotification('Please enter a custom category name', 'error');
            return;
        }

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

            // Get user-specific products collection
            const userProductsCollection = window.userContext.getUserCollection('products');

            if (editingProductId) {
                // Update existing product
                await userProductsCollection.doc(editingProductId).update(formData);
                showNotification('Product updated successfully', 'success');
            } else {
                // Add new product
                formData.createdAt = new Date();
                formData.userId = window.userContext.getCurrentUserId(); // Add user ID for reference
                await userProductsCollection.add(formData);
                showNotification('Product added successfully', 'success');
            }

            closeModals();
            await loadProducts();
        } catch (error) {
            console.error('Error saving product:', error);
            showNotification('Error saving product. Please check your database connection.', 'error');
        }
    }

    // Edit product
    window.editProduct = function(productId) {
        openProductModal(productId);
    };

    // Delete product
    window.deleteProduct = function(productId) {
        editingProductId = productId;
        deleteModal.style.display = 'block';
    };

    // Handle delete confirmation
    async function handleDeleteConfirm() {
        if (!editingProductId) return;

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

            // Get user-specific products collection
            const userProductsCollection = window.userContext.getUserCollection('products');
            await userProductsCollection.doc(editingProductId).delete();
            
            showNotification('Product deleted successfully', 'success');
            closeModals();
            await loadProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            showNotification('Error deleting product. Please check your database connection.', 'error');
        }
    }

    // Close modals
    function closeModals() {
        productModal.style.display = 'none';
        deleteModal.style.display = 'none';
        editingProductId = null;
        productForm.reset();
        
        // Reset custom category field
        const customCategoryGroup = document.getElementById('customCategoryGroup');
        const customCategoryInput = document.getElementById('customCategory');
        if (customCategoryGroup && customCategoryInput) {
            customCategoryGroup.style.display = 'none';
            customCategoryInput.required = false;
            customCategoryInput.value = '';
        }
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
        }, 5000);
    }
});
