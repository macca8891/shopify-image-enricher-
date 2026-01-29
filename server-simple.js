const express = require('express');
const fetch = require('node-fetch');
const sharp = require('sharp');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    if (file.fieldname === 'logo') {
      cb(null, `logo-${Date.now()}-${file.originalname}`);
    } else {
      cb(null, `temp-${Date.now()}-${file.originalname}`);
    }
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
});

// Ensure uploads directory exists
const ensureUploadsDir = async () => {
  try {
    await fs.access('uploads');
  } catch {
    await fs.mkdir('uploads', { recursive: true });
  }
};
ensureUploadsDir();

// Get products with proper pagination
app.get('/api/all-products', async (req, res) => {
  try {
    const { 
      status = 'any', 
      metafield = '',
      metafieldValue = '',
      type = 'any',
      vendor = 'any',
      imageCount = 'any',
      fileType = 'any',
      minWidth = '',
      minHeight = '',
      page = '1',
      limit = '250'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    console.log(`🚀 PRODUCT SEARCH: Page ${pageNum}, Limit ${limitNum}, Status: ${status}`);
    
    let allProducts = [];
    let pageInfo = null;
    let pageCount = 0;
    const maxPages = 50; // Safety limit
    
    // Fetch ALL products across all pages
    do {
      pageCount++;
      console.log(`📡 Fetching page ${pageCount}...`);
      
      let url = `https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products.json?limit=250`;
      
      // Add status filter if not 'any'
      if (status !== 'any') {
        url += `&status=${status}`;
      }
      
      // Add pagination
      if (pageInfo) {
        url += `&page_info=${pageInfo}`;
      }
      
      console.log(`📡 URL: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error(`❌ Response status: ${response.status}`);
        console.error(`❌ Response text: ${await response.text()}`);
        throw new Error(`Failed to fetch products: ${response.status}`);
      }
      
      const data = await response.json();
      const products = data.products || [];
      
      if (products.length === 0) {
        console.log(`📦 No more products, stopping`);
        break;
      }
      
      allProducts = allProducts.concat(products);
      console.log(`📦 Page ${pageCount}: Found ${products.length} products (Total: ${allProducts.length})`);
      
      // Check for next page
      const linkHeader = response.headers.get('link');
      pageInfo = null;
      
      if (linkHeader) {
        console.log(`🔗 Link header: ${linkHeader}`);
        const links = linkHeader.split(',');
        links.forEach(link => {
          const [url, rel] = link.split(';');
          const cleanUrl = url.trim().slice(1, -1);
          const cleanRel = rel.trim().replace('rel="', '').replace('"', '');
          
          if (cleanRel === 'next') {
            try {
              const nextPageUrl = new URL(cleanUrl);
              pageInfo = nextPageUrl.searchParams.get('page_info');
              console.log(`🔗 Next page info: ${pageInfo}`);
            } catch (error) {
              console.error(`Error parsing URL: ${cleanUrl}`, error);
            }
          }
        });
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } while (pageInfo && pageCount < maxPages);
    
    console.log(`✅ Total products fetched: ${allProducts.length} across ${pageCount} pages`);
    
    // Apply client-side filters
    let filteredProducts = allProducts;
    
    if (type !== 'any') {
      filteredProducts = filteredProducts.filter(p => p.product_type === type);
      console.log(`🔍 Type filter: ${filteredProducts.length} products`);
    }
    
    if (vendor !== 'any') {
      filteredProducts = filteredProducts.filter(p => p.vendor === vendor);
      console.log(`🔍 Vendor filter: ${filteredProducts.length} products`);
    }
    
    if (imageCount !== 'any') {
      filteredProducts = filteredProducts.filter(p => {
        const count = p.images ? p.images.length : 0;
        if (imageCount === '0') return count === 0;
        if (imageCount === '1') return count === 1;
        if (imageCount === '2') return count === 2;
        if (imageCount === '3') return count === 3;
        if (imageCount === '4') return count === 4;
        if (imageCount === '5+') return count >= 5;
        return true;
      });
      console.log(`🔍 Image count filter: ${filteredProducts.length} products`);
    }
    
    if (fileType !== 'any') {
      filteredProducts = filteredProducts.filter(p => {
        if (!p.images || p.images.length === 0) return false;
        return p.images.some(img => {
          const ext = img.src?.split('.').pop()?.toLowerCase();
          return ext === fileType;
        });
      });
      console.log(`🔍 File type filter: ${filteredProducts.length} products`);
    }
    
    if (minWidth || minHeight) {
      const minW = parseInt(minWidth) || 0;
      const minH = parseInt(minHeight) || 0;
      filteredProducts = filteredProducts.filter(p => {
        if (!p.images || p.images.length === 0) return false;
        return p.images.some(img => (img.width || 0) >= minW && (img.height || 0) >= minH);
      });
      console.log(`🔍 Size filter: ${filteredProducts.length} products`);
    }
    
    // Metafield filtering
    if (metafield && metafieldValue) {
      console.log(`🔍 Filtering by metafield: ${metafield} = ${metafieldValue}`);
      
      const matchingProducts = [];
      let processedCount = 0;
      
      // Process products in batches to avoid rate limits
      for (let i = 0; i < filteredProducts.length; i += 10) {
        const batch = filteredProducts.slice(i, i + 10);
        
        for (const product of batch) {
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
                field.value?.toLowerCase().includes(metafieldValue.toLowerCase())
              );
              
              if (hasMatch) {
                matchingProducts.push(product);
              }
            }
            
            processedCount++;
            if (processedCount % 50 === 0) {
              console.log(`🔍 Processed ${processedCount}/${filteredProducts.length} products for metafield filtering...`);
            }
            
            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 50));
            
          } catch (error) {
            console.error(`Error fetching metafields for product ${product.id}:`, error.message);
          }
        }
      }
      
      filteredProducts = matchingProducts;
      console.log(`✅ Metafield filtering: ${filteredProducts.length} products match`);
    }
    
    // Calculate pagination info
    const totalPages = Math.ceil(filteredProducts.length / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
    
    console.log(`📄 Showing ${paginatedProducts.length} of ${filteredProducts.length} products (Page ${pageNum}/${totalPages})`);
    
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
    console.log('Fetching metafield keys...');
    
    const response = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products.json?limit=250&fields=id,title`, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }
    
    const data = await response.json();
    const products = data.products || [];
    
    console.log(`Found ${products.length} products to sample for metafields`);
    
    const metafieldKeys = new Set();
    let processedCount = 0;
    
    // Sample every 10th product to find metafield keys
    for (let i = 0; i < products.length; i += 10) {
      const product = products[i];
      processedCount++;
      
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
            if (field.namespace === 'custom') {
              metafieldKeys.add(field.key);
              console.log(`Found metafield: ${field.namespace}.${field.key}`);
            }
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error fetching metafields for product ${product.id}:`, error.message);
      }
    }
    
    console.log(`Processed ${processedCount} products, found ${metafieldKeys.size} unique metafield keys`);
    
    res.json({
      metafieldKeys: Array.from(metafieldKeys).sort()
    });
    
  } catch (error) {
    console.error('Error fetching metafield keys:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get product metadata
app.get('/api/product-metadata', async (req, res) => {
  try {
    console.log('Fetching product metadata...');
    
    const response = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products.json?limit=250&fields=id,title,product_type,vendor`, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }
    
    const data = await response.json();
    const products = data.products || [];
    
    const productTypes = new Set();
    const vendors = new Set();
    
    products.forEach(product => {
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

// Upload logo
app.post('/api/upload-logo', upload.single('logo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    res.json({
      success: true,
      filename: req.file.filename,
      path: req.file.path
    });
  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT}/modern.html`);
});
