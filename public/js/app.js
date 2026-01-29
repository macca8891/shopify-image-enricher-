// Global application state
let currentShop = null;
let currentPage = 1;
let selectedProductIds = new Set();
let isProcessing = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    log('🚀 Shopify Image Enricher loaded successfully!', 'success');
    
    // Get shop from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    currentShop = urlParams.get('shop');
    
    if (!currentShop) {
        log('⚠️ No shop parameter found in URL - using demo mode', 'warning');
        currentShop = 'demo-shop.myshopify.com'; // Use demo shop for testing
    }
    
    // Initialize the app
    initializeApp();
    setupEventListeners();
    
    // Load initial data
    verifyAuthentication();
    loadDashboardData();
});

// Initialize application
function initializeApp() {
    log(`🏪 Initializing for shop: ${currentShop}`, 'info');
    
    // Setup confidence threshold display
    const confidenceSlider = document.getElementById('confidenceThreshold');
    const confidenceValue = document.getElementById('confidenceValue');
    
    if (confidenceSlider && confidenceValue) {
        confidenceSlider.addEventListener('input', function() {
            confidenceValue.textContent = this.value;
        });
    }
    
    // Initialize pipeline settings
    initializePipelineSettings();
}

// Setup event listeners
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
    
    // Modal close
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeProductModal();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeProductModal();
        }
    });
}

// Tab switching
function switchTab(tabName) {
    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    
    // Load tab-specific data
    switch (tabName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'products':
            loadProducts();
            break;
        case 'bulk':
            loadPipelineSettings();
            break;
        case 'settings':
            loadSettings();
            break;
    }
    
    log(`📋 Switched to ${tabName} tab`, 'info');
}

// Authentication verification
async function verifyAuthentication() {
    try {
        // Skip authentication for demo mode
        if (currentShop === 'demo-shop.myshopify.com') {
            log('🎭 Running in demo mode - skipping authentication', 'info');
            updateShopInfo({
                name: 'Demo Shop',
                plan: 'Free',
                usage: { totalAPICallsThisMonth: 0 },
                remainingAPICalls: 100
            });
            return;
        }
        
        const response = await fetch(`/api/auth/verify?shop=${currentShop}`);
        const data = await response.json();
        
        if (data.authenticated) {
            log(`✅ Authentication verified for ${data.shop.name}`, 'success');
            updateShopInfo(data.shop);
        } else {
            log('❌ Authentication failed', 'error');
            // Redirect to OAuth
            window.location.href = `/api/auth/shopify?shop=${currentShop}`;
        }
    } catch (error) {
        log(`❌ Authentication error: ${error.message}`, 'error');
    }
}

// Update shop information in header
function updateShopInfo(shop) {
    document.getElementById('shopName').textContent = shop.name || shop.domain;
    document.getElementById('shopPlan').textContent = shop.plan || 'Free';
    document.getElementById('apiUsage').textContent = `${shop.usage?.totalAPICallsThisMonth || 0}/${shop.remainingAPICalls + (shop.usage?.totalAPICallsThisMonth || 0)}`;
}

// Dashboard functions
async function loadDashboardData() {
    try {
        // Use demo data for demo mode
        if (currentShop === 'demo-shop.myshopify.com') {
            log('📊 Loading demo dashboard data', 'info');
            document.getElementById('totalProducts').textContent = '25';
            document.getElementById('withImages').textContent = '18';
            document.getElementById('completedProducts').textContent = '12';
            document.getElementById('pendingProducts').textContent = '13';
            return;
        }
        
        const response = await fetch(`/api/products/stats/overview?shop=${currentShop}`);
        const stats = await response.json();
        
        document.getElementById('totalProducts').textContent = stats.totalProducts || 0;
        document.getElementById('withImages').textContent = stats.withOriginalImages || 0;
        document.getElementById('completedProducts').textContent = stats.completed || 0;
        document.getElementById('pendingProducts').textContent = stats.pending || 0;
        
        log('📊 Dashboard data loaded', 'info');
    } catch (error) {
        log(`❌ Failed to load dashboard data: ${error.message}`, 'error');
    }
}

async function refreshStats() {
    log('🔄 Refreshing statistics...', 'info');
    await loadDashboardData();
    log('✅ Statistics refreshed', 'success');
}

// Product functions
async function loadProducts(page = 1) {
    try {
        // Demo mode - show demo products
        if (currentShop === 'demo-shop.myshopify.com') {
            log('📦 Loading demo products', 'info');
            const demoProducts = [
                {
                    _id: 'demo1',
                    title: 'Wireless Bluetooth Headphones',
                    vendor: 'TechBrand',
                    originalImages: [
                        { url: 'https://via.placeholder.com/300x300/4f46e5/ffffff?text=Headphones', altText: 'Wireless Headphones' }
                    ],
                    discoveredImages: [],
                    selectedImages: [],
                    imageEnrichment: { status: 'pending' }
                },
                {
                    _id: 'demo2',
                    title: 'Smart Fitness Watch',
                    vendor: 'FitTech',
                    originalImages: [
                        { url: 'https://via.placeholder.com/300x300/059669/ffffff?text=Watch', altText: 'Smart Watch' }
                    ],
                    discoveredImages: [],
                    selectedImages: [],
                    imageEnrichment: { status: 'completed' }
                },
                {
                    _id: 'demo3',
                    title: 'Portable Phone Charger',
                    vendor: 'PowerUp',
                    originalImages: [],
                    discoveredImages: [
                        { url: 'https://via.placeholder.com/300x300/dc2626/ffffff?text=Charger', altText: 'Phone Charger' }
                    ],
                    selectedImages: [],
                    imageEnrichment: { status: 'analyzing' }
                }
            ];
            
            renderProducts(demoProducts);
            renderPagination({ page: 1, pages: 1, hasPrev: false, hasNext: false });
            return;
        }
        
        const searchTerm = document.getElementById('productSearch')?.value || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const imageFilter = document.getElementById('imageFilter')?.value || '';
        
        const params = new URLSearchParams({
            shop: currentShop,
            page: page,
            limit: 20
        });
        
        if (searchTerm) params.append('search', searchTerm);
        if (statusFilter) params.append('status', statusFilter);
        if (imageFilter) params.append('hasImages', imageFilter);
        
        const response = await fetch(`/api/products?${params}`);
        const data = await response.json();
        
        renderProducts(data.products);
        renderPagination(data.pagination);
        
        currentPage = page;
        log(`📦 Loaded ${data.products.length} products`, 'info');
    } catch (error) {
        log(`❌ Failed to load products: ${error.message}`, 'error');
    }
}

function renderProducts(products) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    grid.innerHTML = products.map(product => `
        <div class="product-card" onclick="openProductModal('${product._id}')">
            <div class="product-header">
                <div>
                    <div class="product-title">${product.title}</div>
                    <div class="product-vendor">${product.vendor || 'Unknown Vendor'}</div>
                </div>
                <div class="status-badge status-${product.imageEnrichment?.status || 'pending'}">
                    ${product.imageEnrichment?.status || 'pending'}
                </div>
            </div>
            
            <div class="product-images">
                ${(product.originalImages || []).slice(0, 4).map(img => 
                    `<img src="${img.url}" alt="${img.altText}" class="product-image" onerror="this.style.display='none'">`
                ).join('')}
                ${(product.originalImages || []).length > 4 ? 
                    `<div class="product-image" style="display: flex; align-items: center; justify-content: center; background: #f3f4f6; color: #6b7280; font-size: 0.75rem;">+${(product.originalImages || []).length - 4}</div>` 
                    : ''
                }
            </div>
            
            <div class="product-stats">
                <span>📸 Original: ${(product.originalImages || []).length}</span>
                <span>🔍 Found: ${(product.discoveredImages || []).length}</span>
                <span>✅ Selected: ${(product.selectedImages || []).length}</span>
            </div>
            
            <div class="product-actions" onclick="event.stopPropagation()">
                <button class="btn btn-primary btn-sm" onclick="processProduct('${product._id}')">
                    🚀 Process
                </button>
                <button class="btn btn-secondary btn-sm" onclick="analyzeProduct('${product._id}')">
                    🔍 Analyze
                </button>
                <button class="btn btn-secondary btn-sm" onclick="searchImages('${product._id}')">
                    🖼️ Search
                </button>
                <label style="display: flex; align-items: center; gap: 0.25rem; cursor: pointer;">
                    <input type="checkbox" onchange="toggleProductSelection('${product._id}', this.checked)">
                    Select
                </label>
            </div>
        </div>
    `).join('');
}

function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    if (!container) return;
    
    const { page, pages, hasPrev, hasNext } = pagination;
    
    container.innerHTML = `
        <button ${!hasPrev ? 'disabled' : ''} onclick="loadProducts(${page - 1})">Previous</button>
        <span>Page ${page} of ${pages}</span>
        <button ${!hasNext ? 'disabled' : ''} onclick="loadProducts(${page + 1})">Next</button>
    `;
}

function searchProducts() {
    loadProducts(1);
}

function filterProducts() {
    loadProducts(1);
}

// Product processing functions
async function processProduct(productId) {
    if (isProcessing) {
        log('⚠️ Another process is already running', 'warning');
        return;
    }
    
    isProcessing = true;
    log(`🚀 Starting complete processing for product...`, 'info');
    
    try {
        // Demo mode - simulate processing
        if (currentShop === 'demo-shop.myshopify.com') {
            log('🎭 Demo mode: Simulating product processing...', 'info');
            await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate delay
            log('✅ Demo processing completed successfully', 'success');
            loadProducts(currentPage);
            isProcessing = false;
            return;
        }
        
        const response = await fetch(`/api/images/process/${productId}?shop=${currentShop}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                analyze: true,
                search: true,
                autoSelect: false,
                maxImages: 5
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            log(`✅ Product processing completed successfully`, 'success');
            loadProducts(currentPage);
        } else {
            log(`❌ Product processing failed`, 'error');
        }
    } catch (error) {
        log(`❌ Processing error: ${error.message}`, 'error');
    } finally {
        isProcessing = false;
    }
}

async function analyzeProduct(productId) {
    log(`🔍 Analyzing product images...`, 'info');
    
    try {
        const response = await fetch(`/api/images/analyze/${productId}?shop=${currentShop}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            log(`✅ Image analysis completed: ${result.totalAnalyzed} images analyzed`, 'success');
            loadProducts(currentPage);
        } else {
            log(`❌ Image analysis failed`, 'error');
        }
    } catch (error) {
        log(`❌ Analysis error: ${error.message}`, 'error');
    }
}

async function searchImages(productId) {
    log(`🔍 Searching for product images...`, 'info');
    
    try {
        const response = await fetch(`/api/images/search/${productId}?shop=${currentShop}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            log(`✅ Image search completed: ${result.totalFound} images found`, 'success');
            loadProducts(currentPage);
        } else {
            log(`❌ Image search failed`, 'error');
        }
    } catch (error) {
        log(`❌ Search error: ${error.message}`, 'error');
    }
}

// Product modal functions
async function openProductModal(productId) {
    try {
        const response = await fetch(`/api/products/${productId}?shop=${currentShop}`);
        const product = await response.json();
        
        document.getElementById('modalProductTitle').textContent = product.title;
        document.getElementById('modalProductBody').innerHTML = renderProductDetails(product);
        document.getElementById('productModal').classList.add('active');
        
        log(`👁️ Opened product details: ${product.title}`, 'info');
    } catch (error) {
        log(`❌ Failed to load product details: ${error.message}`, 'error');
    }
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

function renderProductDetails(product) {
    return `
        <div class="product-details">
            <div class="detail-section">
                <h3>Product Information</h3>
                <p><strong>Vendor:</strong> ${product.vendor || 'N/A'}</p>
                <p><strong>Type:</strong> ${product.productType || 'N/A'}</p>
                <p><strong>Tags:</strong> ${(product.tags || []).join(', ') || 'None'}</p>
                <p><strong>Status:</strong> ${product.imageEnrichment?.status || 'pending'}</p>
            </div>
            
            <div class="detail-section">
                <h3>Image Summary</h3>
                <p><strong>Original Images:</strong> ${(product.originalImages || []).length}</p>
                <p><strong>Discovered Images:</strong> ${(product.discoveredImages || []).length}</p>
                <p><strong>Selected Images:</strong> ${(product.selectedImages || []).length}</p>
            </div>
            
            ${product.originalImages && product.originalImages.length > 0 ? `
            <div class="detail-section">
                <h3>Original Images</h3>
                <div class="image-grid">
                    ${product.originalImages.map(img => `
                        <div class="image-item">
                            <img src="${img.url}" alt="${img.altText}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 0.5rem;">
                            ${img.analysisData ? `
                                <div class="image-analysis">
                                    <p><strong>Labels:</strong> ${(img.analysisData.labels || []).slice(0, 3).map(l => l.description).join(', ')}</p>
                                    ${img.analysisData.suitability ? `<p><strong>Suitability:</strong> ${img.analysisData.suitability.score}/100</p>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            ${product.discoveredImages && product.discoveredImages.length > 0 ? `
            <div class="detail-section">
                <h3>Discovered Images</h3>
                <div class="image-grid">
                    ${product.discoveredImages.slice(0, 10).map(img => `
                        <div class="image-item">
                            <img src="${img.url}" alt="${img.title}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 0.5rem;">
                            <p style="font-size: 0.75rem; margin-top: 0.25rem;">${img.searchTerm}</p>
                            <button class="btn btn-sm btn-secondary" onclick="selectImage('${product._id}', '${img.url}')">
                                ${img.isSelected ? '✅ Selected' : '📌 Select'}
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            <div class="detail-actions">
                <button class="btn btn-primary" onclick="processProduct('${product._id}'); closeProductModal();">
                    🚀 Process Product
                </button>
                <button class="btn btn-secondary" onclick="closeProductModal()">
                    Close
                </button>
            </div>
        </div>
        
        <style>
            .product-details { }
            .detail-section { margin-bottom: 1.5rem; }
            .detail-section h3 { margin-bottom: 0.5rem; color: #374151; }
            .image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 1rem; margin-top: 0.5rem; }
            .image-item { text-align: center; }
            .image-analysis { font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem; }
            .detail-actions { display: flex; gap: 1rem; margin-top: 2rem; }
        </style>
    `;
}

async function selectImage(productId, imageUrl) {
    try {
        const response = await fetch(`/api/images/select/${productId}?shop=${currentShop}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrls: [imageUrl] })
        });
        
        const result = await response.json();
        
        if (result.success) {
            log(`✅ Image selected successfully`, 'success');
            // Refresh the modal
            openProductModal(productId);
        } else {
            log(`❌ Failed to select image`, 'error');
        }
    } catch (error) {
        log(`❌ Select image error: ${error.message}`, 'error');
    }
}

// Bulk processing functions
function loadBulkData() {
    updateSelectedProductsDisplay();
}

function toggleProductSelection(productId, selected) {
    if (selected) {
        selectedProductIds.add(productId);
    } else {
        selectedProductIds.delete(productId);
    }
    updateSelectedProductsDisplay();
}

function updateSelectedProductsDisplay() {
    const container = document.getElementById('selectedProducts');
    if (!container) return;
    
    container.querySelector('h3').textContent = `Selected Products (${selectedProductIds.size})`;
}

function selectAllProducts() {
    // This would need to be implemented to select all visible products
    log('📋 Select all products functionality needs implementation', 'warning');
}

function selectPendingProducts() {
    // This would need to be implemented to select only pending products
    log('⏳ Select pending products functionality needs implementation', 'warning');
}

async function startBulkProcessing() {
    if (selectedProductIds.size === 0) {
        log('⚠️ No products selected for bulk processing', 'warning');
        return;
    }
    
    if (isProcessing) {
        log('⚠️ Bulk processing already in progress', 'warning');
        return;
    }
    
    isProcessing = true;
    const progressContainer = document.getElementById('bulkProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    progressContainer.style.display = 'block';
    
    log(`🔄 Starting bulk processing for ${selectedProductIds.size} products`, 'info');
    
    try {
        const options = {
            analyze: document.getElementById('bulkAnalyze').checked,
            search: document.getElementById('bulkSearch').checked,
            autoSelect: document.getElementById('bulkAutoSelect').checked,
            maxImages: parseInt(document.getElementById('bulkMaxImages').value)
        };
        
        const response = await fetch(`/api/images/batch-process?shop=${currentShop}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productIds: Array.from(selectedProductIds),
                options
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            log(`✅ Bulk processing completed: ${result.successful}/${result.total} successful`, 'success');
            selectedProductIds.clear();
            updateSelectedProductsDisplay();
            loadProducts(currentPage);
        } else {
            log(`❌ Bulk processing failed`, 'error');
        }
        
        progressFill.style.width = '100%';
        progressText.textContent = `${result.total} / ${result.total} products processed`;
        
    } catch (error) {
        log(`❌ Bulk processing error: ${error.message}`, 'error');
    } finally {
        isProcessing = false;
        setTimeout(() => {
            progressContainer.style.display = 'none';
            progressFill.style.width = '0%';
        }, 2000);
    }
}

// Import and processing functions
async function importProducts() {
    log('📥 Starting product import from Shopify...', 'info');
    
    try {
        // Demo mode - simulate import
        if (currentShop === 'demo-shop.myshopify.com') {
            log('🎭 Demo mode: Simulating product import...', 'info');
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
            log('✅ Demo import completed: 25 products imported', 'success');
            loadDashboardData();
            return;
        }
        
        const response = await fetch(`/api/products/import?shop=${currentShop}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ limit: 50 })
        });
        
        const result = await response.json();
        
        if (result.success) {
            log(`✅ Import completed: ${result.imported} new, ${result.updated} updated`, 'success');
            loadDashboardData();
            if (document.getElementById('products').classList.contains('active')) {
                loadProducts(currentPage);
            }
        } else {
            log(`❌ Import failed`, 'error');
        }
    } catch (error) {
        log(`❌ Import error: ${error.message}`, 'error');
    }
}

async function processAllPending() {
    log('🚀 Processing all pending products...', 'info');
    
    try {
        // First, get all pending products
        const response = await fetch(`/api/products?shop=${currentShop}&status=pending&limit=100`);
        const data = await response.json();
        
        if (data.products.length === 0) {
            log('ℹ️ No pending products found', 'info');
            return;
        }
        
        const productIds = data.products.map(p => p._id);
        selectedProductIds = new Set(productIds);
        
        // Switch to bulk tab and start processing
        switchTab('bulk');
        await startBulkProcessing();
        
    } catch (error) {
        log(`❌ Process all pending error: ${error.message}`, 'error');
    }
}

// Settings functions
async function loadSettings() {
    try {
        const response = await fetch(`/api/auth/shop?shop=${currentShop}`);
        const shop = await response.json();
        
        if (shop.settings) {
            updateSettingsForm(shop.settings);
        }
        
        log('⚙️ Settings loaded', 'info');
    } catch (error) {
        log(`❌ Failed to load settings: ${error.message}`, 'error');
    }
}

function updateSettingsForm(settings) {
    // Image search settings
    if (settings.imageSearch) {
        document.getElementById('searchEnabled').checked = settings.imageSearch.enabled;
        document.getElementById('maxResults').value = settings.imageSearch.maxResults;
        document.getElementById('safeSearch').value = settings.imageSearch.safeSearch;
        document.getElementById('minWidth').value = settings.imageSearch.minWidth;
        document.getElementById('minHeight').value = settings.imageSearch.minHeight;
    }
    
    // AI analysis settings
    if (settings.aiAnalysis) {
        document.getElementById('analysisEnabled').checked = settings.aiAnalysis.enabled;
        document.getElementById('detectLabels').checked = settings.aiAnalysis.detectLabels;
        document.getElementById('detectText').checked = settings.aiAnalysis.detectText;
        document.getElementById('detectColors').checked = settings.aiAnalysis.detectColors;
        document.getElementById('safeSearchFilter').checked = settings.aiAnalysis.safeSearchFilter;
        document.getElementById('confidenceThreshold').value = settings.aiAnalysis.confidenceThreshold;
        document.getElementById('confidenceValue').textContent = settings.aiAnalysis.confidenceThreshold;
    }
    
    // Auto-processing settings
    if (settings.autoProcessing) {
        document.getElementById('autoProcessing').checked = settings.autoProcessing.enabled;
        document.getElementById('processNewProducts').checked = settings.autoProcessing.processNewProducts;
        document.getElementById('autoSelectImages').checked = settings.autoProcessing.autoSelectImages;
        document.getElementById('maxImagesPerProduct').value = settings.autoProcessing.maxImagesPerProduct;
    }
}

async function saveSettings() {
    const settings = {
        imageSearch: {
            enabled: document.getElementById('searchEnabled').checked,
            maxResults: parseInt(document.getElementById('maxResults').value),
            safeSearch: document.getElementById('safeSearch').value,
            minWidth: parseInt(document.getElementById('minWidth').value),
            minHeight: parseInt(document.getElementById('minHeight').value)
        },
        aiAnalysis: {
            enabled: document.getElementById('analysisEnabled').checked,
            detectLabels: document.getElementById('detectLabels').checked,
            detectText: document.getElementById('detectText').checked,
            detectColors: document.getElementById('detectColors').checked,
            safeSearchFilter: document.getElementById('safeSearchFilter').checked,
            confidenceThreshold: parseFloat(document.getElementById('confidenceThreshold').value)
        },
        autoProcessing: {
            enabled: document.getElementById('autoProcessing').checked,
            processNewProducts: document.getElementById('processNewProducts').checked,
            autoSelectImages: document.getElementById('autoSelectImages').checked,
            maxImagesPerProduct: parseInt(document.getElementById('maxImagesPerProduct').value)
        }
    };
    
    try {
        const response = await fetch(`/api/auth/shop/settings?shop=${currentShop}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        
        const result = await response.json();
        
        if (result.success) {
            log('💾 Settings saved successfully', 'success');
        } else {
            log('❌ Failed to save settings', 'error');
        }
    } catch (error) {
        log(`❌ Save settings error: ${error.message}`, 'error');
    }
}

function resetSettings() {
    // Reset to default values
    document.getElementById('searchEnabled').checked = true;
    document.getElementById('maxResults').value = 20;
    document.getElementById('safeSearch').value = 'moderate';
    document.getElementById('minWidth').value = 400;
    document.getElementById('minHeight').value = 400;
    
    document.getElementById('analysisEnabled').checked = true;
    document.getElementById('detectLabels').checked = true;
    document.getElementById('detectText').checked = true;
    document.getElementById('detectColors').checked = true;
    document.getElementById('safeSearchFilter').checked = true;
    document.getElementById('confidenceThreshold').value = 0.7;
    document.getElementById('confidenceValue').textContent = '0.7';
    
    document.getElementById('autoProcessing').checked = false;
    document.getElementById('processNewProducts').checked = false;
    document.getElementById('autoSelectImages').checked = false;
    document.getElementById('maxImagesPerProduct').value = 5;
    
    log('🔄 Settings reset to defaults', 'info');
}

// Utility functions
function log(message, type = 'info') {
    const logContent = document.getElementById('logContent');
    if (!logContent) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = document.createElement('div');
    logMessage.className = `log-message ${type}`;
    logMessage.innerHTML = `<strong>[${timestamp}]</strong> ${message}`;
    
    logContent.appendChild(logMessage);
    logContent.scrollTop = logContent.scrollHeight;
    
    // Keep only last 50 messages
    while (logContent.children.length > 50) {
        logContent.removeChild(logContent.firstChild);
    }
}

function clearLog() {
    const logContent = document.getElementById('logContent');
    if (logContent) {
        logContent.innerHTML = '';
    }
}

// Pipeline functions
let currentProcessId = null;
let pipelineInterval = null;

// Initialize pipeline settings
function initializePipelineSettings() {
    // Load watermark opacity and scale value displays
    const watermarkOpacitySlider = document.getElementById('watermarkOpacity');
    const watermarkOpacityValue = document.getElementById('watermarkOpacityValue');
    const watermarkScaleSlider = document.getElementById('watermarkScale');
    const watermarkScaleValue = document.getElementById('watermarkScaleValue');
    
    if (watermarkOpacitySlider && watermarkOpacityValue) {
        watermarkOpacitySlider.addEventListener('input', function() {
            watermarkOpacityValue.textContent = this.value;
        });
    }
    
    if (watermarkScaleSlider && watermarkScaleValue) {
        watermarkScaleSlider.addEventListener('input', function() {
            watermarkScaleValue.textContent = this.value;
        });
    }
    
    // Setup file upload
    const csvFile = document.getElementById('csvFile');
    const uploadArea = document.getElementById('uploadArea');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    
    if (csvFile) {
        csvFile.addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                fileName.textContent = file.name;
                uploadArea.style.display = 'none';
                fileInfo.style.display = 'flex';
            }
        });
    }
    
    // Setup drag and drop
    if (uploadArea) {
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        
        uploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
        });
        
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type === 'text/csv') {
                csvFile.files = files;
                fileName.textContent = files[0].name;
                uploadArea.style.display = 'none';
                fileInfo.style.display = 'flex';
            } else {
                alert('Please upload a CSV file');
            }
        });
    }
}

// Clear uploaded file
function clearFile() {
    const csvFile = document.getElementById('csvFile');
    const uploadArea = document.getElementById('uploadArea');
    const fileInfo = document.getElementById('fileInfo');
    
    csvFile.value = '';
    uploadArea.style.display = 'block';
    fileInfo.style.display = 'none';
}

// Generate sample CSV
async function generateSampleCSV() {
    try {
        log('📋 Generating sample CSV...', 'info');
        
        const response = await fetch(`/api/pipeline/generate-sample-csv?shop=${currentShop}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                includeAll: true
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate sample CSV');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bulk_process_sample.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        log('✅ Sample CSV generated and downloaded', 'success');
        
    } catch (error) {
        log(`❌ Error generating sample CSV: ${error.message}`, 'error');
    }
}

// Start pipeline processing
async function startPipelineProcessing() {
    try {
        const csvFile = document.getElementById('csvFile');
        if (!csvFile.files.length) {
            alert('Please upload a CSV file first');
            return;
        }
        
        const formData = new FormData();
        formData.append('csvFile', csvFile.files[0]);
        
        // Add processing options
        formData.append('dryRun', document.getElementById('dryRun').checked);
        formData.append('limit', document.getElementById('limitRows').value);
        formData.append('concurrency', document.getElementById('concurrency').value);
        formData.append('bgColor', document.getElementById('bgColor').value);
        formData.append('targetSize', document.getElementById('targetSize').value);
        formData.append('watermarkEnabled', document.getElementById('watermarkEnabled').checked);
        formData.append('watermarkText', document.getElementById('watermarkText').value);
        formData.append('watermarkOpacity', document.getElementById('watermarkOpacity').value);
        formData.append('watermarkScale', document.getElementById('watermarkScale').value);
        formData.append('replaceStrategy', document.getElementById('replaceStrategy').value);
        
        log('🚀 Starting pipeline processing...', 'info');
        
        const response = await fetch(`/api/pipeline/bulk-process?shop=${currentShop}`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Failed to start pipeline processing');
        }
        
        const result = await response.json();
        currentProcessId = result.processId;
        
        // Show progress section
        document.getElementById('pipelineProgress').style.display = 'block';
        document.getElementById('pipelineResults').style.display = 'none';
        
        // Start polling for status
        startPipelineStatusPolling();
        
        log(`✅ Pipeline processing started (ID: ${currentProcessId})`, 'success');
        
    } catch (error) {
        log(`❌ Error starting pipeline processing: ${error.message}`, 'error');
    }
}

// Start polling for pipeline status
function startPipelineStatusPolling() {
    if (pipelineInterval) {
        clearInterval(pipelineInterval);
    }
    
    pipelineInterval = setInterval(async () => {
        try {
            const response = await fetch(`/api/pipeline/bulk-process/${currentProcessId}?shop=${currentShop}`);
            const status = await response.json();
            
            updatePipelineProgress(status);
            
            if (status.status === 'completed' || status.status === 'failed') {
                clearInterval(pipelineInterval);
                pipelineInterval = null;
                showPipelineResults(status);
            }
            
        } catch (error) {
            log(`❌ Error checking pipeline status: ${error.message}`, 'error');
        }
    }, 2000); // Poll every 2 seconds
}

// Update pipeline progress
function updatePipelineProgress(status) {
    const progressText = document.getElementById('progressText');
    const progressLog = document.getElementById('progressLog');
    
    if (status.status === 'processing') {
        progressText.textContent = 'Processing...';
        if (status.stdout) {
            progressLog.innerHTML = status.stdout.replace(/\n/g, '<br>');
        }
    } else if (status.status === 'completed') {
        progressText.textContent = `Completed: ${status.processedImages || 0} images processed`;
        if (status.stdout) {
            progressLog.innerHTML = status.stdout.replace(/\n/g, '<br>');
        }
    } else if (status.status === 'failed') {
        progressText.textContent = 'Processing failed';
        if (status.stderr) {
            progressLog.innerHTML = status.stderr.replace(/\n/g, '<br>');
        }
    }
}

// Show pipeline results
function showPipelineResults(results) {
    const resultsSection = document.getElementById('pipelineResults');
    const resultsSummary = document.getElementById('resultsSummary');
    const resultsDetails = document.getElementById('resultsDetails');
    
    resultsSection.style.display = 'block';
    
    // Summary
    let summaryHtml = `
        <div class="result-item">
            <strong>Status:</strong> ${results.success ? '✅ Success' : '❌ Failed'}
        </div>
        <div class="result-item">
            <strong>Images Processed:</strong> ${results.processedImages || 0}
        </div>
        <div class="result-item">
            <strong>Exit Code:</strong> ${results.exitCode}
        </div>
        <div class="result-item">
            <strong>Completed At:</strong> ${new Date(results.completedAt).toLocaleString()}
        </div>
    `;
    
    if (results.outputFiles && results.outputFiles.length > 0) {
        summaryHtml += `
            <div class="result-item">
                <strong>Output Files:</strong> ${results.outputFiles.join(', ')}
            </div>
        `;
    }
    
    resultsSummary.innerHTML = summaryHtml;
    
    // Details
    let detailsHtml = '';
    
    if (results.stdout) {
        detailsHtml += `
            <div class="result-section">
                <h4>Processing Log</h4>
                <pre class="log-output">${results.stdout}</pre>
            </div>
        `;
    }
    
    if (results.stderr) {
        detailsHtml += `
            <div class="result-section">
                <h4>Error Log</h4>
                <pre class="error-output">${results.stderr}</pre>
            </div>
        `;
    }
    
    if (results.errorLog) {
        detailsHtml += `
            <div class="result-section">
                <h4>Error Details</h4>
                <pre class="error-csv">${results.errorLog}</pre>
            </div>
        `;
    }
    
    resultsDetails.innerHTML = detailsHtml;
}

// Load pipeline settings
async function loadPipelineSettings() {
    try {
        const response = await fetch(`/api/pipeline/pipeline-settings?shop=${currentShop}`);
        const data = await response.json();
        
        if (data.success) {
            const settings = data.settings;
            
            // Update form fields
            document.getElementById('pipelineEnabled').checked = settings.enabled;
            document.getElementById('bgColor').value = settings.defaultBgColor;
            document.getElementById('targetSize').value = settings.defaultTargetSize;
            document.getElementById('concurrency').value = settings.defaultConcurrency;
            document.getElementById('replaceStrategy').value = settings.replaceStrategy;
            document.getElementById('watermarkEnabled').checked = settings.watermarkEnabled;
            document.getElementById('watermarkText').value = settings.watermarkText || '';
            document.getElementById('watermarkOpacity').value = settings.watermarkOpacity;
            document.getElementById('watermarkScale').value = settings.watermarkScale;
            
            // Update display values
            document.getElementById('watermarkOpacityValue').textContent = settings.watermarkOpacity;
            document.getElementById('watermarkScaleValue').textContent = settings.watermarkScale;
        }
        
    } catch (error) {
        log(`❌ Error loading pipeline settings: ${error.message}`, 'error');
    }
}

// Save pipeline settings
async function savePipelineSettings() {
    try {
        const settings = {
            enabled: document.getElementById('pipelineEnabled').checked,
            defaultBgColor: document.getElementById('bgColor').value,
            defaultTargetSize: parseInt(document.getElementById('targetSize').value),
            defaultConcurrency: parseInt(document.getElementById('concurrency').value),
            replaceStrategy: document.getElementById('replaceStrategy').value,
            watermarkEnabled: document.getElementById('watermarkEnabled').checked,
            watermarkText: document.getElementById('watermarkText').value,
            watermarkOpacity: parseFloat(document.getElementById('watermarkOpacity').value),
            watermarkScale: parseFloat(document.getElementById('watermarkScale').value)
        };
        
        const response = await fetch(`/api/pipeline/pipeline-settings?shop=${currentShop}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        
        if (!response.ok) {
            throw new Error('Failed to save pipeline settings');
        }
        
        log('✅ Pipeline settings saved', 'success');
        
    } catch (error) {
        log(`❌ Error saving pipeline settings: ${error.message}`, 'error');
    }
}
