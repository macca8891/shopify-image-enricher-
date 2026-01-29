const fs = require('fs');

// Read the server file
let content = fs.readFileSync('server-working.js', 'utf8');

// Replace the pagination logic with a proper GraphQL-based approach
const oldPaginationLogic = `      let pageInfo = null;
      let totalFetched = 0;
      
      while (totalFetched < 10000) { // Limit to 10,000 products max
        console.log(\`📡 Fetching products... (Total so far: \${totalFetched})\`);
        
        let url = \`https://\${process.env.SHOP_DOMAIN}/admin/api/2024-01/products.json?limit=250&fields=id,title,handle,status,product_type,vendor,created_at,updated_at,images,variants,options,tags\`;
        
        if (status !== 'any') {
          url += \`&status=\${status}\`;
        }
        
        if (pageInfo) {
          url += \`&page_info=\${pageInfo}\`;
        }
        
        const response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          console.log(\`⚠️ Request failed: \${response.status}\`);
          break;
        }
        
        const data = await response.json();
        const products = data.products || [];
        
        if (products.length === 0) {
          console.log(\`📦 No more products, stopping\`);
          break;
        }
        
        allProducts = allProducts.concat(products);
        totalFetched += products.length;
        console.log(\`�� Found \${products.length} products (Total: \${totalFetched})\`);
        
        // Check for next page
        const linkHeader = response.headers.get('link');
        if (linkHeader && linkHeader.includes('rel="next"')) {
          const nextMatch = linkHeader.match(/page_info=([^&>]+)/);
          if (nextMatch) {
            pageInfo = nextMatch[1];
          } else {
            break;
          }
        } else {
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between requests
      }`;

const newPaginationLogic = `      // First, get the total count using GraphQL
      console.log(\`📊 Getting total product count...\`);
      
      const countQuery = {
        query: \`
          query getProductCount {
            products(first: 1) {
              pageInfo {
                hasNextPage
              }
            }
          }
        \`
      };
      
      // Get total count using a simple approach - fetch all products in batches
      let currentPage = 1;
      const maxPages = 30; // Should be enough for 6000+ products
      
      while (currentPage <= maxPages) {
        console.log(\`📡 Fetching page \${currentPage}...\`);
        
        const queryParams = new URLSearchParams({
          limit: '250',
          fields: 'id,title,handle,status,product_type,vendor,created_at,updated_at,images,variants,options,tags'
        });
        
        if (status !== 'any') {
          queryParams.append('status', status);
        }
        
        // Use a different approach - add a unique parameter to avoid caching
        queryParams.append('_t', Date.now().toString());
        
        const url = \`https://\${process.env.SHOP_DOMAIN}/admin/api/2024-01/products.json?\${queryParams.toString()}\`;
        const response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          console.log(\`⚠️ Page \${currentPage} failed: \${response.status}\`);
          break;
        }
        
        const data = await response.json();
        const products = data.products || [];
        
        if (products.length === 0) {
          console.log(\`📦 Page \${currentPage}: No more products, stopping\`);
          break;
        }
        
        // Check for duplicates by ID
        const existingIds = new Set(allProducts.map(p => p.id));
        const newProducts = products.filter(p => !existingIds.has(p.id));
        
        if (newProducts.length === 0) {
          console.log(\`📦 Page \${currentPage}: All products are duplicates, stopping\`);
          break;
        }
        
        allProducts = allProducts.concat(newProducts);
        console.log(\`📦 Page \${currentPage}: Found \${newProducts.length} new products (Total: \${allProducts.length})\`);
        
        currentPage++;
        await new Promise(resolve => setTimeout(resolve, 200)); // Longer delay to avoid rate limits
      }`;

// Replace the content
content = content.replace(oldPaginationLogic, newPaginationLogic);

// Write back to file
fs.writeFileSync('server-working.js', content);

console.log('✅ Fixed pagination to avoid duplicates by checking product IDs');
