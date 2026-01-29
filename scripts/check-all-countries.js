const BuckyDropService = require('../services/BuckyDropService');
const fs = require('fs');
const path = require('path');

// Configuration
const BUCKY_DROP_CONFIG = {
    APPCODE: process.env.BUCKY_DROP_APPCODE || "ae75dfea63cc39f6efe052af4a8b9dea",
    APPSECRET: process.env.BUCKY_DROP_APPSECRET || "8d8e3c046d6bf420b5999899786d8481",
    DOMAIN: "https://bdopenapi.buckydrop.com",
    API_PATH: "api/rest/v2/adapt/adaptation/logistics/channel-carriage-list",
};

// All countries BuckyDrop supports
const COUNTRIES = [
    { code: 'AU', name: 'Australia', province: 'VIC', postcode: '3000', address: '123 Collins Street' },
    { code: 'NZ', name: 'New Zealand', province: 'Auckland', postcode: '1010', address: '123 Queen Street' },
    { code: 'US', name: 'United States', province: 'CA', postcode: '90210', address: '123 Sunset Boulevard' },
    { code: 'ID', name: 'Indonesia', province: 'Jakarta', postcode: '10110', address: '123 Jalan Thamrin' },
    { code: 'IN', name: 'India', province: 'Maharashtra', postcode: '400001', address: '123 MG Road' },
    { code: 'GB', name: 'United Kingdom', province: 'England', postcode: 'SW1A 1AA', address: '123 Oxford Street' },
    { code: 'ZA', name: 'South Africa', province: 'Gauteng', postcode: '2001', address: '123 Main Street' },
    { code: 'JP', name: 'Japan', province: 'Tokyo', postcode: '100-0001', address: '123 Chiyoda' },
    { code: 'KR', name: 'South Korea', province: 'Seoul', postcode: '04533', address: '123 Gangnam' },
    { code: 'MY', name: 'Malaysia', province: 'Selangor', postcode: '50000', address: '123 Jalan Ampang' },
    { code: 'TH', name: 'Thailand', province: 'Bangkok', postcode: '10100', address: '123 Sukhumvit' },
    { code: 'PH', name: 'Philippines', province: 'Metro Manila', postcode: '1000', address: '123 EDSA' },
    { code: 'SG', name: 'Singapore', province: '', postcode: '018956', address: '123 Orchard Road' },
    { code: 'TR', name: 'Turkey', province: 'Istanbul', postcode: '34000', address: '123 Istiklal' },
    { code: 'IE', name: 'Ireland', province: 'Dublin', postcode: 'D02', address: '123 Grafton Street' },
    { code: 'CA', name: 'Canada', province: 'ON', postcode: 'M5H 2N2', address: '123 Bay Street' },
    { code: 'MX', name: 'Mexico', province: 'CDMX', postcode: '06000', address: '123 Reforma' },
];

// Test product dimensions (small standard package)
const TEST_PRODUCT = {
    length: 12,  // cm
    width: 12,   // cm
    height: 12,  // cm
    weight: 1.2, // kg
    count: 1,
    categoryCode: 'other'
};

async function fetchRatesForCountry(buckyDropService, country) {
    try {
        // BuckyDropService wraps with { size: 50, current: 1, item: ... }
        // So we only pass the inner item object
        const requestBody = {
            lang: 'en',
            country: country.name,
            countryCode: country.code,
            province: country.province || '',
            provinceCode: '',
            detailAddress: country.address,
            postCode: country.postcode,
            productList: [TEST_PRODUCT],
            orderBy: 'price',
            orderType: 'asc'
        };

        const response = await buckyDropService.fetchShippingRates(requestBody);
        
        if (response && response.success && response.data && response.data.records) {
            return {
                success: true,
                country: country.name,
                code: country.code,
                routes: response.data.records.map(route => ({
                    serviceCode: route.serviceCode,
                    serviceName: route.serviceName,
                    totalPrice: route.totalPrice,
                    price: route.price,
                    minDays: route.minTimeInTransit,
                    maxDays: route.maxTimeInTransit,
                    available: route.available,
                    unavailableReason: route.unavailableReason || null,
                    restrictedGoods: route.restrictedGoods || '',
                    feature: route.feature || ''
                }))
            };
        } else {
            return {
                success: false,
                country: country.name,
                code: country.code,
                error: 'No data returned',
                routes: []
            };
        }
    } catch (error) {
        return {
            success: false,
            country: country.name,
            code: country.code,
            error: error.message,
            routes: []
        };
    }
}

async function checkAllCountries() {
    console.log('🚀 Starting comprehensive shipping options check...\n');
    console.log(`Checking ${COUNTRIES.length} countries...\n`);
    
    const buckyDropService = new BuckyDropService(BUCKY_DROP_CONFIG);
    const results = [];
    
    // Fetch rates for each country
    for (let i = 0; i < COUNTRIES.length; i++) {
        const country = COUNTRIES[i];
        process.stdout.write(`[${i + 1}/${COUNTRIES.length}] Checking ${country.name} (${country.code})... `);
        
        const result = await fetchRatesForCountry(buckyDropService, country);
        results.push(result);
        
        if (result.success) {
            const availableCount = result.routes.filter(r => r.available).length;
            const totalCount = result.routes.length;
            console.log(`✅ ${availableCount}/${totalCount} routes available`);
        } else {
            console.log(`❌ Error: ${result.error}`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY REPORT');
    console.log('='.repeat(80) + '\n');
    
    // Generate detailed report
    let report = '# BuckyDrop Shipping Options - All Countries Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    report += `Total Countries Checked: ${COUNTRIES.length}\n\n`;
    
    // Group by country
    for (const result of results) {
        report += `## ${result.country} (${result.code})\n\n`;
        
        if (!result.success) {
            report += `❌ **Error:** ${result.error}\n\n`;
            continue;
        }
        
        const availableRoutes = result.routes.filter(r => r.available);
        const unavailableRoutes = result.routes.filter(r => !r.available);
        
        report += `**Total Routes:** ${result.routes.length} (${availableRoutes.length} available, ${unavailableRoutes.length} unavailable)\n\n`;
        
        if (availableRoutes.length > 0) {
            report += `### Available Shipping Options:\n\n`;
            report += `| Service Name | Service Code | Price (RMB) | Delivery Days |\n`;
            report += `|--------------|--------------|-------------|---------------|\n`;
            
            // Sort by price
            availableRoutes.sort((a, b) => a.totalPrice - b.totalPrice);
            
            for (const route of availableRoutes) {
                const days = route.minDays === route.maxDays 
                    ? `${route.minDays} days`
                    : `${route.minDays}-${route.maxDays} days`;
                report += `| ${route.serviceName} | ${route.serviceCode} | ${route.totalPrice.toFixed(2)} | ${days} |\n`;
            }
            report += '\n';
        }
        
        if (unavailableRoutes.length > 0) {
            report += `### Unavailable Options:\n\n`;
            for (const route of unavailableRoutes) {
                report += `- **${route.serviceName}** (${route.serviceCode}): ${route.unavailableReason || 'Not available'}\n`;
            }
            report += '\n';
        }
        
        report += '---\n\n';
    }
    
    // Generate CSV for easy analysis
    let csv = 'Country,Country Code,Service Name,Service Code,Price (RMB),Min Days,Max Days,Available,Unavailable Reason\n';
    
    for (const result of results) {
        if (result.success) {
            for (const route of result.routes) {
                csv += `"${result.country}","${result.code}","${route.serviceName}","${route.serviceCode}",${route.totalPrice},${route.minDays},${route.maxDays},${route.available},"${(route.unavailableReason || '').replace(/"/g, '""')}"\n`;
            }
        }
    }
    
    // Save files
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const reportPath = path.join(__dirname, `../buckydrop-shipping-report-${timestamp}.md`);
    const csvPath = path.join(__dirname, `../buckydrop-shipping-report-${timestamp}.csv`);
    
    fs.writeFileSync(reportPath, report);
    fs.writeFileSync(csvPath, csv);
    
    console.log(`✅ Report saved: ${reportPath}`);
    console.log(`✅ CSV saved: ${csvPath}\n`);
    
    // Print summary statistics
    let totalRoutes = 0;
    let totalAvailable = 0;
    const serviceNames = new Set();
    
    for (const result of results) {
        if (result.success) {
            totalRoutes += result.routes.length;
            totalAvailable += result.routes.filter(r => r.available).length;
            result.routes.forEach(r => serviceNames.add(r.serviceName));
        }
    }
    
    console.log('📈 Statistics:');
    console.log(`   Total routes found: ${totalRoutes}`);
    console.log(`   Available routes: ${totalAvailable}`);
    console.log(`   Unique service names: ${serviceNames.size}`);
    console.log(`\n📋 Unique Service Names (${serviceNames.size}):`);
    Array.from(serviceNames).sort().forEach(name => console.log(`   - ${name}`));
    
    console.log('\n✅ Done! Check the report files for detailed information.');
}

// Run the script
checkAllCountries().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});

