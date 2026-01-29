require('dotenv').config();

const SHOP_DOMAIN = process.env.SHOP_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;
const SHOPIFY_API_VERSION = '2024-01';

async function makeShopifyRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_TOKEN,
      ...options.headers
    }
  });

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After') || 1;
    console.log(`⏳ Rate limited, waiting ${retryAfter} seconds...`);
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return makeShopifyRequest(url, options);
  }

  return response;
}

async function addProcessingMetafield(productId) {
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
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metafieldData)
    });

    if (response.ok) {
      console.log(`✅ Added processing metafield to product ${productId}`);
      return true;
    } else {
      const error = await response.text();
      console.log(`❌ Failed to add metafield for ${productId}: ${error}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error adding metafield for ${productId}: ${error.message}`);
    return false;
  }
}

async function getAllProducts() {
  console.log('📦 Fetching all products to identify processed ones...');
  
  let allProducts = [];
  let hasNextPage = true;
  let cursor = null;
  
  while (hasNextPage) {
    const query = `
      query getProducts($cursor: String) {
        products(first: 250, after: $cursor) {
          edges {
            node {
              id
              legacyResourceId
              title
              images(first: 10) {
                edges {
                  node {
                    id
                    url
                    createdAt
                  }
                }
              }
              metafields(first: 10, namespace: "spm_processing") {
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
    `;

    const response = await makeShopifyRequest(`https://${SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, variables: { cursor } })
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status}`);
    }

    const data = await response.json();
    const products = data.data.products.edges.map(edge => edge.node);
    
    allProducts.push(...products);
    
    hasNextPage = data.data.products.pageInfo.hasNextPage;
    cursor = data.data.products.pageInfo.endCursor;
    
    console.log(`📦 Fetched ${allProducts.length} products so far...`);
  }
  
  return allProducts;
}

async function identifyProcessedProducts(products) {
  console.log('🔍 Identifying products that have been processed...');
  
  const processedProducts = [];
  const recentDate = new Date('2025-01-28T00:00:00Z'); // Recent date when processing happened
  
  for (const product of products) {
    // Check if product already has processing metafield
    const hasProcessingMetafield = product.metafields.edges.some(
      edge => edge.node.key === 'last_image_processed_at'
    );
    
    if (hasProcessingMetafield) {
      continue; // Skip if already tagged
    }
    
    // Check if product has recent images (indicating recent processing)
    const hasRecentImages = product.images.edges.some(edge => {
      const imageDate = new Date(edge.node.createdAt);
      return imageDate > recentDate;
    });
    
    if (hasRecentImages) {
      processedProducts.push(product.legacyResourceId);
    }
  }
  
  console.log(`🎯 Found ${processedProducts.length} products that need processing metafields`);
  return processedProducts;
}

async function processProducts() {
  console.log('🚀 Starting comprehensive metafield backfill...');
  
  try {
    const allProducts = await getAllProducts();
    const productIds = await identifyProcessedProducts(allProducts);
    
    if (productIds.length === 0) {
      console.log('✅ No products need processing metafields');
      return;
    }
    
    let successCount = 0;
    let totalCount = productIds.length;
    
    console.log(`📝 Processing ${totalCount} products...`);
    
    for (let i = 0; i < productIds.length; i++) {
      const productId = productIds[i];
      console.log(`📝 Processing ${i + 1}/${totalCount}: Product ${productId}`);
      
      const success = await addProcessingMetafield(productId);
      if (success) {
        successCount++;
      }
      
      // Small delay between requests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`🎉 Completed! Successfully updated ${successCount}/${totalCount} products`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

// Run the backfill
processProducts().catch(console.error);


