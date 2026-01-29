const axios = require('axios');
const xml2js = require('xml2js');

// Configuration
const SERVER_URL = 'http://localhost:3001';
const SHOP_DOMAIN = 'spare-part-mart.myshopify.com'; // Your shop domain

// Test countries - major destinations
const TEST_COUNTRIES = [
    { code: 'AU', name: 'Australia', province: 'VIC', postcode: '3000', city: 'Melbourne' },
    { code: 'US', name: 'United States', province: 'CA', postcode: '90210', city: 'Beverly Hills' },
    { code: 'GB', name: 'United Kingdom', province: 'England', postcode: 'SW1A 1AA', city: 'London' },
    { code: 'CA', name: 'Canada', province: 'ON', postcode: 'M5H 2N2', city: 'Toronto' },
    { code: 'DE', name: 'Germany', province: '', postcode: '10115', city: 'Berlin' },
    { code: 'FR', name: 'France', province: '', postcode: '75001', city: 'Paris' },
    { code: 'IT', name: 'Italy', province: '', postcode: '00118', city: 'Rome' },
    { code: 'ES', name: 'Spain', province: '', postcode: '28001', city: 'Madrid' },
    { code: 'NL', name: 'Netherlands', province: '', postcode: '1012 AB', city: 'Amsterdam' },
    { code: 'BE', name: 'Belgium', province: '', postcode: '1000', city: 'Brussels' },
    { code: 'CH', name: 'Switzerland', province: '', postcode: '8001', city: 'Zurich' },
    { code: 'AT', name: 'Austria', province: '', postcode: '1010', city: 'Vienna' },
    { code: 'SE', name: 'Sweden', province: '', postcode: '111 57', city: 'Stockholm' },
    { code: 'NO', name: 'Norway', province: '', postcode: '0150', city: 'Oslo' },
    { code: 'DK', name: 'Denmark', province: '', postcode: '1050', city: 'Copenhagen' },
    { code: 'FI', name: 'Finland', province: '', postcode: '00100', city: 'Helsinki' },
    { code: 'PL', name: 'Poland', province: '', postcode: '00-001', city: 'Warsaw' },
    { code: 'CZ', name: 'Czech Republic', province: '', postcode: '110 00', city: 'Prague' },
    { code: 'IE', name: 'Ireland', province: '', postcode: 'D02', city: 'Dublin' },
    { code: 'PT', name: 'Portugal', province: '', postcode: '1100-001', city: 'Lisbon' },
    { code: 'GR', name: 'Greece', province: '', postcode: '104 31', city: 'Athens' },
    { code: 'NZ', name: 'New Zealand', province: 'Auckland', postcode: '1010', city: 'Auckland' },
    { code: 'JP', name: 'Japan', province: 'Tokyo', postcode: '100-0001', city: 'Tokyo' },
    { code: 'KR', name: 'South Korea', province: 'Seoul', postcode: '04533', city: 'Seoul' },
    { code: 'SG', name: 'Singapore', province: '', postcode: '018956', city: 'Singapore' },
    { code: 'MY', name: 'Malaysia', province: 'Selangor', postcode: '50000', city: 'Kuala Lumpur' },
    { code: 'TH', name: 'Thailand', province: 'Bangkok', postcode: '10100', city: 'Bangkok' },
    { code: 'PH', name: 'Philippines', province: 'Metro Manila', postcode: '1000', city: 'Manila' },
    { code: 'ID', name: 'Indonesia', province: 'Jakarta', postcode: '10110', city: 'Jakarta' },
    { code: 'IN', name: 'India', province: 'Maharashtra', postcode: '400001', city: 'Mumbai' },
    { code: 'CN', name: 'China', province: 'Beijing', postcode: '100000', city: 'Beijing' },
    { code: 'HK', name: 'Hong Kong', province: '', postcode: '999077', city: 'Hong Kong' },
    { code: 'TW', name: 'Taiwan', province: 'Taipei', postcode: '100', city: 'Taipei' },
    { code: 'MX', name: 'Mexico', province: 'CDMX', postcode: '06000', city: 'Mexico City' },
    { code: 'BR', name: 'Brazil', province: 'SP', postcode: '01310-100', city: 'São Paulo' },
    { code: 'AR', name: 'Argentina', province: 'Buenos Aires', postcode: 'C1000', city: 'Buenos Aires' },
    { code: 'CL', name: 'Chile', province: 'Santiago', postcode: '8320000', city: 'Santiago' },
    { code: 'CO', name: 'Colombia', province: 'Bogotá', postcode: '110111', city: 'Bogotá' },
    { code: 'ZA', name: 'South Africa', province: 'Gauteng', postcode: '2001', city: 'Johannesburg' },
    { code: 'AE', name: 'United Arab Emirates', province: 'Dubai', postcode: '00000', city: 'Dubai' },
    { code: 'SA', name: 'Saudi Arabia', province: 'Riyadh', postcode: '11564', city: 'Riyadh' },
    { code: 'IL', name: 'Israel', province: '', postcode: '9100001', city: 'Jerusalem' },
    { code: 'TR', name: 'Turkey', province: 'Istanbul', postcode: '34000', city: 'Istanbul' },
    { code: 'RU', name: 'Russia', province: 'Moscow', postcode: '101000', city: 'Moscow' },
    { code: 'FJ', name: 'Fiji', province: '', postcode: '00000', city: 'Suva' },
];

// Origin address (your warehouse)
const ORIGIN = {
    country: 'AU',
    province: 'VIC',
    postal_code: '3189',
    city: 'Moorabbin',
    address1: '18 Joan Street',
    company_name: 'Spare Part Mart'
};

// Test product (air filter cartridge)
const TEST_ITEM = {
    'variant-id': '1234567890',
    'product-id': '9876543210',
    quantity: 1,
    grams: 480, // 0.48 kg
    name: 'SPM-AFC-1006 Air Filter Cartridge'
};

function generateMockXml(country, currency = 'USD') {
    return `<?xml version="1.0" encoding="UTF-8"?>
<rate_request>
  <rate>
    <origin>
      <country>${ORIGIN.country}</country>
      <province>${ORIGIN.province}</province>
      <postal_code>${ORIGIN.postal_code}</postal_code>
      <city>${ORIGIN.city}</city>
      <address1>${ORIGIN.address1}</address1>
      <company_name>${ORIGIN.company_name}</company_name>
    </origin>
    <destination>
      <country>${country.code}</country>
      ${country.province ? `<province>${country.province}</province>` : ''}
      <postal_code>${country.postcode}</postal_code>
      <city>${country.city}</city>
      <address1>123 Main Street</address1>
    </destination>
    <items>
      <item>
        <variant-id>${TEST_ITEM['variant-id']}</variant-id>
        <product-id>${TEST_ITEM['product-id']}</product-id>
        <quantity>${TEST_ITEM.quantity}</quantity>
        <grams>${TEST_ITEM.grams}</grams>
        <name>${TEST_ITEM.name}</name>
      </item>
    </items>
    <currency>${currency}</currency>
  </rate>
</rate_request>`;
}

async function testCountry(country, currency = 'USD') {
    try {
        const xml = generateMockXml(country, currency);
        const url = `${SERVER_URL}/api/shipping/carrier-service?shop=${SHOP_DOMAIN}`;
        
        const response = await axios.post(url, xml, {
            headers: {
                'Content-Type': 'application/xml',
                'X-Shopify-Shop-Domain': SHOP_DOMAIN
            },
            timeout: 30000
        });
        
        // Parse JSON response (the endpoint returns JSON, not XML)
        let rateCount = 0;
        let rates = [];
        
        if (typeof response.data === 'string') {
            // Try to parse as JSON
            try {
                const jsonData = JSON.parse(response.data);
                if (jsonData.rates && Array.isArray(jsonData.rates)) {
                    rateCount = jsonData.rates.length;
                    rates = jsonData.rates.map(rate => ({
                        service_name: rate.service_name || 'N/A',
                        service_code: rate.service_code || 'N/A',
                        total_price: rate.total_price || '0',
                        currency: rate.currency || 'CNY',
                        min_delivery_date: rate.min_delivery_date || 'N/A',
                        max_delivery_date: rate.max_delivery_date || 'N/A'
                    }));
                }
            } catch (e) {
                // If not JSON, might be XML - try XML parser
                const parser = new xml2js.Parser();
                const result = await parser.parseStringPromise(response.data);
                
                if (result.rate_response && result.rate_response.rate) {
                    const rateArray = Array.isArray(result.rate_response.rate) 
                        ? result.rate_response.rate 
                        : [result.rate_response.rate];
                    
                    rateCount = rateArray.length;
                    rates = rateArray.map(rate => ({
                        service_name: rate.service_name?.[0] || 'N/A',
                        service_code: rate.service_code?.[0] || 'N/A',
                        total_price: rate.total_price?.[0] || '0',
                        currency: rate.currency?.[0] || 'CNY',
                        min_delivery_date: rate.min_delivery_date?.[0] || 'N/A',
                        max_delivery_date: rate.max_delivery_date?.[0] || 'N/A'
                    }));
                }
            }
        } else if (response.data && response.data.rates) {
            // Already JSON object
            rateCount = response.data.rates.length;
            rates = response.data.rates.map(rate => ({
                service_name: rate.service_name || 'N/A',
                service_code: rate.service_code || 'N/A',
                total_price: rate.total_price || '0',
                currency: rate.currency || 'CNY',
                min_delivery_date: rate.min_delivery_date || 'N/A',
                max_delivery_date: rate.max_delivery_date || 'N/A'
            }));
        }
        
        return {
            success: true,
            country: country.name,
            code: country.code,
            rateCount,
            rates,
            hasRates: rateCount > 0,
            error: null
        };
    } catch (error) {
        return {
            success: false,
            country: country.name,
            code: country.code,
            rateCount: 0,
            rates: [],
            hasRates: false,
            error: error.message || 'Unknown error'
        };
    }
}

async function testAllCountries() {
    console.log('🧪 Testing Carrier Service Endpoint for All Countries\n');
    console.log(`Server: ${SERVER_URL}`);
    console.log(`Shop: ${SHOP_DOMAIN}`);
    console.log(`Testing ${TEST_COUNTRIES.length} countries...\n`);
    console.log('='.repeat(80) + '\n');
    
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    let noRatesCount = 0;
    
    for (let i = 0; i < TEST_COUNTRIES.length; i++) {
        const country = TEST_COUNTRIES[i];
        process.stdout.write(`[${i + 1}/${TEST_COUNTRIES.length}] ${country.name} (${country.code})... `);
        
        const result = await testCountry(country);
        results.push(result);
        
        if (!result.success) {
            console.log(`❌ ERROR: ${result.error}`);
            failureCount++;
        } else if (!result.hasRates) {
            console.log(`⚠️  NO RATES (${result.rateCount} returned)`);
            noRatesCount++;
        } else {
            console.log(`✅ ${result.rateCount} rates`);
            successCount++;
            
            // Show first 3 rates
            if (result.rates.length > 0) {
                const preview = result.rates.slice(0, 3).map(r => 
                    `  • ${r.service_name}: ${(parseInt(r.total_price) / 100).toFixed(2)} ${r.currency}`
                ).join('\n');
                console.log(preview);
            }
        }
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY REPORT');
    console.log('='.repeat(80) + '\n');
    
    console.log(`✅ Countries with rates: ${successCount}`);
    console.log(`⚠️  Countries with no rates: ${noRatesCount}`);
    console.log(`❌ Countries with errors: ${failureCount}`);
    console.log(`📈 Success rate: ${((successCount / TEST_COUNTRIES.length) * 100).toFixed(1)}%\n`);
    
    // Detailed breakdown
    console.log('\n✅ COUNTRIES WITH RATES:');
    results.filter(r => r.hasRates).forEach(r => {
        console.log(`  ${r.country} (${r.code}): ${r.rateCount} rates`);
    });
    
    if (noRatesCount > 0) {
        console.log('\n⚠️  COUNTRIES WITH NO RATES:');
        results.filter(r => r.success && !r.hasRates).forEach(r => {
            console.log(`  ${r.country} (${r.code})`);
        });
    }
    
    if (failureCount > 0) {
        console.log('\n❌ COUNTRIES WITH ERRORS:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`  ${r.country} (${r.code}): ${r.error}`);
        });
    }
    
    // Save detailed report
    const fs = require('fs');
    const report = {
        timestamp: new Date().toISOString(),
        totalCountries: TEST_COUNTRIES.length,
        successCount,
        noRatesCount,
        failureCount,
        results: results.map(r => ({
            country: r.country,
            code: r.code,
            success: r.success,
            rateCount: r.rateCount,
            hasRates: r.hasRates,
            error: r.error,
            rates: r.rates
        }))
    };
    
    const reportPath = `checkout-test-report-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved: ${reportPath}`);
    
    return results;
}

// Run the test
testAllCountries().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
});

