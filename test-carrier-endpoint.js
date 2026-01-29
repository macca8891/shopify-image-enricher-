const axios = require('axios');
const fs = require('fs');

// Mock Shopify XML request
const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
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
        <variant-id>1234567890</variant-id>
        <product-id>9876543210</product-id>
        <quantity>1</quantity>
        <grams>500</grams>
        <name>Test Product</name>
      </item>
    </items>
    <currency>AUD</currency>
  </rate>
</rate_request>`;

async function testEndpoint() {
    try {
        console.log('🧪 Testing carrier service endpoint...');
        console.log(`URL: http://localhost:3001/api/shipping/carrier-service?shop=app-test-1111231295.myshopify.com`);
        console.log(`\n📤 Sending mock XML request...\n`);
        
        const response = await axios.post(
            'http://localhost:3001/api/shipping/carrier-service?shop=app-test-1111231295.myshopify.com',
            mockXml,
            {
                headers: {
                    'Content-Type': 'application/xml',
                    'X-Shopify-Shop-Domain': 'app-test-1111231295.myshopify.com'
                },
                timeout: 30000
            }
        );
        
        console.log('✅ Response received!');
        console.log(`Status: ${response.status}`);
        console.log(`\n📥 XML Response:\n${response.data}\n`);
        
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
            
            console.log(`Rate ${rateNum}:`);
            console.log(`  Service: ${serviceNameMatch ? serviceNameMatch[1] : 'N/A'}`);
            console.log(`  Code: ${serviceCodeMatch ? serviceCodeMatch[1] : 'N/A'}`);
            console.log(`  Price: ${priceMatch ? (parseInt(priceMatch[1]) / 100).toFixed(2) : 'N/A'} ${currencyMatch ? currencyMatch[1] : ''}`);
            console.log(`  Delivery: ${minDateMatch ? minDateMatch[1] : 'N/A'} to ${maxDateMatch ? maxDateMatch[1] : 'N/A'}`);
            console.log('');
            rateNum++;
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

testEndpoint();

