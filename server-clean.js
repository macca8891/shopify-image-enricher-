const express = require('express');
const fetch = require('node-fetch');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
require('dotenv').config();

const SHOP_DOMAIN = process.env.SHOP_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';
const PORT = process.env.PORT || 3001;

if (!SHOP_DOMAIN || !SHOPIFY_TOKEN) {
  throw new Error('Missing SHOP_DOMAIN or SHOPIFY_TOKEN in environment');
}

const app = express();
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(express.static('public'));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static('uploads'));

async function makeShopifyRequest(url, options = {}, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429 && attempt < retries) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '2', 10);
        const wait = Math.min(retryAfter * 1000 * attempt, 10000);
        console.log(`⏳ Rate limited. Waiting ${wait / 1000}s before retry ${attempt}/${retries}...`);
        await new Promise(resolve => setTimeout(resolve, wait));
        continue;
      }

      if (!response.ok) {
        if (attempt === retries) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        console.log(`⚠️ HTTP ${response.status}. Retrying ${attempt}/${retries}...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }

      return response;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      console.log(`⚠️ Request error (${error.message}). Retrying ${attempt}/${retries}...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// Cached metafield keys
const CACHED_METAFIELD_KEYS = ['brand_code', 'brands', 'diameter', 'height_raw_mm_', 'image_needs_attention', 'largest_diameter_raw_mm_', 'old_image_on_file', 'oxfil_image_on_file', 'supplier', 'weight_raw_kg_'];

app.get('/api/metafield-keys', (req, res) => {
  console.log('🔑 Returning cached metafield keys (no API calls)...');
  console.log(`✅ Cached metafield keys: ${CACHED_METAFIELD_KEYS.join(', ')}`);
  res.json({ success: true, keys: CACHED_METAFIELD_KEYS });
});

app.post('/api/metafield-search', async (req, res) => {
  try {
    const { metafield, value } = req.body;
    
    if (!metafield || !value) {
      return res.status(400).json({ success: false, error: 'Metafield and value are required' });
    }
    
    console.log(`🔍 Searching products by metafield: ${metafield} = "${value}"`);
    
    // Use GraphQL to fetch products with metafields (same approach as products endpoint)
    let allProducts = [];
    let hasNextPage = true;
    let cursor = null;
    let batchCount = 0;
    const maxBatches = 30;

    console.log(`📦 Fetching products with metafields using GraphQL...`);

    while (hasNextPage && batchCount < maxBatches) {
      batchCount++;
      
      const query = `
        query getProducts($cursor: String) {
          products(first: 250, after: $cursor) {
            edges {
              node {
                id
                legacyResourceId
                title
                vendor
                productType
                status
                createdAt
                updatedAt
                metafields(first: 30) {
                  edges {
                    node {
                      namespace
                      key
                      value
                    }
                  }
                }
                images(first: 10) {
                  edges {
                    node {
                      id
                      url
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
      `;

      const graphqlResponse = await fetch(`https://${SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query,
          variables: { cursor: cursor }
        })
      });

      const result = await graphqlResponse.json();
      
      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
        break;
      }

      const products = result.data.products.edges.map(edge => {
        const node = edge.node;
        const metafields = node.metafields.edges.reduce((acc, mf) => {
          const key = `${mf.node.namespace}.${mf.node.key}`;
          acc[key] = mf.node.value;
          return acc;
        }, {});
        
        return {
          id: node.legacyResourceId,
          title: node.title,
          vendor: node.vendor,
          product_type: node.productType,
          status: node.status.toLowerCase(),
          created_at: node.createdAt,
          updated_at: node.updatedAt,
          metafields: metafields,
          images: node.images.edges.map(img => ({ 
            id: img.node.id ? img.node.id.split('/').pop() : null,
            src: img.node.url 
          }))
        };
      });

      allProducts = allProducts.concat(products);
      
      hasNextPage = result.data.products.pageInfo.hasNextPage;
      cursor = result.data.products.pageInfo.endCursor;
      
      console.log(`📦 Fetched batch ${batchCount}, total: ${allProducts.length} products`);
      
      if (!hasNextPage) {
        console.log(`✅ No more pages, fetched all ${allProducts.length} products`);
        break;
      }
    }

    // Filter products by metafield value
    const filteredProducts = allProducts.filter(product => {
      if (!product.metafields) {
        return false;
      }
      
      // Check both namespaced and non-namespaced keys for backward compatibility
      const metafieldValue = product.metafields[metafield] || product.metafields[`custom.${metafield}`];
      if (!metafieldValue) {
        return false;
      }
      return metafieldValue.toLowerCase().includes(value.toLowerCase());
    });
    
    console.log(`✅ Found ${filteredProducts.length} products matching metafield filter: ${metafield} = "${value}"`);
    
    res.json({
      success: true,
      products: filteredProducts,
      totalProducts: filteredProducts.length,
      totalPages: Math.ceil(filteredProducts.length / 250),
      currentPage: 1
    });
    
  } catch (error) {
    console.error('❌ Metafield search failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const { status = 'any', processed = 'any' } = req.query;

    // Use GraphQL to fetch products - more reliable than REST API
    let allProducts = [];
    let hasNextPage = true;
    let cursor = null;
    let batchCount = 0;
    const maxBatches = 30;

    console.log(`📦 Fetching ALL products using GraphQL...`);

    while (hasNextPage && batchCount < maxBatches) {
      batchCount++;
      
      const query = `
        query getProducts($cursor: String) {
          products(first: 250, after: $cursor) {
            edges {
              node {
                id
                legacyResourceId
                title
                vendor
                productType
                status
                createdAt
                updatedAt
                metafields(first: 30) {
                  edges {
                    node {
                      namespace
                      key
                      value
                    }
                  }
                }
                images(first: 10) {
                  edges {
                    node {
                      id
                      url
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
      `;

      const graphqlResponse = await fetch(`https://${SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query,
          variables: { cursor: cursor }
        })
      });

      const result = await graphqlResponse.json();
      
      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
        break;
      }

      const products = result.data.products.edges.map(edge => {
        const node = edge.node;
        const metafields = node.metafields.edges.reduce((acc, mf) => {
          const key = `${mf.node.namespace}.${mf.node.key}`;
          acc[key] = mf.node.value;
          return acc;
        }, {});
        
        return {
          id: node.legacyResourceId,
          title: node.title,
          vendor: node.vendor,
          product_type: node.productType,
          status: node.status.toLowerCase(),
          created_at: node.createdAt,
          updated_at: node.updatedAt,
          metafields: metafields,
          images: node.images.edges.map(img => ({ 
            id: img.node.id ? img.node.id.split('/').pop() : null, // Extract numeric ID from GraphQL ID
            src: img.node.url 
          }))
        };
      });

      allProducts = allProducts.concat(products);
      
      hasNextPage = result.data.products.pageInfo.hasNextPage;
      cursor = result.data.products.pageInfo.endCursor;
      
      console.log(`📦 Fetched batch ${batchCount}, total: ${allProducts.length} products`);
      
      if (!hasNextPage) {
        console.log(`✅ No more pages, fetched all ${allProducts.length} products`);
        break;
      }
    }

    // Filter by status
    let filteredProducts = status === 'any' 
      ? allProducts 
      : allProducts.filter(p => p.status === status);
    
    console.log(`📦 After status filter: ${filteredProducts.length} products`);

    // Filter by processed status
    if (processed !== 'any') {
      if (processed === 'processed') {
        // Products that have been processed (have spm_processing.last_image_processed_at metafield)
        filteredProducts = filteredProducts.filter(product => 
          product.metafields && product.metafields['spm_processing.last_image_processed_at']
        );
      } else if (processed === 'not_processed') {
        // Products that haven't been processed (no spm_processing.last_image_processed_at metafield)
        filteredProducts = filteredProducts.filter(product => 
          !product.metafields || !product.metafields['spm_processing.last_image_processed_at']
        );
      }
      console.log(`📦 After processed filter: ${filteredProducts.length} products`);
    }

    console.log(`📄 Returning ALL ${filteredProducts.length} products on one page`);

    res.json({
      success: true,
      products: filteredProducts,
      totalProductsInCatalog: filteredProducts.length,
      totalPages: 1,
      currentPage: 1,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: filteredProducts.length,
        limit: filteredProducts.length
      }
    });
  } catch (error) {
    console.error('❌ Products endpoint failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


async function removeBackground(imageUrl) {
  if (!process.env.PICSART_API_KEY) {
    return null;
  }

  console.log('🎨 Removing background with Picsart...');
  const formData = new FormData();
  formData.append('image_url', imageUrl);
  formData.append('format', 'PNG');
  formData.append('scale', 'fit');

  try {
    const response = await fetch('https://api.picsart.io/tools/1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Picsart-API-Key': process.env.PICSART_API_KEY
      },
      body: formData
    });

    if (!response.ok) {
      const text = await response.text();
      console.log(`⚠️ Picsart failed: ${text}`);
      return null;
    }

    const body = await response.json();
    const processedUrl = body?.data?.url;
    if (!processedUrl) {
      console.log('⚠️ Picsart response missing URL');
      return null;
    }

    const processedFetch = await fetch(processedUrl);
    if (!processedFetch.ok) {
      console.log(`⚠️ Unable to download Picsart image: ${processedFetch.status}`);
      return null;
    }

    console.log('✅ Background removed successfully');
    return await processedFetch.buffer();
  } catch (error) {
    console.log(`⚠️ Picsart error: ${error.message}`);
    return null;
  }
}

function sanitizeFilename(title) {
  return title
    .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove special characters except spaces, hyphens, underscores
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single underscore
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .substring(0, 50) // Limit length to 50 characters
    .toLowerCase();
}

async function removeLogos(imageBuffer) {
  if (!process.env.PICSART_API_KEY) {
    return null;
  }

  console.log('🏷️ Removing logos/watermarks with Picsart...');
  
  try {
    // Convert buffer to base64 for Picsart API
    const base64Image = imageBuffer.toString('base64');
    
    const response = await fetch('https://api.picsart.io/tools/1.0/text_remover', {
      method: 'POST',
      headers: {
        'X-Picsart-API-Key': process.env.PICSART_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: `data:image/jpeg;base64,${base64Image}`,
        strength: 1.0,
        format: 'PNG'
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.log(`⚠️ Picsart text removal failed: ${text}`);
      return null;
    }

    const result = await response.json();
    const processedUrl = result?.data?.url;
    if (!processedUrl) {
      console.log('⚠️ Picsart text removal response missing URL');
      return null;
    }

    const processedFetch = await fetch(processedUrl);
    if (!processedFetch.ok) {
      console.log(`⚠️ Unable to download processed image: ${processedFetch.status}`);
      return null;
    }

    console.log('✅ Logos/watermarks removed successfully');
    return await processedFetch.buffer();
  } catch (error) {
    console.log(`⚠️ Logo removal error: ${error.message}`);
    return null;
  }
}

app.post('/api/delete-image', async (req, res) => {
  try {
    const { productId, imageId } = req.body;

    if (!productId || !imageId) {
      return res.status(400).json({ success: false, error: 'productId and imageId are required' });
    }

    console.log(`🗑️ Deleting image ${imageId} from product ${productId}`);

    const deleteResponse = await makeShopifyRequest(
      `https://${SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}/images/${imageId}.json`,
      {
        method: 'DELETE',
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    if (deleteResponse.ok) {
      console.log(`✅ Successfully deleted image ${imageId}`);
      res.json({ success: true, message: 'Image deleted successfully' });
    } else {
      throw new Error(`Failed to delete image: HTTP ${deleteResponse.status}`);
    }
  } catch (error) {
    console.error('❌ Image deletion failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Speed optimizations completed:
// 1. Skip logo removal when no watermark is added (saves Picsart API calls)
// 2. Fixed metafield autopopulation for sorting processed products
// 3. Optimized image processing pipeline

app.post('/api/process-image', async (req, res) => {
  const startTime = Date.now();
  try {
    const { productId, imageUrl, settings = {} } = req.body;

    if (!productId || !imageUrl) {
      return res.status(400).json({ success: false, error: 'productId and imageUrl are required' });
    }

    console.log(`🧵 Processing product ${productId}`);
    console.log(`📸 Source: ${imageUrl}`);

    // Check if this is bulk rename only mode
    if (settings.bulkRenameOnly) {
      console.log(`🔄 Bulk Rename Mode: Skipping image processing, only renaming`);
      
      // Fetch product title for filename
      let productTitle = 'processed';
      try {
        const productResponse = await makeShopifyRequest(`https://${SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}.json`, {
          method: 'GET',
          headers: {
            'X-Shopify-Access-Token': SHOPIFY_TOKEN,
            'Content-Type': 'application/json'
          }
        });
        
        if (productResponse.ok) {
          const productData = await productResponse.json();
          productTitle = productData.product?.title || 'processed';
          console.log(`📝 Product title: ${productTitle}`);
        }
      } catch (error) {
        console.log(`⚠️ Failed to fetch product title: ${error.message}`);
      }

      // Download existing image
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: HTTP ${imageResponse.status}`);
      }

      const imageBuffer = await imageResponse.buffer();
      console.log(`📥 Downloaded ${(imageBuffer.length / 1024).toFixed(1)} KB`);

      // Create new filename with image index if multiple images exist
      const imageIndex = req.body.imageIndex || 1; // Frontend should send this
      const filename = imageIndex > 1 
        ? `${sanitizeFilename(productTitle)}_${imageIndex}.jpeg`
        : `${sanitizeFilename(productTitle)}.jpeg`;
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, imageBuffer);
      console.log(`💾 Saved ${filepath}`);

      // Upload with new filename and alt text
      const uploadResponse = await makeShopifyRequest(`https://${SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}/images.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: {
            attachment: imageBuffer.toString('base64'),
            filename,
            ...(settings.updateAltText && { alt: productTitle }) // Conditionally add alt text
          }
        })
      });

      if (uploadResponse.ok) {
        const uploadJson = await uploadResponse.json();
        console.log(`✅ Uploaded renamed image to Shopify: ${uploadJson?.image?.id || 'unknown'}`);
        if (settings.updateAltText) {
          console.log(`📝 Alt text set to: "${productTitle}"`);
        }
      }

      // Delete the old image
      const imageId = req.body.imageId; // Frontend should send this
      if (imageId) {
        try {
          await makeShopifyRequest(`https://${SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}/images/${imageId}.json`, {
            method: 'DELETE',
            headers: {
              'X-Shopify-Access-Token': SHOPIFY_TOKEN,
              'Content-Type': 'application/json'
            }
          });
          console.log(`🗑️ Deleted old image ${imageId}`);
        } catch (delError) {
          console.log(`⚠️ Failed to delete old image: ${delError.message}`);
        }
      }

      // Add metafield to mark this product as processed
      try {
        const metafieldData = {
          metafield: {
            namespace: 'spm_processing',
            key: 'last_image_processed_at',
            value: new Date().toISOString(),
            type: 'single_line_text_field'
          }
        };

        const response = await makeShopifyRequest(`https://${SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}/metafields.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN
          },
          body: JSON.stringify(metafieldData)
        });

        console.log(`✅ Added processing metafield to product ${productId}`);
      } catch (error) {
        console.log(`⚠️ Failed to add processing metafield: ${error.message}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`🎉 Bulk rename completed in ${duration}ms`);

      return res.json({
        success: true,
        processedImageUrl: `http://localhost:3001/uploads/${filename}`,
        filename,
        startedAt: startTime,
        finishedAt: endTime,
        mode: 'bulk_rename'
      });
    }

    // Fetch product title for filename
    let productTitle = 'processed';
    try {
      const productResponse = await makeShopifyRequest(`https://${SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}.json`, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_TOKEN,
          'Content-Type': 'application/json'
        }
      });
      
      if (productResponse.ok) {
        const productData = await productResponse.json();
        productTitle = productData.product?.title || 'processed';
        console.log(`📝 Product title: ${productTitle}`);
      }
    } catch (error) {
      console.log(`⚠️ Failed to fetch product title: ${error.message}`);
    }

    // Get image index for filename
    const imageIndex = req.body.imageIndex || 1;

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: HTTP ${imageResponse.status}`);
    }

    let workingBuffer = await imageResponse.buffer();
    console.log(`📥 Downloaded ${(workingBuffer.length / 1024).toFixed(1)} KB`);

    if (settings.removeBackground !== false) {
      const stripped = await removeBackground(imageUrl);
      if (stripped) {
        workingBuffer = stripped;
      }
    }

    // Skip logo removal if no watermark is being added (avoid unnecessary API calls)
    if (settings.removeLogos && (settings.watermarkType !== 'none' || settings.logoData)) {
      const logoRemoved = await removeLogos(workingBuffer);
      if (logoRemoved) {
        workingBuffer = logoRemoved;
      }
    }

    const canvasSize = Number(settings.canvasSize) || 2000;
    const backgroundColor = settings.backgroundColor || '#ffffff';
    
    // Get margin settings (default 200px each)
    const marginTop = Number(settings.marginTop) || 0;
    const marginBottom = Number(settings.marginBottom) || 0;
    const marginLeft = Number(settings.marginLeft) || 0;
    const marginRight = Number(settings.marginRight) || 0;
    
    // Calculate available space after margins
    const availableWidth = canvasSize - marginLeft - marginRight;
    const availableHeight = canvasSize - marginTop - marginBottom;
    const availableSpace = Math.min(availableWidth, availableHeight);
    
    // If AI Upscaling is enabled, use 95% of available space (closer to edges)
    // Otherwise use 80% for normal spacing
    const aiUpscaling = settings.aiUpscaling !== false;
    const productScale = aiUpscaling ? 0.95 : (Number(settings.productScale) || 0.8);
    const targetWidth = Math.max(200, Math.round(availableSpace * productScale));
    
    console.log(`🎯 AI Upscaling: ${aiUpscaling ? 'ON' : 'OFF'} | Product scale: ${productScale * 100}% | Target: ${targetWidth}px`);

    // Trim transparent/white edges first to get the actual product boundaries
    let productBuffer;
    try {
      productBuffer = await sharp(workingBuffer)
        .trim({ threshold: 10 })  // Remove transparent/white edges
        .resize(targetWidth, targetWidth, {
          fit: 'inside',
          withoutEnlargement: false,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer();
      console.log('✅ Product trimmed and resized');
    } catch (error) {
      // If trim fails, fall back to regular resize
      console.log('⚠️ Trim failed, using regular resize');
      productBuffer = await sharp(workingBuffer)
        .resize(targetWidth, targetWidth, {
          fit: 'inside',
          withoutEnlargement: false,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer();
    }

    const productMeta = await sharp(productBuffer).metadata();
    
    // Center the product within the available space (accounting for margins)
    const offsetX = marginLeft + Math.round((availableWidth - productMeta.width) / 2);
    const offsetY = marginTop + Math.round((availableHeight - productMeta.height) / 2);
    
    console.log(`📐 Margins: T${marginTop} R${marginRight} B${marginBottom} L${marginLeft} | Available: ${availableWidth}x${availableHeight} | Product: ${productMeta.width}x${productMeta.height} @ (${offsetX}, ${offsetY})`);

    const composites = [
      {
        input: productBuffer,
        left: offsetX,
        top: offsetY,
        blend: 'over'
      }
    ];

    if (settings.logoData) {
      try {
        const logoBuffer = Buffer.from(settings.logoData.split(',')[1], 'base64');
        
        // Logo size is sent as percentage (10-100), convert to pixels
        const logoSizePercent = Number(settings.logoSize) || 50;
        const logoSize = Math.round((canvasSize * logoSizePercent) / 100);
        
        // Logo transparency is sent as percentage (0-100), convert to opacity
        // transparency 0% = fully opaque (opacity 1), transparency 100% = fully transparent (opacity 0)
        const logoTransparency = Number(settings.logoTransparency) || 0;
        const logoOpacity = 1 - (logoTransparency / 100);
        
        let processedLogo = await sharp(logoBuffer)
          .resize(logoSize, logoSize, { fit: 'inside' })
          .png()
          .toBuffer();
        
        // Apply opacity if not 100%
        if (logoOpacity < 1) {
          processedLogo = await sharp(processedLogo)
            .composite([{
              input: Buffer.from([255, 255, 255, Math.round(logoOpacity * 255)]),
              raw: { width: 1, height: 1, channels: 4 },
              tile: true,
              blend: 'dest-in'
            }])
            .toBuffer();
        }

        const logoMeta = await sharp(processedLogo).metadata();
        
        // Calculate logo position based on settings
        const logoPosition = settings.logoPosition || 'center';
        const margin = 50; // Margin from edges
        let logoX, logoY;
        
        switch (logoPosition) {
          case 'top-left':
            logoX = margin;
            logoY = margin;
            break;
          case 'top-right':
            logoX = canvasSize - logoMeta.width - margin;
            logoY = margin;
            break;
          case 'bottom-left':
            logoX = margin;
            logoY = canvasSize - logoMeta.height - margin;
            break;
          case 'bottom-right':
            logoX = canvasSize - logoMeta.width - margin;
            logoY = canvasSize - logoMeta.height - margin;
            break;
          case 'bottom-center':
            logoX = Math.round((canvasSize - logoMeta.width) / 2);
            logoY = canvasSize - logoMeta.height - margin;
            break;
          case 'center':
          default:
            logoX = Math.round((canvasSize - logoMeta.width) / 2);
            logoY = Math.round((canvasSize - logoMeta.height) / 2);
            break;
        }

        composites.push({
          input: processedLogo,
          left: logoX,
          top: logoY,
          blend: 'over'
        });

        console.log(`🏷️ Logo placed at ${logoPosition} (${logoX}, ${logoY}), size: ${logoSizePercent}% (${logoSize}px), transparency: ${logoTransparency}%`);
      } catch (error) {
        console.log(`⚠️ Logo processing failed: ${error.message}`);
      }
    }

    const base = sharp({
      create: {
        width: canvasSize,
        height: canvasSize,
        channels: 4,
        background: backgroundColor
      }
    });

    const finalBuffer = await base
      .composite(composites)
      .jpeg({ quality: Number(settings.quality) || 90 })
      .toBuffer();

    const filename = imageIndex > 1 
      ? `${sanitizeFilename(productTitle)}_${imageIndex}.jpeg`
      : `${sanitizeFilename(productTitle)}.jpeg`;
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, finalBuffer);
    console.log(`💾 Saved ${filepath}`);

    // Handle image upload based on mode
    const uploadMode = settings.imageUploadMode || 'add';
    console.log(`📤 Upload mode: ${uploadMode}`);
    
    try {
      if (uploadMode === 'replace') {
        // Step 1: Delete the old image
        console.log(`🗑️ Deleting old image from Shopify...`);
        const imageId = req.body.imageId; // Frontend should send this
        if (imageId) {
          try {
            await makeShopifyRequest(`https://${SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}/images/${imageId}.json`, {
              method: 'DELETE',
              headers: {
                'X-Shopify-Access-Token': SHOPIFY_TOKEN,
                'Content-Type': 'application/json'
              }
            });
            console.log(`✅ Deleted old image ${imageId}`);
          } catch (delError) {
            console.log(`⚠️ Failed to delete old image: ${delError.message}`);
          }
        }
        
        // Step 2: Upload new image with alt text
        const uploadResponse = await makeShopifyRequest(`https://${SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}/images.json`, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': SHOPIFY_TOKEN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            image: {
              attachment: finalBuffer.toString('base64'),
              filename,
              ...(settings.updateAltText && { alt: productTitle }) // Conditionally add alt text
            }
          })
        });

        if (uploadResponse.ok) {
          const uploadJson = await uploadResponse.json();
          console.log(`✅ Uploaded new image to Shopify: ${uploadJson?.image?.id || 'unknown'}`);
          if (settings.updateAltText) {
            console.log(`📝 Alt text set to: "${productTitle}"`);
          }
        }
      } else {
        // Default: just add as additional image with alt text
        const uploadResponse = await makeShopifyRequest(`https://${SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}/images.json`, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': SHOPIFY_TOKEN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            image: {
              attachment: finalBuffer.toString('base64'),
              filename,
              ...(settings.updateAltText && { alt: productTitle }) // Conditionally add alt text
            }
          })
        });

        if (uploadResponse.ok) {
          const uploadJson = await uploadResponse.json();
          console.log(`✅ Uploaded to Shopify: ${uploadJson?.image?.id || 'unknown'}`);
          if (settings.updateAltText) {
            console.log(`📝 Alt text set to: "${productTitle}"`);
          }
        }
      }
    } catch (error) {
      console.log(`⚠️ Shopify upload failed: ${error.message}`);
    }

         // Add metafield to mark this product as processed
         try {
           const metafieldData = {
             metafield: {
               namespace: 'spm_processing',
               key: 'last_image_processed_at',
               value: new Date().toISOString(),
               type: 'single_line_text_field'
             }
           };

           const response = await makeShopifyRequest(`https://${SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}/metafields.json`, {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json',
               'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN
             },
             body: JSON.stringify(metafieldData)
           });

           console.log(`✅ Added processing metafield to product ${productId}`);
         } catch (error) {
           console.log(`⚠️ Failed to add processing metafield: ${error.message}`);
         }

    res.json({
      success: true,
      processedImageUrl: `http://localhost:${PORT}/uploads/${filename}`,
      filename,
      startedAt: startTime,
      finishedAt: Date.now()
    });
  } catch (error) {
    console.error('❌ Image processing failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/', (_req, res) => {
  res.redirect('/modern.html');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}/modern.html`);
});
