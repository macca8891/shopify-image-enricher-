const axios = require('axios');
require('dotenv').config();

// Get a REAL product ID from your store
const REAL_PRODUCT_ID = process.env.TEST_PRODUCT_ID || 'YOUR_PRODUCT_ID_HERE';
const SHOP_DOMAIN = process.env.SHOP_DOMAIN || 'app-test-1111231295.myshopify.com';

// Real Shopify XML format
const realXml = `<?xml version="1.0" encoding="UTF-8"?>
<rate_request>
  <rate>
    <destination>
      <country>AU</country>
      <province>VIC</province>
      <postal_code>3189</postal_code>
      <city>Moorabbin</city>
    </destination>
    <items>
      <item>
        <variant-id>${REAL_PRODUCT_ID}</variant-id>
        <product-id>${REAL_PRODUCT_ID}</product-id>
        <quantity>1</quantity>
        <grams>500</grams>
        <name>Test Product</name>
      </item>
    </items>
    <currency>AUD</currency>
  </rate>
</rate_request>`;

async function testRealCheckout() {
    try {
        console.log('🧪 Testing with REAL product ID...');
        console.log(`Shop: ${SHOP_DOMAIN}`);
        console.log(`Product ID: ${REAL_PRODUCT_ID}`);
        console.log(`\n📤 Sending request...\n`);
        
        const response = await axios.post(
            `http://localhost:3001/api/shipping/carrier-service?shop=${SHOP_DOMAIN}`,
            realXml,
            {
                headers: {
                    'Content-Type': 'application/xml',
                    'X-Shopify-Shop-Domain': SHOP_DOMAIN
                },
                timeout: 30000
            }
        );
        
        console.log('✅ Response received!');
        console.log(`Status: ${response.status}`);
        
        // Parse XML to count rates
        const rateMatches = response.data.match(/<rate>/g);
        const rateCount = rateMatches ? rateMatches.length : 0;
        console.log(`\n📊 Found ${rateCount} rates in response\n`);
        
        // Extract each rate
        const rateRegex = /<rate>([\s\S]*?)<\/rate>/g;
        let match;
        let rateNum = 1;
        while ((match = rateRegex.exec(response.data)) !== null) {
            const rateXml = match[1];
            const serviceNameMatch = rateXml.match(/<service_name>(.*?)<\/service_name>/);
            const serviceCodeMatch = rateXml.match(/<service_code>(.*?)<\/service_code>/);
            const priceMatch = rateXml.match(/<total_price>(.*?)<\/total_price>/);
            const currencyMatch = rateXml.match(/<currency>(.*?)<\/currency>/);
            const minDateMatch = rateXml.match(/<min_delivery_date>(.*?)<\/min_delivery_date>/);
            const maxDateMatch = rateXml.match(/<max_delivery_date>(.*?)<\/max_delivery_date>/);
            
            const priceCents = priceMatch ? parseInt(priceMatch[1]) : 0;
            const priceDollars = (priceCents / 100).toFixed(2);
            
            console.log(`Rate ${rateNum}:`);
            console.log(`  Service: ${serviceNameMatch ? serviceNameMatch[1] : 'N/A'}`);
            console.log(`  Code: ${serviceCodeMatch ? serviceCodeMatch[1] : 'N/A'}`);
            console.log(`  Price: ${priceDollars} ${currencyMatch ? currencyMatch[1] : ''} (${priceCents} cents)`);
            console.log(`  Delivery: ${minDateMatch ? minDateMatch[1] : 'N/A'} to ${maxDateMatch ? maxDateMatch[1] : 'N/A'}`);
            console.log('');
            rateNum++;
        }
        
        if (rateCount === 0) {
            console.log('❌ NO RATES RETURNED! Check server logs for errors.');
        } else if (rateCount === 1) {
            console.log('⚠️ WARNING: Only 1 rate returned! This matches what you\'re seeing.');
        } else {
            console.log(`✅ ${rateCount} rates returned - but you're only seeing 1 at checkout.`);
            console.log('   This suggests Shopify is filtering/deduplicating rates.');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Response: ${error.response.data}`);
        }
        if (error.code === 'ECONNREFUSED') {
            console.error('\n⚠️ Server is not running! Start it with: node server.js');
        }
    }
}

if (REAL_PRODUCT_ID === 'YOUR_PRODUCT_ID_HERE') {
    console.error('❌ Please set TEST_PRODUCT_ID in .env or pass it as an argument');
    console.error('   Example: TEST_PRODUCT_ID=1234567890 node test-real-checkout.js');
    process.exit(1);
}

testRealCheckout();

