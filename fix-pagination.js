const fs = require('fs');

// Read the server file
let content = fs.readFileSync('server-working.js', 'utf8');

// Replace the pagination logic to use page_info cursors
const oldPaginationLogic = `        while (currentPage <= maxPages) {
          console.log(\`📡 Fetching \${statusToFetch} page \${currentPage}...\`);
          
          const queryParams = new URLSearchParams({
            limit: '250',
            fields: 'id,title,handle,status,product_type,vendor,created_at,updated_at,images,variants,options,tags',
            status: statusToFetch
          });
          
          const url = \`https://\${process.env.SHOP_DOMAIN}/admin/api/2024-01/products.json?\${queryParams.toString()}\`;
          const response = await fetch(url, {
            headers: {
              'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            console.log(\`⚠️ \${statusToFetch} page \${currentPage} failed: \${response.status}\`);
            break;
          }
          
          const data = await response.json();
          const products = data.products || [];
          
          if (products.length === 0) {
            console.log(\`📦 \${statusToFetch} page \${currentPage}: No more products, stopping\`);
            break;
          }
          
          // Add products to map (automatically handles duplicates by ID)
          products.forEach(product => {
            productMap.set(product.id, product);
          });
          
          console.log(\`📦 \${statusToFetch} page \${currentPage}: Found \${products.length} products (Unique total: \${productMap.size})\`);
          
          currentPage++;
          await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between requests
        }`;

const newPaginationLogic = `        let nextPageUrl = null;
        let pageCount = 0;
        
        // Initial request
        const queryParams = new URLSearchParams({
          limit: '250',
          fields: 'id,title,handle,status,product_type,vendor,created_at,updated_at,images,variants,options,tags'
        });
        
        if (statusToFetch !== 'any') {
          queryParams.append('status', statusToFetch);
        }
        
        let url = \`https://\${process.env.SHOP_DOMAIN}/admin/api/2024-01/products.json?\${queryParams.toString()}\`;
        
        while (url && pageCount < maxPages) {
          pageCount++;
          console.log(\`📡 Fetching \${statusToFetch} page \${pageCount}...\`);
          
          const response = await fetch(url, {
            headers: {
              'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            console.log(\`⚠️ \${statusToFetch} page \${pageCount} failed: \${response.status}\`);
            break;
          }
          
          const data = await response.json();
          const products = data.products || [];
          
          if (products.length === 0) {
            console.log(\`📦 \${statusToFetch} page \${pageCount}: No more products, stopping\`);
            break;
          }
          
          // Add products to map (automatically handles duplicates by ID)
          products.forEach(product => {
            productMap.set(product.id, product);
          });
          
          console.log(\`📦 \${statusToFetch} page \${pageCount}: Found \${products.length} products (Unique total: \${productMap.size})\`);
          
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
        }`;

content = content.replace(oldPaginationLogic, newPaginationLogic);

// Write back to file
fs.writeFileSync('server-working.js', content);

console.log('✅ Fixed pagination to use page_info cursors');
