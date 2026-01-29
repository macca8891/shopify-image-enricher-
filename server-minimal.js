const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Global progress tracking
let searchProgress = {
  isRunning: false,
  currentBatch: 0,
  totalBatches: 0,
  foundProducts: 0,
  totalProducts: 0,
  startTime: null,
  estimatedCompletion: null
};

// Comprehensive search endpoint that fetches ALL pages
app.get('/api/all-products', async (req, res) => {
  try {
    const { 
      status = 'any', 
      meta_field_key = '',
      meta_field_value = ''
    } = req.query;

    console.log('Starting comprehensive search...');
    
    // Initialize progress tracking
    searchProgress = {
      isRunning: true,
      currentBatch: 0,
      totalBatches: 0,
      foundProducts: 0,
      totalProducts: 0,
      startTime: new Date(),
      estimatedCompletion: null
    };

    let allProducts = [];
    let pageInfo = null;
    let pageCount = 0;

    // Fetch all products across all pages
    do {
      pageCount++;
      console.log(`Fetching page ${pageCount}...`);

      // Build query parameters for this page
      let queryParams = new URLSearchParams({
        limit: '250',
        fields: 'id,title,handle,status,product_type,vendor,created_at,updated_at,images,variants,options,tags'
      });

      // Add pagination
      if (pageInfo) {
        queryParams.append('page_info', pageInfo);
      }

      // Add filters
      if (status !== 'any') {
        queryParams.append('status', status);
      }

      const url = `https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products.json?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.products && data.products.length > 0) {
        allProducts = allProducts.concat(data.products);
        console.log(`Page ${pageCount}: Found ${data.products.length} products (Total: ${allProducts.length})`);
      }

      // Check for next page
      const linkHeader = response.headers.get('link');
      pageInfo = null;
      
      if (linkHeader) {
        console.log(`Link header: ${linkHeader}`);
        const links = linkHeader.split(',');
        links.forEach(link => {
          const [url, rel] = link.split(';');
          const cleanUrl = url.trim().slice(1, -1);
          const cleanRel = rel.trim().replace('rel="', '').replace('"', '');
          
          console.log(`Link: ${cleanUrl}, Rel: ${cleanRel}`);
          
          if (cleanRel === 'next') {
            try {
              const nextPageUrl = new URL(cleanUrl);
              pageInfo = nextPageUrl.searchParams.get('page_info');
              console.log(`Found next page info: ${pageInfo}`);
            } catch (error) {
              console.error(`Error parsing URL: ${cleanUrl}`, error);
            }
          }
        });
      } else {
        console.log('No link header found - this might be the last page');
      }
      
      // Debug: Check if we should continue
      console.log(`Page ${pageCount}: pageInfo = ${pageInfo}, should continue = ${!!pageInfo}`);

      // Safety limit to prevent infinite loops
      if (pageCount > 50) {
        console.log('Reached safety limit of 50 pages');
        break;
      }

    } while (pageInfo);

    console.log(`Total products fetched: ${allProducts.length} across ${pageCount} pages`);
    
    // Now apply filters to all products
    let filteredProducts = allProducts;
    
    // Apply status filter first
    if (status !== 'any') {
      console.log(`Filtering by status: ${status}`);
      const beforeCount = filteredProducts.length;
      filteredProducts = filteredProducts.filter(product => product.status === status);
      console.log(`After status filtering: ${filteredProducts.length} products (was ${beforeCount})`);
    }
    
    // Filter by meta fields using optimized approach
    if (meta_field_key && meta_field_value) {
      console.log(`Filtering by metafield: ${meta_field_key} = ${meta_field_value}`);
      console.log(`Processing ${filteredProducts.length} products using optimized metafield search...`);
      
      // Update progress tracking
      searchProgress.totalProducts = filteredProducts.length;
      searchProgress.totalBatches = 1; // We'll do this in one go
      
      const matchingProducts = [];
      
      try {
        // Get ALL metafields for the specific key we're looking for
        console.log(`Fetching all metafields with key: ${meta_field_key}`);
        
        let allMetafields = [];
        let pageInfo = null;
        let pageCount = 0;
        
        do {
          pageCount++;
          console.log(`Fetching metafields page ${pageCount}...`);
          
          const queryParams = new URLSearchParams({
            'metafield[owner_resource]': 'product',
            'metafield[key]': meta_field_key,
            'limit': '250'
          });
          
          if (pageInfo) {
            queryParams.append('page_info', pageInfo);
          }
          
          const metaResponse = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/metafields.json?${queryParams.toString()}`, {
            headers: {
              'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
              'Content-Type': 'application/json'
            }
          });
          
          if (metaResponse.ok) {
            const metaData = await metaResponse.json();
            const metafields = metaData.metafields || [];
            allMetafields = allMetafields.concat(metafields);
            console.log(`Page ${pageCount}: Found ${metafields.length} metafields (Total: ${allMetafields.length})`);
            
            // Check for next page
            const linkHeader = metaResponse.headers.get('link');
            pageInfo = null;
            
            if (linkHeader) {
              const links = linkHeader.split(',');
              links.forEach(link => {
                const [url, rel] = link.split(';');
                const cleanUrl = url.trim().slice(1, -1);
                const cleanRel = rel.trim().replace('rel="', '').replace('"', '');
                
                if (cleanRel === 'next') {
                  try {
                    const nextPageUrl = new URL(cleanUrl);
                    pageInfo = nextPageUrl.searchParams.get('page_info');
                  } catch (error) {
                    console.error(`Error parsing URL: ${cleanUrl}`, error);
                  }
                }
              });
            }
          } else {
            console.error(`HTTP error fetching metafields page ${pageCount}: ${metaResponse.status}`);
            break;
          }
          
          // Small delay between pages
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } while (pageInfo && pageCount < 20); // Safety limit
        
        console.log(`Total metafields found: ${allMetafields.length}`);
        
        // Now filter metafields by value and find matching products
        const matchingMetafields = allMetafields.filter(field => 
          field.value && 
          field.value.toLowerCase().includes(meta_field_value.toLowerCase())
        );
        
        console.log(`Metafields matching value "${meta_field_value}": ${matchingMetafields.length}`);
        
        // Debug: Log the matching metafields
        matchingMetafields.forEach(field => {
          console.log(`Metafield: owner_id=${field.owner_id}, value="${field.value}"`);
        });
        
        // Create a set of product IDs for faster lookup
        const productIds = new Set(filteredProducts.map(p => p.id.toString()));
        console.log(`Looking for products in set of ${productIds.size} product IDs`);
        
        // Debug: Log some product IDs for comparison
        const sampleProductIds = Array.from(productIds).slice(0, 5);
        console.log(`Sample product IDs: ${sampleProductIds.join(', ')}`);
        
        // Find products that match
        matchingMetafields.forEach(field => {
          console.log(`Checking metafield owner_id ${field.owner_id} against product set...`);
          if (productIds.has(field.owner_id.toString())) {
            const product = filteredProducts.find(p => p.id.toString() === field.owner_id.toString());
            if (product && !matchingProducts.find(p => p.id === product.id)) {
              console.log(`✅ Product ${product.id} (${product.title}) matches metafield filter`);
              matchingProducts.push(product);
            }
          } else {
            console.log(`❌ Metafield owner_id ${field.owner_id} not found in product set`);
          }
        });
        
      } catch (error) {
        console.error(`Error in metafield search:`, error);
      }
      
      filteredProducts = matchingProducts;
      console.log(`After metafield filtering: ${filteredProducts.length} products`);
      
      // Mark search as complete
      searchProgress.isRunning = false;
      searchProgress.foundProducts = filteredProducts.length;
    }

    res.json({
      products: filteredProducts,
      total: filteredProducts.length,
      pagesSearched: pageCount,
      totalProductsInCatalog: allProducts.length
    });
    
  } catch (error) {
    console.error('Error in comprehensive search:', error);
    res.status(500).json({ error: error.message });
  }
});

// Progress tracking endpoint
app.get('/api/search-progress', (req, res) => {
  res.json(searchProgress);
});

// Metafield keys endpoint
app.get('/api/metafield-keys', async (req, res) => {
  try {
    console.log('Sampling 100 products for metafield keys...');
    
    const response = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products.json?limit=100&fields=id,title,handle,status,product_type,vendor,created_at,updated_at,images,variants,options,tags`, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!data.products || !Array.isArray(data.products)) {
      console.error('Invalid response structure:', data);
      return res.status(500).json({ error: 'Invalid response structure' });
    }
    
    const metafieldKeys = new Set();
    
    // Sample first 100 products for metafield keys
    const sampleProducts = data.products.slice(0, 100);
    
    for (const product of sampleProducts) {
      try {
        const metaResponse = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products/${product.id}/metafields.json`, {
          headers: {
            'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
            'Content-Type': 'application/json'
          }
        });
        
        if (metaResponse.ok) {
          const metaData = await metaResponse.json();
          const metafields = metaData.metafields || [];
          
          metafields.forEach(field => {
            if (field.key) {
              metafieldKeys.add(field.key);
            }
          });
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching metafields for product ${product.id}:`, error);
      }
    }
    
    const uniqueKeys = Array.from(metafieldKeys).sort();
    console.log(`Found ${uniqueKeys.length} unique metafield keys:`, uniqueKeys);
    
    res.json({ metafieldKeys: uniqueKeys });
  } catch (error) {
    console.error('Error fetching metafield keys:', error);
    res.status(500).json({ error: error.message });
  }
});

// Product metadata endpoint
app.get('/api/product-metadata', async (req, res) => {
  try {
    const response = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products.json?limit=250&fields=id,title,handle,status,product_type,vendor,created_at,updated_at,images,variants,options,tags`, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!data.products || !Array.isArray(data.products)) {
      console.error('Invalid response structure:', data);
      return res.status(500).json({ error: 'Invalid response structure' });
    }
    
    const productTypes = new Set();
    const vendors = new Set();
    
    data.products.forEach(product => {
      if (product.product_type) {
        productTypes.add(product.product_type);
      }
      if (product.vendor) {
        vendors.add(product.vendor);
      }
    });
    
    res.json({
      productTypes: Array.from(productTypes).sort(),
      vendors: Array.from(vendors).sort()
    });
  } catch (error) {
    console.error('Error fetching product metadata:', error);
    res.status(500).json({ error: error.message });
  }
});

// Basic products endpoint (single page)
app.get('/api/products', async (req, res) => {
  try {
    const { 
      limit = 250, 
      page = 1, 
      status = 'any', 
      product_type = '', 
      vendor = '',
      fields = 'id,title,handle,status,product_type,vendor,created_at,updated_at,images,variants,options,tags'
    } = req.query;

    let queryParams = new URLSearchParams({
      limit: limit.toString(),
      fields: fields
    });

    // Add pagination
    if (page > 1) {
      queryParams.append('page_info', req.query.page_info || '');
    }

    // Add filters
    if (status !== 'any') {
      queryParams.append('status', status);
    }
    if (product_type) {
      queryParams.append('product_type', product_type);
    }
    if (vendor) {
      queryParams.append('vendor', vendor);
    }

    const url = `https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products.json?${queryParams.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    // Apply client-side filters
    let filteredProducts = data.products || [];
    
    // Apply status filter
    if (status !== 'any') {
      filteredProducts = filteredProducts.filter(product => product.status === status);
    }
    
    // Extract pagination info from headers
    const linkHeader = response.headers.get('link');
    let paginationInfo = {};
    
    if (linkHeader) {
      const links = linkHeader.split(',');
      links.forEach(link => {
        const [url, rel] = link.split(';');
        const cleanUrl = url.trim().slice(1, -1);
        const cleanRel = rel.trim().replace('rel="', '').replace('"', '');
        
        if (cleanRel === 'next') {
          const nextPageUrl = new URL(cleanUrl);
          paginationInfo.next_page_info = nextPageUrl.searchParams.get('page_info');
        }
      });
    }

    res.json({
      products: filteredProducts,
      pagination: paginationInfo,
      total: filteredProducts.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Shopify Image Processor running on port ${PORT}`);
  console.log(`📱 Access the app at: http://localhost:${PORT}`);
});
