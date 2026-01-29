const fs = require('fs');

// Read the frontend file
let content = fs.readFileSync('public/modern.html', 'utf8');

// Add pagination controls after the products header
const oldProductsHeader = `<h2>📦 Products</h2>
                <div class="products-summary" id="productsSummary">Found 0 products</div>`;

const newProductsHeader = `<h2>📦 Products</h2>
                <div class="products-summary" id="productsSummary">Found 0 products</div>
                <div class="pagination-controls">
                    <button id="selectAllBtn" class="btn btn-primary" onclick="selectAllProducts()">Select All Products</button>
                    <button id="selectPageBtn" class="btn btn-secondary" onclick="selectPageProducts()">Select Page Only</button>
                    <div class="pagination-info">
                        <span id="paginationInfo">Page 1 of 1</span>
                        <button id="prevPageBtn" class="btn btn-small" onclick="changePage(-1)" disabled>← Previous</button>
                        <button id="nextPageBtn" class="btn btn-small" onclick="changePage(1)" disabled>Next →</button>
                    </div>
                </div>`;

content = content.replace(oldProductsHeader, newProductsHeader);

// Add CSS for pagination controls
const oldCSS = `.products-summary {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 20px;
        }`;

const newCSS = `.products-summary {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 20px;
        }
        
        .pagination-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding: 15px;
            background: #f1f5f9;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        
        .pagination-info {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .btn-small {
            padding: 6px 12px;
            font-size: 12px;
        }
        
        .btn-small:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }`;

content = content.replace(oldCSS, newCSS);

// Add JavaScript variables for pagination
const oldJSVars = `        let currentProducts = [];
        let selectedProducts = new Set();`;

const newJSVars = `        let currentProducts = [];
        let selectedProducts = new Set();
        let allFilteredProducts = [];
        let currentPage = 1;
        let totalPages = 1;
        let totalProducts = 0;`;

content = content.replace(oldJSVars, newJSVars);

// Update the searchProducts function to handle pagination
const oldSearchProducts = `        async function searchProducts() {
            const status = document.getElementById('status').value;
            const type = document.getElementById('type').value;
            const vendor = document.getElementById('vendor').value;
            const metafield = document.getElementById('metafield').value;
            const metafieldValue = document.getElementById('metafieldValue').value;
            const imageCount = document.getElementById('imageCount').value;
            const fileType = document.getElementById('fileType').value;
            const minWidth = document.getElementById('minWidth').value;
            const minHeight = document.getElementById('minHeight').value;
            
            try {
                const params = new URLSearchParams({
                    status,
                    type,
                    vendor,
                    metafield,
                    metafieldValue,
                    imageCount,
                    fileType,
                    minWidth,
                    minHeight,
                    page: 1,
                    limit: 1000
                });
                
                const response = await fetch(\`/api/all-products?\${params.toString()}\`);
                const data = await response.json();
                
                if (data.products !== undefined) {
                    currentProducts = data.products;
                    document.getElementById('productsSummary').textContent = \`Found \${data.total} products\`;
                    displayProducts();
                } else {
                    console.error('❌ Invalid response format:', data);
                }
            } catch (error) {
                console.error('❌ Error loading products:', error);
            }
        }`;

const newSearchProducts = `        async function searchProducts(page = 1) {
            const status = document.getElementById('status').value;
            const type = document.getElementById('type').value;
            const vendor = document.getElementById('vendor').value;
            const metafield = document.getElementById('metafield').value;
            const metafieldValue = document.getElementById('metafieldValue').value;
            const imageCount = document.getElementById('imageCount').value;
            const fileType = document.getElementById('fileType').value;
            const minWidth = document.getElementById('minWidth').value;
            const minHeight = document.getElementById('minHeight').value;
            
            try {
                const params = new URLSearchParams({
                    status,
                    type,
                    vendor,
                    metafield,
                    metafieldValue,
                    imageCount,
                    fileType,
                    minWidth,
                    minHeight,
                    page: page.toString(),
                    limit: '250'
                });
                
                const response = await fetch(\`/api/all-products?\${params.toString()}\`);
                const data = await response.json();
                
                if (data.products !== undefined) {
                    currentProducts = data.products;
                    allFilteredProducts = data.products; // Store all products for "Select All"
                    currentPage = data.page;
                    totalPages = data.totalPages;
                    totalProducts = data.total;
                    
                    document.getElementById('productsSummary').textContent = \`Found \${data.total} products (Page \${data.page} of \${data.totalPages})\`;
                    document.getElementById('paginationInfo').textContent = \`Page \${data.page} of \${data.totalPages}\`;
                    
                    // Update pagination buttons
                    document.getElementById('prevPageBtn').disabled = currentPage <= 1;
                    document.getElementById('nextPageBtn').disabled = currentPage >= totalPages;
                    
                    displayProducts();
                } else {
                    console.error('❌ Invalid response format:', data);
                }
            } catch (error) {
                console.error('❌ Error loading products:', error);
            }
        }`;

content = content.replace(oldSearchProducts, newSearchProducts);

// Add new functions for pagination and select all
const oldFunctions = `        function toggleProductSelection(productId) {
            if (selectedProducts.has(productId)) {
                selectedProducts.delete(productId);
            } else {
                selectedProducts.add(productId);
            }
            displayProducts();
        }`;

const newFunctions = `        function toggleProductSelection(productId) {
            if (selectedProducts.has(productId)) {
                selectedProducts.delete(productId);
            } else {
                selectedProducts.add(productId);
            }
            displayProducts();
        }
        
        function changePage(direction) {
            const newPage = currentPage + direction;
            if (newPage >= 1 && newPage <= totalPages) {
                searchProducts(newPage);
            }
        }
        
        function selectAllProducts() {
            // Select all products across all pages
            selectedProducts.clear();
            // We need to fetch all products to select them all
            fetchAllProductsForSelection();
        }
        
        function selectPageProducts() {
            // Select only products on current page
            selectedProducts.clear();
            currentProducts.forEach(product => {
                selectedProducts.add(product.id);
            });
            displayProducts();
        }
        
        async function fetchAllProductsForSelection() {
            const status = document.getElementById('status').value;
            const type = document.getElementById('type').value;
            const vendor = document.getElementById('vendor').value;
            const metafield = document.getElementById('metafield').value;
            const metafieldValue = document.getElementById('metafieldValue').value;
            const imageCount = document.getElementById('imageCount').value;
            const fileType = document.getElementById('fileType').value;
            const minWidth = document.getElementById('minWidth').value;
            const minHeight = document.getElementById('minHeight').value;
            
            try {
                const params = new URLSearchParams({
                    status,
                    type,
                    vendor,
                    metafield,
                    metafieldValue,
                    imageCount,
                    fileType,
                    minWidth,
                    minHeight,
                    page: '1',
                    limit: '10000' // Get all products
                });
                
                const response = await fetch(\`/api/all-products?\${params.toString()}\`);
                const data = await response.json();
                
                if (data.products !== undefined) {
                    // Select all products
                    data.products.forEach(product => {
                        selectedProducts.add(product.id);
                    });
                    displayProducts();
                    console.log(\`✅ Selected all \${data.products.length} products\`);
                }
            } catch (error) {
                console.error('❌ Error fetching all products:', error);
            }
        }`;

content = content.replace(oldFunctions, newFunctions);

// Write back to file
fs.writeFileSync('public/modern.html', content);

console.log('✅ Added pagination and Select All functionality');
