const axios = require('axios');
const { getCountryMapping } = require('./utils/countryMapping');

// Configuration
const SERVER_URL = 'http://localhost:3001';
const SHOP_DOMAIN = 'spare-part-mart.myshopify.com';

// Get ALL countries from countryMapping
const { COUNTRY_MAPPING } = require('./utils/countryMapping');
const ALL_COUNTRIES = [];

// Extract all countries from the mapping
for (const [code, info] of Object.entries(COUNTRY_MAPPING)) {
    if (info && info.code && info.name) {
        // Generate a sample address for each country
        ALL_COUNTRIES.push({
            code: code,
            name: info.name,
            province: '', // Most countries don't need province
            postcode: '00000', // Generic postcode
            city: 'Capital City'
        });
    }
}

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
        
        // Parse JSON response
        let rateCount = 0;
        let rates = [];
        let responseData = response.data;
        
        if (typeof responseData === 'string') {
            try {
                responseData = JSON.parse(responseData);
            } catch (e) {
                // Not JSON, might be XML or error
                return {
                    success: false,
                    country: country.name,
                    code: country.code,
                    rateCount: 0,
                    rates: [],
                    hasRates: false,
                    error: 'Invalid response format',
                    responsePreview: responseData.substring(0, 200)
                };
            }
        }
        
        if (responseData && responseData.rates && Array.isArray(responseData.rates)) {
            rateCount = responseData.rates.length;
            rates = responseData.rates.map(rate => ({
                service_name: rate.service_name || 'N/A',
                service_code: rate.service_code || 'N/A',
                total_price: rate.total_price || '0',
                currency: rate.currency || 'CNY',
                min_delivery_date: rate.min_delivery_date || 'N/A',
                max_delivery_date: rate.max_delivery_date || 'N/A'
            }));
        }
        
        // Validate response format for Shopify compatibility
        const isValidFormat = rateCount > 0 && rates.every(r => 
            r.service_name !== 'N/A' && 
            r.service_code !== 'N/A' && 
            r.total_price !== '0' &&
            r.currency &&
            r.min_delivery_date !== 'N/A' &&
            r.max_delivery_date !== 'N/A'
        );
        
        return {
            success: true,
            country: country.name,
            code: country.code,
            rateCount,
            rates,
            hasRates: rateCount > 0,
            isValidFormat,
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
            isValidFormat: false,
            error: error.message || 'Unknown error',
            errorCode: error.code,
            errorResponse: error.response ? {
                status: error.response.status,
                data: error.response.data ? String(error.response.data).substring(0, 200) : null
            } : null
        };
    }
}

async function testAllCountries() {
    console.log('🧪 Comprehensive Carrier Service Test - ALL Countries\n');
    console.log(`Server: ${SERVER_URL}`);
    console.log(`Shop: ${SHOP_DOMAIN}`);
    console.log(`Testing ${ALL_COUNTRIES.length} countries...\n`);
    console.log('='.repeat(80) + '\n');
    
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    let noRatesCount = 0;
    let invalidFormatCount = 0;
    
    // Process in batches to avoid overwhelming the server
    const BATCH_SIZE = 10;
    for (let i = 0; i < ALL_COUNTRIES.length; i += BATCH_SIZE) {
        const batch = ALL_COUNTRIES.slice(i, i + BATCH_SIZE);
        
        console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(ALL_COUNTRIES.length / BATCH_SIZE)} (countries ${i + 1}-${Math.min(i + BATCH_SIZE, ALL_COUNTRIES.length)})...\n`);
        
        const batchPromises = batch.map(async (country, idx) => {
            const globalIdx = i + idx;
            process.stdout.write(`[${globalIdx + 1}/${ALL_COUNTRIES.length}] ${country.name} (${country.code})... `);
            
            const result = await testCountry(country);
            results.push(result);
            
            if (!result.success) {
                console.log(`❌ ERROR: ${result.error}`);
                failureCount++;
            } else if (!result.hasRates) {
                console.log(`⚠️  NO RATES`);
                noRatesCount++;
            } else if (!result.isValidFormat) {
                console.log(`⚠️  INVALID FORMAT (${result.rateCount} rates)`);
                invalidFormatCount++;
            } else {
                console.log(`✅ ${result.rateCount} rates`);
                successCount++;
            }
            
            return result;
        });
        
        await Promise.all(batchPromises);
        
        // Small delay between batches
        if (i + BATCH_SIZE < ALL_COUNTRIES.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 FINAL SUMMARY REPORT');
    console.log('='.repeat(80) + '\n');
    
    console.log(`✅ Countries with valid rates: ${successCount}`);
    console.log(`⚠️  Countries with no rates: ${noRatesCount}`);
    console.log(`⚠️  Countries with invalid format: ${invalidFormatCount}`);
    console.log(`❌ Countries with errors: ${failureCount}`);
    console.log(`📈 Success rate: ${((successCount / ALL_COUNTRIES.length) * 100).toFixed(1)}%`);
    console.log(`📊 Total tested: ${ALL_COUNTRIES.length}\n`);
    
    // Detailed breakdown
    if (successCount > 0) {
        console.log('\n✅ COUNTRIES WITH VALID RATES:');
        const successful = results.filter(r => r.success && r.hasRates && r.isValidFormat);
        successful.slice(0, 20).forEach(r => {
            console.log(`  ${r.country} (${r.code}): ${r.rateCount} rates`);
        });
        if (successful.length > 20) {
            console.log(`  ... and ${successful.length - 20} more`);
        }
    }
    
    if (noRatesCount > 0) {
        console.log('\n⚠️  COUNTRIES WITH NO RATES:');
        results.filter(r => r.success && !r.hasRates).slice(0, 20).forEach(r => {
            console.log(`  ${r.country} (${r.code})`);
        });
        const noRates = results.filter(r => r.success && !r.hasRates);
        if (noRates.length > 20) {
            console.log(`  ... and ${noRates.length - 20} more`);
        }
    }
    
    if (invalidFormatCount > 0) {
        console.log('\n⚠️  COUNTRIES WITH INVALID FORMAT:');
        results.filter(r => r.success && r.hasRates && !r.isValidFormat).slice(0, 10).forEach(r => {
            console.log(`  ${r.country} (${r.code}): ${r.rateCount} rates but invalid format`);
        });
    }
    
    if (failureCount > 0) {
        console.log('\n❌ COUNTRIES WITH ERRORS:');
        results.filter(r => !r.success).slice(0, 20).forEach(r => {
            console.log(`  ${r.country} (${r.code}): ${r.error}`);
        });
        const errors = results.filter(r => !r.success);
        if (errors.length > 20) {
            console.log(`  ... and ${errors.length - 20} more`);
        }
    }
    
    // Save detailed report
    const fs = require('fs');
    const report = {
        timestamp: new Date().toISOString(),
        totalCountries: ALL_COUNTRIES.length,
        successCount,
        noRatesCount,
        invalidFormatCount,
        failureCount,
        successRate: ((successCount / ALL_COUNTRIES.length) * 100).toFixed(1) + '%',
        results: results.map(r => ({
            country: r.country,
            code: r.code,
            success: r.success,
            rateCount: r.rateCount,
            hasRates: r.hasRates,
            isValidFormat: r.isValidFormat,
            error: r.error,
            rates: r.rates.slice(0, 3) // Only save first 3 rates per country
        }))
    };
    
    const reportPath = `checkout-test-all-countries-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved: ${reportPath}`);
    
    // Generate CSV for easy analysis
    const csv = [
        'Country,Country Code,Success,Has Rates,Rate Count,Valid Format,Error',
        ...results.map(r => 
            `"${r.country}","${r.code}",${r.success},${r.hasRates},${r.rateCount},${r.isValidFormat || false},"${(r.error || '').replace(/"/g, '""')}"`
        )
    ].join('\n');
    
    const csvPath = reportPath.replace('.json', '.csv');
    fs.writeFileSync(csvPath, csv);
    console.log(`📊 CSV report saved: ${csvPath}`);
    
    return results;
}

// Run the test
testAllCountries().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
});

