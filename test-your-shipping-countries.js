const axios = require('axios');
const { COUNTRY_MAPPING } = require('./utils/countryMapping');

// Configuration
const SERVER_URL = 'http://localhost:3001';
const SHOP_DOMAIN = 'spare-part-mart.myshopify.com';

// Your shipping countries (228 countries from your Shopify store)
const YOUR_SHIPPING_COUNTRIES = [
    'AD', 'AE', 'AF', 'AI', 'AL', 'AM', 'AO', 'AR', 'AT', 'AU', 'AW', 'AX', 'AZ',
    'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BW', 'BY', 'BZ',
    'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CO', 'CR', 'CV', 'CW', 'CX', 'CY', 'CZ',
    'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ',
    'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET',
    'FI', 'FJ', 'FK', 'FO', 'FR',
    'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GW', 'GY',
    'HN', 'HR', 'HT', 'HU',
    'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IS', 'IT',
    'JE', 'JM', 'JO', 'JP',
    'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KR', 'KW', 'KY', 'KZ',
    'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY',
    'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MK', 'ML', 'MM', 'MN', 'MO', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ',
    'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ',
    'OM',
    'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PS', 'PT', 'PY',
    'QA',
    'RE', 'RO', 'RS', 'RU', 'RW',
    'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SZ',
    'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TZ',
    'UA', 'UG', 'UM', 'US', 'UY', 'UZ',
    'VA', 'VC', 'VE', 'VG', 'VN', 'VU',
    'WS',
    'YE', 'YT',
    'ZA', 'ZM', 'ZW'
];

// If no countries specified, use all from mapping
const COUNTRIES_TO_TEST = YOUR_SHIPPING_COUNTRIES.length > 0 
    ? YOUR_SHIPPING_COUNTRIES.map(code => {
        const info = COUNTRY_MAPPING[code];
        if (!info) {
            console.warn(`⚠️  Country code ${code} not found in mapping`);
            return null;
        }
        return {
            code: code,
            name: info.name,
            province: '',
            postcode: '00000',
            city: 'Capital City'
        };
    }).filter(c => c !== null)
    : Object.entries(COUNTRY_MAPPING).map(([code, info]) => ({
        code: code,
        name: info.name,
        province: '',
        postcode: '00000',
        city: 'Capital City'
    }));

// Origin address
const ORIGIN = {
    country: 'AU',
    province: 'VIC',
    postal_code: '3189',
    city: 'Moorabbin',
    address1: '18 Joan Street',
    company_name: 'Spare Part Mart'
};

// Test product
const TEST_ITEM = {
    'variant-id': '1234567890',
    'product-id': '9876543210',
    quantity: 1,
    grams: 480,
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
        
        let rateCount = 0;
        let rates = [];
        let responseData = response.data;
        
        if (typeof responseData === 'string') {
            try {
                responseData = JSON.parse(responseData);
            } catch (e) {
                return {
                    success: false,
                    country: country.name,
                    code: country.code,
                    rateCount: 0,
                    rates: [],
                    hasRates: false,
                    error: 'Invalid response format'
                };
            }
        }
        
        if (responseData && responseData.rates && Array.isArray(responseData.rates)) {
            rateCount = responseData.rates.length;
            rates = responseData.rates.map(rate => ({
                service_name: rate.service_name || 'N/A',
                service_code: rate.service_code || 'N/A',
                total_price: rate.total_price || '0',
                currency: rate.currency || 'CNY'
            }));
        }
        
        const isValidFormat = rateCount > 0 && rates.every(r => 
            r.service_name !== 'N/A' && 
            r.service_code !== 'N/A' && 
            r.total_price !== '0'
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
            error: error.message || 'Unknown error'
        };
    }
}

async function testYourCountries() {
    console.log('🧪 Testing YOUR Shipping Countries\n');
    console.log(`Server: ${SERVER_URL}`);
    console.log(`Shop: ${SHOP_DOMAIN}`);
    
    if (YOUR_SHIPPING_COUNTRIES.length > 0) {
        console.log(`Testing ${YOUR_SHIPPING_COUNTRIES.length} countries you ship to:\n`);
        YOUR_SHIPPING_COUNTRIES.forEach((code, idx) => {
            const info = COUNTRY_MAPPING[code];
            if (info) {
                console.log(`  ${idx + 1}. ${info.name} (${code})`);
            }
        });
    } else {
        console.log(`⚠️  No countries specified - testing ALL ${COUNTRIES_TO_TEST.length} countries from mapping\n`);
        console.log('💡 To test only YOUR countries, edit this file and add your country codes to YOUR_SHIPPING_COUNTRIES array\n');
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    let noRatesCount = 0;
    
    for (let i = 0; i < COUNTRIES_TO_TEST.length; i++) {
        const country = COUNTRIES_TO_TEST[i];
        process.stdout.write(`[${i + 1}/${COUNTRIES_TO_TEST.length}] ${country.name} (${country.code})... `);
        
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
            noRatesCount++;
        } else {
            console.log(`✅ ${result.rateCount} rates`);
            successCount++;
            
            // Show first rate
            if (result.rates.length > 0) {
                const firstRate = result.rates[0];
                const price = (parseInt(firstRate.total_price) / 100).toFixed(2);
                console.log(`     → ${firstRate.service_name}: ${price} ${firstRate.currency}`);
            }
        }
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80) + '\n');
    
    console.log(`✅ Countries with rates: ${successCount}`);
    console.log(`⚠️  Countries with no rates: ${noRatesCount}`);
    console.log(`❌ Countries with errors: ${failureCount}`);
    console.log(`📈 Success rate: ${((successCount / COUNTRIES_TO_TEST.length) * 100).toFixed(1)}%\n`);
    
    // Countries with rates
    if (successCount > 0) {
        console.log('✅ COUNTRIES WITH RATES:');
        results.filter(r => r.success && r.hasRates && r.isValidFormat).forEach(r => {
            console.log(`  ${r.country} (${r.code}): ${r.rateCount} rates`);
        });
    }
    
    // Countries without rates
    if (noRatesCount > 0) {
        console.log('\n⚠️  COUNTRIES WITH NO RATES:');
        results.filter(r => r.success && !r.hasRates).forEach(r => {
            console.log(`  ${r.country} (${r.code})`);
        });
    }
    
    // Errors
    if (failureCount > 0) {
        console.log('\n❌ COUNTRIES WITH ERRORS:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`  ${r.country} (${r.code}): ${r.error}`);
        });
    }
    
    // Save report
    const fs = require('fs');
    const report = {
        timestamp: new Date().toISOString(),
        totalCountries: COUNTRIES_TO_TEST.length,
        successCount,
        noRatesCount,
        failureCount,
        successRate: ((successCount / COUNTRIES_TO_TEST.length) * 100).toFixed(1) + '%',
        results: results.map(r => ({
            country: r.country,
            code: r.code,
            success: r.success,
            rateCount: r.rateCount,
            hasRates: r.hasRates,
            isValidFormat: r.isValidFormat,
            error: r.error
        }))
    };
    
    const reportPath = `your-countries-test-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved: ${reportPath}`);
}

testYourCountries().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
});

