const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const fetch = require('node-fetch');
const FormData = require('form-data');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Create uploads directory
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

// Multer configuration for logo uploads
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `logo-${Date.now()}-${file.originalname}`);
  }
});

const logoUpload = multer({ 
  storage: logoStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Picsart background removal
async function removeBackgroundPicsart(imageBuffer) {
  try {
    const formData = new FormData();
    formData.append('image', imageBuffer, 'image.jpg');
    
    const response = await fetch('https://api.picsart.io/tools/removebg', {
      method: 'POST',
      headers: {
        'X-Picsart-API-Key': process.env.PICSART_API_KEY,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!response.ok) {
      if (response.status === 402) {
        console.log('⚠️ Picsart credits exhausted, using original image');
        return imageBuffer;
      }
      throw new Error(`Picsart API error: ${response.status}`);
    }

    return await response.buffer();
  } catch (error) {
    console.log('⚠️ Picsart background removal failed:', error.message);
    return imageBuffer;
  }
}

// Image processing with Sharp
async function processImage(imageBuffer, options = {}) {
  const {
    width = 2000,
    height = 2000,
    backgroundColor = '#ffff00',
    margin = 0,
    watermarkType = 'none',
    watermarkText = 'SPM',
    logoPath = null,
    logoScale = 0.3,
    logoOpacity = 0.8,
    logoX = 0.5,
    logoY = 0.5,
    removeBackground = false
  } = options;

  try {
    let processedBuffer = imageBuffer;

    // Remove background if requested
    if (removeBackground) {
      processedBuffer = await removeBackgroundPicsart(imageBuffer);
    }

    // Create base canvas with background color
    let canvas = sharp({
      create: {
        width: width,
        height: height,
        channels: 4,
        background: backgroundColor
      }
    });

    // Calculate image dimensions with margins
    const imageWidth = width - (margin * 2);
    const imageHeight = height - (margin * 2);

    // Resize and composite the product image
    const productImage = await sharp(processedBuffer)
      .resize(imageWidth, imageHeight, { 
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toBuffer();

    canvas = canvas.composite([{
      input: productImage,
      left: margin,
      top: margin
    }]);

    // Add watermark
    if (watermarkType === 'text' && watermarkText) {
      const logoSize = Math.floor(Math.min(imageWidth, imageHeight) * logoScale);
      const fontSize = Math.floor(logoSize * 0.3);
      
      const svgText = `
        <svg width="${logoSize}" height="${logoSize}">
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" 
                font-family="Arial, sans-serif" font-size="${fontSize}" 
                font-weight="bold" fill="rgba(0,0,0,${logoOpacity})">
            ${watermarkText}
          </text>
        </svg>
      `;

      const textBuffer = Buffer.from(svgText);
      const logoXPos = Math.floor(margin + (imageWidth * logoX) - (logoSize / 2));
      const logoYPos = Math.floor(margin + (imageHeight * logoY) - (logoSize / 2));

      canvas = canvas.composite([{
        input: textBuffer,
        left: logoXPos,
        top: logoYPos
      }]);
    }

    // Add logo watermark
    if (watermarkType === 'logo' && logoPath && fs.existsSync(logoPath)) {
      const logoSize = Math.floor(Math.min(imageWidth, imageHeight) * logoScale);
      
      const logoBuffer = await sharp(logoPath)
        .resize(logoSize, logoSize, { fit: 'contain' })
        .png({ quality: 100 })
        .toBuffer();

      const logoXPos = Math.floor(margin + (imageWidth * logoX) - (logoSize / 2));
      const logoYPos = Math.floor(margin + (imageHeight * logoY) - (logoSize / 2));

      canvas = canvas.composite([{
        input: logoBuffer,
        left: logoXPos,
        top: logoYPos,
        blend: 'over'
      }]);
    }

    return await canvas.png().toBuffer();
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

// Upload image to Shopify
async function uploadImageToShopify(productId, imageBuffer, filename) {
  try {
    const formData = new FormData();
    formData.append('image[image]', imageBuffer, {
      filename: filename,
      contentType: 'image/png'
    });

    const response = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products/${productId}/images.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Shopify upload failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Shopify upload error:', error);
    throw error;
  }
}

// Get products with pagination
app.get('/api/products', async (req, res) => {
  try {
    const { page = 1, limit = 100, status = 'any' } = req.query;
    
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
        fields: 'id,title,handle,status,product_type,vendor,created_at,updated_at,images,variants,options,tags'
      });

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
      
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status}`);
    }
    
    const data = await response.json();
    const products = data.products || [];
    
    res.json({
      products,
      total: products.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
            } catch (error) {
    console.error('❌ Products API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all products with filtering - COMPLETELY REWRITTEN TO FETCH ALL 6,442 PRODUCTS
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
    
    // Check if we need metafield filtering
    const needsMetafieldFilter = metafield && metafieldValue;
    let allProducts = [];
    
    if (needsMetafieldFilter) {
      console.log(`🔍 FAST Metafield filtering: ${metafield} = ${metafieldValue}`);
      
      // Use GraphQL to search metafields directly
      const graphqlQuery = {
        query: `
          query searchProductsByMetafield($query: String!) {
            products(first: 1000, query: $query) {
              edges {
                node {
                  id
                  title
                  handle
                  status
                  productType
                  vendor
                  createdAt
                  updatedAt
                  tags
                  images(first: 10) {
                    edges {
                      node {
                        id
                        altText
                        url
                        width
                        height
                      }
                    }
                  }
                  variants(first: 10) {
                    edges {
                      node {
                        id
                        title
                        price
                        sku
                        inventoryQuantity
                      }
                    }
                  }
                  metafields(first: 50, namespace: "custom") {
                    edges {
                      node {
                        key
                        value
                      }
                    }
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        `,
        variables: {
          query: `metafield:custom.${metafield}:"${metafieldValue}"${status !== 'any' ? ` AND status:${status}` : ''}`
        }
      };
      
      try {
        console.log(`🚀 GraphQL metafield search: metafield:custom.${metafield}:${metafieldValue}`);
        const graphqlResponse = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/graphql.json`, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(graphqlQuery)
        });
        
        if (graphqlResponse.ok) {
          const graphqlData = await graphqlResponse.json();
          const products = graphqlData.data?.products?.edges || [];
          
          // Convert GraphQL format to REST format
          const convertedProducts = products.map(edge => {
            const node = edge.node;
            return {
              id: parseInt(node.id.split('/').pop()),
              title: node.title,
              handle: node.handle,
              status: node.status.toLowerCase(),
              product_type: node.productType,
              vendor: node.vendor,
              createdAt: node.createdAt,
              updatedAt: node.updatedAt,
              tags: node.tags.join(', '),
              images: node.images.edges.map(imgEdge => ({
                id: parseInt(imgEdge.node.id.split('/').pop()),
                alt: imgEdge.node.altText,
                position: 1,
                product_id: parseInt(node.id.split('/').pop()),
                created_at: node.createdAt,
                updated_at: node.updatedAt,
                admin_graphql_api_id: imgEdge.node.id,
                width: imgEdge.node.width,
                height: imgEdge.node.height,
                src: imgEdge.node.url,
                variant_ids: []
              })),
              variants: node.variants.edges.map(varEdge => ({
                id: parseInt(varEdge.node.id.split('/').pop()),
                product_id: parseInt(node.id.split('/').pop()),
                title: varEdge.node.title,
                price: varEdge.node.price,
                position: 1,
                inventory_policy: 'deny',
                compare_at_price: null,
                option1: varEdge.node.title,
                option2: null,
                option3: null,
                created_at: node.createdAt,
                updated_at: node.updatedAt,
                taxable: true,
                barcode: null,
                fulfillment_service: 'manual',
                grams: 0,
                inventory_management: null,
                requires_shipping: true,
                sku: varEdge.node.sku,
                weight: 0,
                weight_unit: 'kg',
                inventory_item_id: null,
                inventory_quantity: varEdge.node.inventoryQuantity,
                old_inventory_quantity: varEdge.node.inventoryQuantity,
                admin_graphql_api_id: varEdge.node.id,
                image_id: null
              })),
              options: [{
                id: 1,
                product_id: parseInt(node.id.split('/').pop()),
                name: 'Title',
                position: 1,
                values: [node.variants.edges[0]?.node?.title || 'Default Title']
              }]
            };
          });
          
          console.log(`✅ FAST GraphQL found ${convertedProducts.length} products with metafield match`);
          allProducts = convertedProducts;
          
        } else {
          console.log(`⚠️ GraphQL search failed, falling back to REST API`);
          throw new Error('GraphQL search failed');
        }
        
      } catch (error) {
        console.log(`⚠️ GraphQL metafield search failed: ${error.message}`);
        console.log(`🔄 Falling back to REST API method...`);
        
        // Fallback to the old method if GraphQL fails
        let currentPage = 1;
        const maxPages = 200;
        
        while (currentPage <= maxPages) {
          console.log(`📡 Fallback: Fetching page ${currentPage}...`);
          
          const queryParams = new URLSearchParams({
            limit: '250',
            fields: 'id,title,handle,status,product_type,vendor,created_at,updated_at,images,variants,options,tags'
          });
          
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
          
          if (!response.ok) {
            console.log(`⚠️ Page ${currentPage} failed: ${response.status}`);
            break;
          }
          
          const data = await response.json();
          const products = data.products || [];
          
          if (products.length === 0) {
            console.log(`📦 Page ${currentPage}: No more products, stopping`);
            break;
          }
          
          allProducts = allProducts.concat(products);
          console.log(`📦 Page ${currentPage}: Found ${products.length} products (Total: ${allProducts.length})`);
          
          currentPage++;
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        console.log(`✅ Fallback: Fetched ${allProducts.length} products`);
        
        // Quick metafield check on first 200 products only
        const sampleProducts = allProducts.slice(0, 200);
        const productIds = sampleProducts.map(p => p.id);
        
        const matchingProducts = [];
        
        // Process in batches of 50 for GraphQL
        for (let i = 0; i < productIds.length; i += 50) {
          const batch = productIds.slice(i, i + 50);
          
          const graphqlQuery = {
            query: `
              query getProductsMetafields($ids: [ID!]!) {
                nodes(ids: $ids) {
                  ... on Product {
                    id
                    metafields(first: 50, namespace: "custom") {
                      edges {
                        node {
                          key
                          value
                        }
                      }
                    }
                  }
                }
              }
            `,
            variables: {
              ids: batch.map(id => `gid://shopify/Product/${id}`)
            }
          };
          
          try {
            const graphqlResponse = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/graphql.json`, {
              method: 'POST',
              headers: {
                'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(graphqlQuery)
            });
            
            if (graphqlResponse.ok) {
              const graphqlData = await graphqlResponse.json();
              const nodes = graphqlData.data?.nodes || [];
              
              nodes.forEach((node, index) => {
                if (node?.metafields?.edges) {
                  const metafields = node.metafields.edges.map(edge => edge.node);
                  const hasMatch = metafields.some(field => 
                    field.key === metafield && 
                    field.value?.toLowerCase().includes(metafieldValue.toLowerCase())
                  );
                  
                  if (hasMatch && sampleProducts[i + index]) {
                    matchingProducts.push(sampleProducts[i + index]);
                  }
                }
              });
            }
          } catch (error) {
            console.error('GraphQL metafield search failed:', error);
          }
        }
        
        console.log(`✅ Fallback: Found ${matchingProducts.length} products with metafield match`);
        allProducts = matchingProducts;
      }

    } else {
      console.log(`📡 Fetching ALL products for basic filtering...`);
      
      // For basic filtering, fetch ALL products from all statuses
      const statusesToFetch = status === 'any' ? ['active', 'archived', 'draft'] : [status];
      const productMap = new Map(); // Use Map to avoid duplicates by ID
      
      for (const statusToFetch of statusesToFetch) {
        console.log(`📡 Fetching ALL ${statusToFetch} products...`);
        
        let currentPage = 1;
        const maxPages = 200; // Increased to fetch ALL products
        
        let nextPageUrl = null;
        let pageCount = 0;
        
        // Initial request
        const queryParams = new URLSearchParams({
          limit: '250',
          fields: 'id,title,handle,status,product_type,vendor,created_at,updated_at,images,variants,options,tags'
        });
        
        if (statusToFetch !== 'any') {
          queryParams.append('status', statusToFetch);
        }
        
        let url = `https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products.json?${queryParams.toString()}`;
        
        while (url && pageCount < maxPages) {
          pageCount++;
          console.log(`📡 Fetching ${statusToFetch} page ${pageCount}...`);
          
          const response = await fetch(url, {
            headers: {
              'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            console.log(`⚠️ ${statusToFetch} page ${pageCount} failed: ${response.status}`);
            break;
          }
          
          const data = await response.json();
          const products = data.products || [];
          
          if (products.length === 0) {
            console.log(`📦 ${statusToFetch} page ${pageCount}: No more products, stopping`);
            break;
          }
          
          // Add products to map (automatically handles duplicates by ID)
          products.forEach(product => {
            productMap.set(product.id, product);
          });
          
          console.log(`📦 ${statusToFetch} page ${pageCount}: Found ${products.length} products (Unique total: ${productMap.size})`);
          
          // Get next page URL from Link header
          const linkHeader = response.headers.get('link');
          if (linkHeader) {
            const nextMatch = linkHeader.match(/<([^>]+)>; rel="next"/);
            if (nextMatch) {
              url = nextMatch[1];
            } else {
              url = null;
            }
          } else {
            url = null;
          }
          
          await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between requests
        }
      }
      
      allProducts = Array.from(productMap.values());
      console.log(`✅ Basic filtering: Fetched ${allProducts.length} unique products total`);
    }
    
    // Apply additional client-side filters
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
    
    // Frontend pagination - return only the requested page
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
    
    console.log(`📄 Showing ${paginatedProducts.length} of ${filteredProducts.length} products (Page ${pageNum}/${Math.ceil(filteredProducts.length / limitNum)})`);
    
    const responseData = {
      products: paginatedProducts,
      total: filteredProducts.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(filteredProducts.length / limitNum),
      totalProductsInCatalog: allProducts.length,
      filtersApplied: {
        status,
        metafield,
        metafieldValue,
        type,
        vendor,
        imageCount,
        fileType,
        minWidth,
        minHeight
      }
    };
    
    console.log(`🎉 Response: ${paginatedProducts.length} products, ${responseData.totalPages} total pages`);
    res.json(responseData);
        
      } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get product metadata
app.get('/api/product-metadata', async (req, res) => {
  try {
    const response = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products.json?limit=250&fields=product_type,vendor`, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.status}`);
    }
    
    const data = await response.json();
    const products = data.products || [];
    
    const productTypes = [...new Set(products.map(p => p.product_type).filter(Boolean))];
    const vendors = [...new Set(products.map(p => p.vendor).filter(Boolean))];

    res.json({
      productTypes,
      vendors
    });
    
  } catch (error) {
    console.error('❌ Metadata API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get metafield keys
app.get('/api/metafield-keys', async (req, res) => {
  try {
    console.log('🔑 Loading metafield keys...');
    
    const response = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products.json?limit=250&fields=id`, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status}`);
    }
    
    const data = await response.json();
    const products = data.products || [];
    
    console.log(`📦 Found ${products.length} products to check for metafields`);
    
    const metafieldKeys = new Set();
    
    // Check every 10th product for metafields
    for (let i = 0; i < products.length; i += 10) {
      const product = products[i];
    
      try {
        const metafieldResponse = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products/${product.id}/metafields.json`, {
          headers: {
            'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
            'Content-Type': 'application/json'
          }
        });
        
        if (metafieldResponse.ok) {
          const metafieldData = await metafieldResponse.json();
          const metafields = metafieldData.metafields || [];
          
          metafields.forEach(field => {
              metafieldKeys.add(field.key);
            console.log(`Found metafield: ${field.namespace}.${field.key}`);
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching metafields for product ${product.id}:`, error);
      }
    }
    
    console.log(`✅ Found ${metafieldKeys.size} unique metafield keys`);
    
    res.json({
      metafieldKeys: Array.from(metafieldKeys)
    });
    
  } catch (error) {
    console.error('❌ Metafield Keys Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload logo
app.post('/api/upload-logo', logoUpload.single('logo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No logo file uploaded' });
    }
    
    res.json({
      success: true,
      filename: req.file.filename,
      logoPath: `/uploads/${req.file.filename}`
    });
    
  } catch (error) {
    console.error('❌ Logo Upload Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk process images
app.post('/api/bulk-process', async (req, res) => {
  try {
    const { 
      productIds, 
      width = 2000, 
      height = 2000, 
      backgroundColor = '#ffff00',
      margin = 0,
      watermarkType = 'none',
      watermarkText = 'SPM',
      logoPath = null,
      logoScale = 0.3,
      logoOpacity = 0.8,
      logoX = 0.5,
      logoY = 0.5,
      removeBackground = false,
      replaceImages = false
    } = req.body;

    if (!productIds || productIds.length === 0) {
      return res.status(400).json({ error: 'No product IDs provided for processing' });
    }

    console.log(`🚀 Starting bulk processing of ${productIds.length} products...`);
    
    const results = [];
    
    for (const productId of productIds) {
      try {
        console.log(`🔄 Processing product ${productId}...`);
        
        // Get product details
        const productResponse = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products/${productId}.json`, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
        if (!productResponse.ok) {
          throw new Error(`Failed to fetch product: ${productResponse.status}`);
        }
        
        const productData = await productResponse.json();
        const product = productData.product;
        
        if (!product.images || product.images.length === 0) {
          console.log(`⚠️ Product ${productId} has no images, skipping`);
          continue;
        }
        
        // Process first image
        const firstImage = product.images[0];
        const imageResponse = await fetch(firstImage.src);
        
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.status}`);
        }
        
        const imageBuffer = await imageResponse.buffer();
        
        // Process the image
        const processedBuffer = await processImage(imageBuffer, {
          width,
          height,
          backgroundColor,
          margin,
          watermarkType,
          watermarkText,
          logoPath,
          logoScale,
          logoOpacity,
          logoX,
          logoY,
          removeBackground
        });
        
        // Save locally
        const filename = `processed-${productId}-${Date.now()}.png`;
        const localPath = path.join('uploads', filename);
        fs.writeFileSync(localPath, processedBuffer);
        
        // Upload to Shopify
        const uploadResult = await uploadImageToShopify(productId, processedBuffer, filename);
        
        console.log(`✅ Product ${productId} processed successfully`);
        
        results.push({
          productId,
          success: true,
          imageId: uploadResult.image?.id,
          filename
        });
        
      } catch (error) {
        console.error(`❌ Error processing product ${productId}:`, error.message);
        results.push({
          productId,
          success: false,
          error: error.message
        });
      }
    }
    
    console.log(`🎉 Bulk processing completed: ${results.filter(r => r.success).length}/${results.length} successful`);
    
    res.json({
      success: true,
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
    
  } catch (error) {
    console.error('❌ Bulk Processing Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk delete images
app.post('/api/bulk-delete-images', async (req, res) => {
  try {
    const { imagesByProduct } = req.body;
    
    if (!imagesByProduct) {
      return res.status(400).json({ error: 'No images provided for deletion' });
    }
    
    const results = [];
    
    for (const [productId, imageIds] of Object.entries(imagesByProduct)) {
      for (const imageId of imageIds) {
        try {
          const response = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products/${productId}/images/${imageId}.json`, {
            method: 'DELETE',
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
          if (response.ok) {
            results.push({ productId, imageId, success: true });
          } else {
            results.push({ productId, imageId, success: false, error: `HTTP ${response.status}` });
          }
        } catch (error) {
          results.push({ productId, imageId, success: false, error: error.message });
        }
      }
    }
    
    res.json({
      success: true,
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
    
  } catch (error) {
    console.error('❌ Bulk Delete Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk hide images
app.post('/api/bulk-hide-images', async (req, res) => {
  try {
    const { imagesByProduct } = req.body;
    
    if (!imagesByProduct) {
      return res.status(400).json({ error: 'No images provided for hiding' });
    }
    
    const results = [];
    
    for (const [productId, imageIds] of Object.entries(imagesByProduct)) {
      for (const imageId of imageIds) {
        try {
          const response = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products/${productId}/images/${imageId}.json`, {
            method: 'PUT',
            headers: {
              'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              image: {
                id: imageId,
                position: 999999
              }
            })
          });
          
          if (response.ok) {
            results.push({ productId, imageId, success: true });
          } else {
            results.push({ productId, imageId, success: false, error: `HTTP ${response.status}` });
          }
        } catch (error) {
          results.push({ productId, imageId, success: false, error: error.message });
        }
      }
    }

    res.json({
      success: true,
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
    
  } catch (error) {
    console.error('❌ Bulk Hide Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving static files from public/`);
  console.log(`📁 Upload directory: uploads/`);
});
