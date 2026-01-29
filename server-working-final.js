const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Get ALL products with metafield filtering
app.get('/api/all-products', async (req, res) => {
  try {
    const { 
      status = 'any', 
      metafield = '',
      metafieldValue = '',
      page = '1',
      limit = '250'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    console.log(`🚀 PRODUCT SEARCH: Page ${pageNum}, Status: ${status}, Metafield: ${metafield}=${metafieldValue}`);
    
    let allProducts = [];
    let pageInfo = null;
    let pageCount = 0;
    
    // Fetch ALL products first
    console.log('📡 Fetching ALL products...');
    
    do {
      pageCount++;
      let url = `https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products.json?limit=250`;
      
      if (pageInfo) {
        url += `&page_info=${pageInfo}`;
      } else if (status !== 'any') {
        url += `&status=${status}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          console.log('⏳ Rate limited, waiting 5 seconds...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue; // Retry the same page
        }
        console.error(`❌ HTTP ${response.status}: ${await response.text()}`);
        break;
      }
      
      const data = await response.json();
      const products = data.products || [];
      
      if (products.length === 0) break;
      
      allProducts = allProducts.concat(products);
      console.log(`📦 Page ${pageCount}: ${products.length} products (Total: ${allProducts.length})`);
      
      // Get next page info
      const linkHeader = response.headers.get('link');
      pageInfo = null;
      
      if (linkHeader && linkHeader.includes('rel="next"')) {
        console.log(`🔗 Link header: ${linkHeader}`);
        const nextMatch = linkHeader.match(/<([^>]+)>; rel="next"/);
        if (nextMatch) {
          const nextUrl = new URL(nextMatch[1]);
          pageInfo = nextUrl.searchParams.get('page_info');
          console.log(`🔗 Next page info: ${pageInfo}`);
        }
      } else {
        console.log(`🔗 No next page link found`);
      }
      
      // Add delay to prevent rate limiting
      if (pageInfo) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Increased to 2 seconds
      }
      
      // Rate limit protection
      if (pageCount % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } while (pageInfo && pageCount < 50);
    
    console.log(`✅ Total products fetched: ${allProducts.length}`);
    
    // Apply metafield filtering if needed
    let filteredProducts = allProducts;
    
    if (metafield && metafieldValue) {
      console.log(`🔍 Filtering ${allProducts.length} products by metafield: ${metafield} = ${metafieldValue}`);
      
      const matchingProducts = [];
      let processed = 0;
      
      for (const product of allProducts) {
        try {
          const metafieldsResponse = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products/${product.id}/metafields.json`, {
            headers: {
              'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
              'Content-Type': 'application/json'
            }
          });
          
          if (metafieldsResponse.ok) {
            const metafieldsData = await metafieldsResponse.json();
            const metafields = metafieldsData.metafields || [];
            
            const hasMatch = metafields.some(field => 
              field.key === metafield && 
              field.value && 
              field.value.toString().toLowerCase().includes(metafieldValue.toLowerCase())
            );
            
            if (hasMatch) {
              matchingProducts.push(product);
              console.log(`✅ Match found: ${product.title} (${product.id})`);
            }
          }
          
          processed++;
          if (processed % 100 === 0) {
            console.log(`🔍 Processed ${processed}/${allProducts.length} products...`);
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } catch (error) {
          console.error(`Error checking metafields for product ${product.id}:`, error.message);
        }
      }
      
      filteredProducts = matchingProducts;
      console.log(`✅ Metafield filtering complete: ${filteredProducts.length} matches found`);
    }
    
    // Paginate results
    const totalPages = Math.ceil(filteredProducts.length / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
    
    console.log(`📄 Returning page ${pageNum}/${totalPages}: ${paginatedProducts.length} products`);
    
    res.json({
      products: paginatedProducts,
      total: filteredProducts.length,
      page: pageNum,
      limit: limitNum,
      totalPages: totalPages,
      totalProductsInCatalog: allProducts.length
    });
    
  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get metafield keys
app.get('/api/metafield-keys', async (req, res) => {
  try {
    console.log('📋 Fetching metafield keys...');
    
    // Sample first 250 products
    const response = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products.json?limit=250`, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    const products = data.products || [];
    
    console.log(`Found ${products.length} products to sample for metafields`);
    
    const metafieldKeys = new Set();
    
    for (let i = 0; i < Math.min(products.length, 100); i += 1) {
      const product = products[i];
      
      try {
        const metafieldsResponse = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products/${product.id}/metafields.json`, {
          headers: {
            'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
            'Content-Type': 'application/json'
          }
        });
        
        if (metafieldsResponse.ok) {
          const metafieldsData = await metafieldsResponse.json();
          const metafields = metafieldsData.metafields || [];
          
          metafields.forEach(field => {
            console.log(`Found metafield: ${field.namespace}.${field.key}`);
            metafieldKeys.add(field.key);
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`Error fetching metafields for product ${product.id}:`, error.message);
      }
    }
    
    const keys = Array.from(metafieldKeys).sort();
    console.log(`✅ Found ${keys.length} metafield keys: ${keys.join(', ')}`);
    
    res.json({
      metafieldKeys: keys
    });
    
  } catch (error) {
    console.error('❌ Metafield keys error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Get product metadata
app.get('/api/product-metadata', async (req, res) => {
  try {
    console.log('📊 Fetching product metadata...');
    
    const response = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products.json?limit=250`, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    const products = data.products || [];
    
    const productTypes = new Set();
    const vendors = new Set();
    
    products.forEach(product => {
      if (product.product_type) productTypes.add(product.product_type);
      if (product.vendor) vendors.add(product.vendor);
    });
    
    console.log(`✅ Found ${productTypes.size} product types and ${vendors.size} vendors`);
    
    res.json({
      productTypes: Array.from(productTypes).sort(),
      vendors: Array.from(vendors).sort()
    });
    
  } catch (error) {
    console.error('❌ Metadata error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Products endpoint with proper pagination
app.get('/api/products', async (req, res) => {
  try {
    const { status = 'any', page = '1', limit = '250' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    let url = `https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products.json?limit=${limitNum}`;
    
    if (status !== 'any') {
      url += `&status=${status}`;
    }
    
    console.log(`🚀 Product fetch: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    const products = data.products || [];
    
    // Get total count
    let totalCount = products.length;
    if (pageNum === 1) {
      try {
        let countUrl = `https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products/count.json`;
        if (status !== 'any') {
          countUrl += `?status=${status}`;
        }
        const countResponse = await fetch(countUrl, {
          headers: {
            'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN
          }
        });
        if (countResponse.ok) {
          const countData = await countResponse.json();
          totalCount = countData.count || products.length;
        }
      } catch (countError) {
        console.log('Could not get total count:', countError.message);
      }
    }
    
    console.log(`✅ Fetch: ${products.length} products (total: ${totalCount})`);
    
    res.json({
      success: true,
      products: products,
      totalProductsInCatalog: totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
      currentPage: pageNum,
      limit: limitNum
    });
    
  } catch (error) {
    console.error('❌ Fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT}/simple.html`);
});
