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

// Remove background using Picsart API
const removeBackgroundPicsart = async (imageUrl) => {
  try {
    console.log('Removing background using Picsart API...');
    
    // Download the original image first
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }
    
    const imageBuffer = await response.buffer();
    
    // Create form data for Picsart API
    const FormData = require('form-data');
    const form = new FormData();
    form.append('image', imageBuffer, {
      filename: 'image.jpg',
      contentType: 'image/jpeg'
    });
    
    // Call Picsart remove background API
    const picsartResponse = await fetch('https://api.picsart.io/tools/1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Picsart-API-Key': process.env.PICSART_API_KEY,
        ...form.getHeaders()
      },
      body: form
    });
    
    if (!picsartResponse.ok) {
      throw new Error(`Picsart API error: ${picsartResponse.status}`);
    }
    
    const result = await picsartResponse.json();
    
    if (result.data && result.data.url) {
      // Download the processed image
      const processedResponse = await fetch(result.data.url);
      if (!processedResponse.ok) {
        throw new Error(`Failed to download processed image: ${processedResponse.status}`);
      }
      return await processedResponse.buffer();
    } else {
      throw new Error('No processed image URL returned from Picsart');
    }
    
  } catch (error) {
    console.error('Picsart background removal error:', error.message);
    // Fallback to original image
    console.log('Falling back to original image');
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download original image: ${response.status}`);
    }
    return await response.buffer();
  }
};

// Remove.bg API integration (with fallback)
const removeBackground = async (imageUrl) => {
  try {
    console.log('Removing background from:', imageUrl);
    
    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.REMOVE_BG_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url: imageUrl,
        size: 'full',
        format: 'png'
      })
    });

    if (!response.ok) {
      if (response.status === 402) {
        console.log('Remove.bg credits exhausted, using original image');
        // Fallback: download original image
        const imageResponse = await fetch(imageUrl);
        return await imageResponse.buffer();
      }
      throw new Error(`Remove.bg API error: ${response.status}`);
    }

    const buffer = await response.buffer();
    return buffer;
  } catch (error) {
    console.error('Remove.bg error:', error);
    // Fallback: download original image
    console.log('Using fallback: downloading original image');
    try {
      const imageResponse = await fetch(imageUrl);
      return await imageResponse.buffer();
    } catch (fallbackError) {
      throw new Error(`Failed to process image: ${error.message}`);
    }
  }
};

// Enhanced image processing with Sharp
const processImage = async (imageBuffer, options = {}) => {
  const {
    width = 2048,
    height = 2048,
    backgroundColor = '#FFFFFF',
    watermarkText = '',
    watermarkOpacity = 0.3,
    watermarkScale = 0.5,
    logoScale = 0.3,
    format = 'png',
    margin = 50,
    removeBackground = false,
    addBackground = true,
    addText = '',
    addLogo = '',
    resizeMode = 'contain',
    quality = 90,
    sharpen = false,
    enhanceQuality = false
  } = options;

  let pipeline = sharp(imageBuffer);

  // Enhance image quality if requested
  if (enhanceQuality) {
    pipeline = pipeline.sharpen(1.0).normalize();
  }

  // Apply sharpening if requested
  if (sharpen) {
    pipeline = pipeline.sharpen(0.5);
  }

  // Calculate dimensions with margin
  const canvasWidth = width;
  const canvasHeight = height;
  const contentWidth = width - (margin * 2);
  const contentHeight = height - (margin * 2);

  // Resize image to fit within margins with consistent centering
  pipeline = pipeline.resize(contentWidth, contentHeight, {
    fit: 'contain', // Always use contain for consistent centering
    background: backgroundColor,
    withoutEnlargement: true
  });

  // Add logo watermark if specified (overlay on top of the actual product image)
  if (addLogo && addLogo.trim() !== '') {
    try {
      // Load the logo file
      const logoBuffer = await fs.readFile(addLogo);
      
      // Resize logo to appropriate size based on logoScale
      const logoSize = Math.min(contentWidth, contentHeight) * logoScale;
      const resizedLogo = await sharp(logoBuffer)
        .resize(logoSize, logoSize, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toBuffer();

      // Composite logo onto the resized product image
      pipeline = pipeline.composite([{
        input: resizedLogo,
        blend: 'over',
        gravity: 'center' // Center the logo
      }]);
      
      console.log('Logo watermark applied successfully');
    } catch (logoError) {
      console.error('Error applying logo watermark:', logoError.message);
      // Continue without logo if there's an error
    }
  }

  // Add text watermark if specified (overlay on top of the actual product image)
  if (watermarkText && watermarkText.trim() !== '') {
    // Create watermark SVG with exact content dimensions
    const fontSize = Math.min(contentWidth, contentHeight) * watermarkScale;
    const watermarkSvg = `
      <svg width="${contentWidth}" height="${contentHeight}" xmlns="http://www.w3.org/2000/svg">
        <text x="${contentWidth/2}" y="${contentHeight/2}" 
              text-anchor="middle" 
              dominant-baseline="middle"
              font-family="Arial, sans-serif"
              font-size="${fontSize}"
              fill="rgba(0,0,0,${watermarkOpacity})"
              transform="rotate(-45 ${contentWidth/2} ${contentHeight/2})">
          ${watermarkText}
        </text>
      </svg>
    `;

    // Convert SVG to PNG with exact content dimensions
    const watermarkBuffer = await sharp(Buffer.from(watermarkSvg))
      .resize(contentWidth, contentHeight)
      .png()
      .toBuffer();

    // Composite watermark directly onto the resized product image
    pipeline = pipeline.composite([{
      input: watermarkBuffer,
      blend: 'over'
    }]);
  }

  // Create canvas with background (only if addBackground is true)
  let canvas;
  if (addBackground) {
    canvas = sharp({
      create: {
        width: canvasWidth,
        height: canvasHeight,
        channels: 4,
        background: backgroundColor
      }
    });
  } else {
    // Use the resized image directly as canvas
    canvas = pipeline;
  }

  // Composite the resized image onto the canvas with margins (only if addBackground is true)
  if (addBackground) {
    canvas = canvas.composite([{
      input: await pipeline.toBuffer(),
      top: margin,
      left: margin,
      blend: 'over'
    }]);
  }

  // Add custom text if specified
  if (addText) {
    const textSvg = `
      <svg width="${canvasWidth}" height="${canvasHeight}">
        <text x="50%" y="90%" 
              text-anchor="middle" 
              dominant-baseline="middle"
              font-family="Arial, sans-serif"
              font-size="24"
              fill="rgba(0,0,0,0.8)"
              font-weight="bold">
          ${addText}
        </text>
      </svg>
    `;

    canvas = canvas.composite([{
      input: Buffer.from(textSvg),
      blend: 'over'
    }]);
  }

  // Convert format with quality settings (preserve quality)
  if (format === 'jpg' || format === 'jpeg') {
    canvas = canvas.jpeg({ quality: quality, mozjpeg: true });
  } else if (format === 'webp') {
    canvas = canvas.webp({ quality: quality });
  } else {
    // PNG doesn't use quality setting, use compression level instead
    canvas = canvas.png({ compressionLevel: 6, adaptiveFiltering: false });
  }

  return await canvas.toBuffer();
};

// Upload image to Shopify (working approach)
const uploadImageToShopify = async (productId, imageBuffer, filename, imageReplacement = 'overwrite') => {
  try {
    console.log(`Uploading processed image to Shopify (replacement mode: ${imageReplacement})...`);
    
    // Save the processed image locally so you can see the result
    const outputPath = path.join('uploads', `processed-${productId}-${filename}`);
    await fs.writeFile(outputPath, imageBuffer);
    console.log(`Processed image saved to: ${outputPath}`);
    
    // Try to upload to Shopify using a different approach
    try {
      // Create a base64 encoded image for Shopify
      const base64Image = imageBuffer.toString('base64');
      const dataUri = `data:image/png;base64,${base64Image}`;
      
      // Handle different replacement modes
      let uploadResponse;
      
      if (imageReplacement === 'hide') {
        // Hide mode: Get existing images first, then hide them and add new one
        console.log('Hide mode: Fetching existing images...');
        
        const productResponse = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products/${productId}.json`, {
          headers: {
            'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
            'Content-Type': 'application/json'
          }
        });
        
        if (productResponse.ok) {
          const productData = await productResponse.json();
          const existingImages = productData.product.images || [];
          
          // Hide all existing images
          for (const image of existingImages) {
            try {
              await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products/${productId}/images/${image.id}.json`, {
                method: 'PUT',
                headers: {
                  'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  image: {
                    id: image.id,
                    alt: image.alt || '',
                    position: 999 // Move to end
                  }
                })
              });
              console.log(`Hidden existing image ${image.id}`);
            } catch (error) {
              console.log(`Could not hide image ${image.id}:`, error.message);
            }
          }
        }
        
        // Add new image as primary
        uploadResponse = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products/${productId}/images.json`, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            image: {
              attachment: base64Image,
              filename: filename,
              position: 1 // Make it primary
            }
          })
        });
      } else {
        // Overwrite mode: Replace existing images
        console.log('Overwrite mode: Replacing existing images...');
        
        // First, delete all existing images
        const productResponse = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products/${productId}.json`, {
          headers: {
            'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
            'Content-Type': 'application/json'
          }
        });
        
        if (productResponse.ok) {
          const productData = await productResponse.json();
          const existingImages = productData.product.images || [];
          
          // Delete all existing images
          for (const image of existingImages) {
            try {
              await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products/${productId}/images/${image.id}.json`, {
                method: 'DELETE',
                headers: {
                  'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
                  'Content-Type': 'application/json'
                }
              });
              console.log(`Deleted existing image ${image.id}`);
            } catch (error) {
              console.log(`Could not delete image ${image.id}:`, error.message);
            }
          }
        }
        
        // Add new image
        uploadResponse = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products/${productId}/images.json`, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            image: {
              attachment: base64Image,
              filename: filename
            }
          })
        });
      }

      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        console.log('Image uploaded to Shopify successfully');
        return {
          success: true,
          message: 'Image processed and uploaded to Shopify successfully',
          productId,
          filename,
          localPath: outputPath,
          shopifyImage: uploadData.image
        };
      } else {
        const errorText = await uploadResponse.text();
        console.log('Shopify upload failed, but image processed successfully');
        console.log('Upload error:', errorText);
        return {
          success: true,
          message: 'Image processed successfully (Shopify upload failed)',
          productId,
          filename,
          localPath: outputPath,
          uploadError: errorText
        };
      }
    } catch (uploadError) {
      console.log('Shopify upload error:', uploadError.message);
      return {
        success: true,
        message: 'Image processed successfully (Shopify upload failed)',
        productId,
        filename,
        localPath: outputPath,
        uploadError: uploadError.message
      };
    }
    
    /* Original upload code - commented out due to 406 error
    // Create a temporary file for upload
    const tempPath = path.join('uploads', `temp-${Date.now()}-${filename}`);
    await fs.writeFile(tempPath, imageBuffer);

    // Create form data for file upload
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', await fs.readFile(tempPath), filename);

    const uploadResponse = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/files.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
        ...formData.getHeaders()
      },
      body: formData
    });

    // Clean up temp file
    await fs.unlink(tempPath);

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Upload response error:', errorText);
      throw new Error(`File upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadData = await uploadResponse.json();
    const fileUrl = uploadData.file.url;

    // Then add the image to the product
    const productResponse = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products/${productId}.json`, {
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product: {
          id: productId,
          images: [{
            src: fileUrl,
            alt: filename
          }]
        }
      })
    });

    if (!productResponse.ok) {
      const errorText = await productResponse.text();
      console.error('Product update error:', errorText);
      throw new Error(`Product update failed: ${productResponse.status} - ${errorText}`);
    }

    return await productResponse.json();
    */
  } catch (error) {
    console.error('Shopify upload error:', error);
    throw error;
  }
};

// Get all products across all pages for comprehensive filtering
app.get('/api/all-products', async (req, res) => {
  try {
    const { 
      status = 'any', 
      product_type = '', 
      vendor = '',
      created_at_min = '',
      created_at_max = '',
      updated_at_min = '',
      updated_at_max = '',
      metafield = '',
      metafieldValue = '',
      image_size_min = '',
      image_size_max = '',
      image_type = '',
      fields = 'id,title,handle,status,product_type,vendor,created_at,updated_at,images,variants,options,tags'
    } = req.query;

    let allProducts = [];
    let pageInfo = null;
    let pageCount = 0;

    console.log('Starting comprehensive product search...');
    
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

    // Fetch all products across all pages
    do {
      pageCount++;
      console.log(`Fetching page ${pageCount}...`);

      // Build query parameters for this page
      queryParams = new URLSearchParams({
        limit: '250',
        fields: fields
      });

      // Add pagination
      if (pageInfo) {
        queryParams.append('page_info', pageInfo);
      }

      // Add basic filters (these work at API level)
      if (status !== 'any') {
        queryParams.append('status', status);
      }
      if (product_type) {
        queryParams.append('product_type', product_type);
      }
      if (vendor) {
        queryParams.append('vendor', vendor);
      }
      if (created_at_min) {
        queryParams.append('created_at_min', created_at_min);
      }
      if (created_at_max) {
        queryParams.append('created_at_max', created_at_max);
      }
      if (updated_at_min) {
        queryParams.append('updated_at_min', updated_at_min);
      }
      if (updated_at_max) {
        queryParams.append('updated_at_max', updated_at_max);
      }

      url = `https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products.json?${queryParams.toString()}`;
      
      response = await fetch(url, {
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
              const nextPageUrl = new URL(cleanUrl);
              pageInfo = nextPageUrl.searchParams.get('page_info');
              console.log(`Found next page info: ${pageInfo}`);
            }
          });
        } else {
          console.log('No link header found');
        }

      // Safety limit to prevent infinite loops
      if (pageCount > 50) {
        console.log('Reached safety limit of 50 pages');
        break;
      }

    } while (pageInfo);

    console.log(`Total products fetched: ${allProducts.length} across ${pageCount} pages`);

    // Apply client-side filters for meta fields and image properties
    let filteredProducts = allProducts;
    
    // Apply status filter first (this reduces the number of products we need to check for metafields)
    if (status !== 'any') {
      console.log(`Filtering by status: ${status}`);
      const beforeCount = filteredProducts.length;
      filteredProducts = filteredProducts.filter(product => product.status === status);
      console.log(`After status filtering: ${filteredProducts.length} products (was ${beforeCount})`);
    }
    
    // Filter by meta fields with rate limiting
    if (metafield && metafieldValue) {
      console.log(`Filtering by metafield: ${metafield} = ${metafieldValue}`);
      console.log(`Processing ${filteredProducts.length} products using optimized metafield search...`);
      
      // Update progress tracking
      searchProgress.totalProducts = filteredProducts.length;
      searchProgress.totalBatches = 1; // We'll do this in one go
      
      const matchingProducts = [];
      
      try {
        // Get ALL metafields for the specific key we're looking for
        console.log(`Fetching all metafields with key: ${metafield}`);
        
        let allMetafields = [];
        let pageInfo = null;
        let pageCount = 0;
        
        do {
          pageCount++;
          console.log(`Fetching metafields page ${pageCount}...`);
          
          const queryParams = new URLSearchParams({
            'metafield[owner_resource]': 'product',
            'metafield[key]': metafield,
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
          field.value.toLowerCase().includes(metafieldValue.toLowerCase())
        );
        
        console.log(`Metafields matching value "${metafieldValue}": ${matchingMetafields.length}`);
        
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
    
    // Filter by image size
    if (image_size_min || image_size_max) {
      const minSize = image_size_min ? parseInt(image_size_min) : 0;
      const maxSize = image_size_max ? parseInt(image_size_max) : Infinity;
      console.log(`Filtering by image size: ${minSize} - ${maxSize}`);
      
      filteredProducts = filteredProducts.filter(product => {
        if (!product.images || !product.images.length) return false;
        
        return product.images.some(image => {
          const size = image.width * image.height;
          return size >= minSize && size <= maxSize;
        });
      });
      console.log(`After image size filtering: ${filteredProducts.length} products`);
    }
    
    // Filter by image type
    if (image_type) {
      console.log(`Filtering by image type: ${image_type}`);
      filteredProducts = filteredProducts.filter(product => {
        if (!product.images || !product.images.length) return false;
        
        return product.images.some(image => {
          const url = image.src.toLowerCase();
          if (image_type === 'jpg' || image_type === 'jpeg') {
            return url.includes('.jpg') || url.includes('.jpeg');
          } else if (image_type === 'png') {
            return url.includes('.png');
          } else if (image_type === 'webp') {
            return url.includes('.webp');
          } else if (image_type === 'gif') {
            return url.includes('.gif');
          }
          return false;
        });
      });
      console.log(`After image type filtering: ${filteredProducts.length} products`);
    }

    // Mark search as complete
    searchProgress.isRunning = false;
    searchProgress.foundProducts = filteredProducts.length;

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

// Get metafield keys for filtering
app.get('/api/metafield-keys', async (req, res) => {
  try {
    console.log('Fetching metafield keys...');
    
    // Fetch a sample of products to find metafield keys
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
        
        // Small delay to avoid rate limits
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

// Get product metadata (types, vendors, etc.)
app.get('/api/product-metadata', async (req, res) => {
  try {
    console.log('Fetching product metadata...');
    
    // Fetch a sample of products to get metadata
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

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
