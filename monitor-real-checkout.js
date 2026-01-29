const fs = require('fs');
const readline = require('readline');

/**
 * Monitor real checkout requests to see:
 * 1. Which countries customers are trying to ship to
 * 2. Whether rates are being returned
 * 3. Any errors occurring
 */

const LOG_FILE = '/tmp/pm2-server.log';

function parseLogLine(line) {
    const result = {
        timestamp: null,
        type: null,
        country: null,
        rates: null,
        error: null,
        shop: null
    };
    
    // Extract timestamp
    const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
    if (timestampMatch) {
        result.timestamp = timestampMatch[1];
    }
    
    // Check for carrier service request
    if (line.includes('Carrier service request') || line.includes('📦 Carrier')) {
        result.type = 'request';
        const shopMatch = line.match(/shop:\s*([^\s,}]+)/i);
        if (shopMatch) {
            result.shop = shopMatch[1];
        }
    }
    
    // Extract destination country
    const countryMatch = line.match(/destination.*country["\s]*[:=]["\s]*([A-Z]{2})/i) ||
                         line.match(/country["\s]*[:=]["\s]*["']([A-Z]{2})["']/i) ||
                         line.match(/destination.*country.*(DE|US|GB|CA|AU|FR|IT|ES|NL|BE|CH|AT|SE|NO|DK|FI|PL|CZ|IE|PT|GR|NZ|JP|KR|SG|MY|TH|PH|ID|IN|MX|BR|AR|CL|CO|ZA|AE|SA|IL|TR|RU|FJ)/i);
    if (countryMatch) {
        result.country = countryMatch[1].toUpperCase();
    }
    
    // Check for rates being returned
    if (line.includes('Routes being returned') || line.includes('JSON sent') || line.includes('rates')) {
        result.type = 'response';
    }
    
    // Extract rate count
    const rateCountMatch = line.match(/(\d+)\s+rates/) || line.match(/rates.*\[.*(\d+)/);
    if (rateCountMatch) {
        result.rates = parseInt(rateCountMatch[1]);
    }
    
    // Check for errors
    if (line.includes('Error') || line.includes('error') || line.includes('❌')) {
        result.type = 'error';
        result.error = line.substring(0, 300);
    }
    
    return result;
}

function monitorLogs() {
    console.log('🔍 Monitoring REAL Checkout Requests');
    console.log('Watching:', LOG_FILE);
    console.log('This shows actual requests from Shopify when customers use checkout\n');
    console.log('='.repeat(80) + '\n');
    
    const stats = {
        totalRequests: 0,
        countries: new Map(),
        errors: [],
        noRates: [],
        recentRequests: []
    };
    
    // Read last 5000 lines to catch recent activity
    let lines = [];
    try {
        const content = fs.readFileSync(LOG_FILE, 'utf-8');
        lines = content.split('\n').slice(-5000);
    } catch (error) {
        console.error('❌ Error reading log file:', error.message);
        return;
    }
    
    console.log(`📊 Analyzing last ${lines.length} log lines...\n`);
    
    let currentRequest = null;
    let requestBuffer = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const parsed = parseLogLine(line);
        
        if (parsed.type === 'request') {
            // Save previous request if exists
            if (currentRequest) {
                stats.recentRequests.push(currentRequest);
            }
            
            stats.totalRequests++;
            currentRequest = {
                timestamp: parsed.timestamp,
                country: parsed.country || 'Unknown',
                shop: parsed.shop || 'Unknown',
                hasRates: false,
                rateCount: 0,
                lines: []
            };
            requestBuffer = [];
        }
        
        if (currentRequest) {
            currentRequest.lines.push(line);
            
            // Check for country in destination
            if (!currentRequest.country || currentRequest.country === 'Unknown') {
                const destMatch = line.match(/destination.*country["\s]*[:=]["\s]*([A-Z]{2})/i) ||
                                  line.match(/"country"\s*:\s*"([A-Z]{2})"/i);
                if (destMatch) {
                    currentRequest.country = destMatch[1].toUpperCase();
                }
            }
            
            // Check for rates
            if (parsed.type === 'response' || parsed.rates) {
                currentRequest.hasRates = true;
                currentRequest.rateCount = parsed.rates || currentRequest.rateCount;
            }
            
            // Check for errors
            if (parsed.type === 'error') {
                currentRequest.error = parsed.error;
            }
        }
        
        // Check for rates being returned
        if (parsed.type === 'response' && currentRequest) {
            currentRequest.hasRates = true;
            currentRequest.rateCount = parsed.rates || 0;
            
            if (currentRequest.country && currentRequest.country !== 'Unknown') {
                const country = currentRequest.country;
                if (!stats.countries.has(country)) {
                    stats.countries.set(country, { requests: 0, withRates: 0, noRates: 0 });
                }
                const countryStats = stats.countries.get(country);
                countryStats.requests++;
                if (currentRequest.hasRates && currentRequest.rateCount > 0) {
                    countryStats.withRates++;
                } else {
                    countryStats.noRates++;
                    stats.noRates.push(currentRequest);
                }
            }
        }
        
        if (parsed.type === 'error' && currentRequest) {
            stats.errors.push({
                timestamp: parsed.timestamp,
                country: currentRequest.country || 'Unknown',
                error: parsed.error
            });
            currentRequest.error = parsed.error;
        }
    }
    
    // Save last request
    if (currentRequest) {
        stats.recentRequests.push(currentRequest);
    }
    
    // Display results
    console.log('='.repeat(80));
    console.log('📊 CHECKOUT ACTIVITY SUMMARY');
    console.log('='.repeat(80) + '\n');
    
    if (stats.totalRequests === 0) {
        console.log('⚠️  No checkout requests found in recent logs.');
        console.log('\nThis could mean:');
        console.log('  1. No customers have used checkout recently');
        console.log('  2. Carrier service isn\'t being called by Shopify');
        console.log('  3. Requests are being logged elsewhere\n');
        console.log('💡 To verify checkout display:');
        console.log('  1. Go to your store checkout');
        console.log('  2. Add a product to cart');
        console.log('  3. Enter an address for a country');
        console.log('  4. Watch this script - it will show the request\n');
        return;
    }
    
    console.log(`Total checkout requests found: ${stats.totalRequests}`);
    console.log(`Countries tested: ${stats.countries.size}\n`);
    
    if (stats.recentRequests.length > 0) {
        console.log('📋 Recent Requests (last 10):');
        stats.recentRequests.slice(-10).forEach((req, idx) => {
            const status = req.hasRates && req.rateCount > 0 
                ? `✅ ${req.rateCount} rates` 
                : req.error 
                    ? `❌ ERROR` 
                    : `⚠️  NO RATES`;
            console.log(`  ${idx + 1}. ${req.timestamp} - ${req.country}: ${status}`);
        });
        console.log('');
    }
    
    if (stats.countries.size > 0) {
        console.log('🌍 Countries by Request Count:');
        const sortedCountries = Array.from(stats.countries.entries())
            .sort((a, b) => b[1].requests - a[1].requests)
            .slice(0, 20);
        
        for (const [country, data] of sortedCountries) {
            const successRate = data.requests > 0 
                ? ((data.withRates / data.requests) * 100).toFixed(0) 
                : '0';
            console.log(`  ${country}: ${data.requests} requests, ${data.withRates} with rates (${successRate}%)`);
        }
    }
    
    if (stats.noRates.length > 0) {
        console.log(`\n⚠️  Requests with no rates: ${stats.noRates.length}`);
        stats.noRates.slice(0, 5).forEach(req => {
            console.log(`  ${req.timestamp} - ${req.country}`);
        });
    }
    
    if (stats.errors.length > 0) {
        console.log(`\n❌ Errors: ${stats.errors.length}`);
        stats.errors.slice(0, 5).forEach(err => {
            console.log(`  ${err.timestamp} - ${err.country}: ${err.error.substring(0, 100)}`);
        });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('💡 INTERPRETATION');
    console.log('='.repeat(80));
    console.log('\n✅ If you see requests with rates:');
    console.log('   → Shopify IS calling your endpoint');
    console.log('   → Rates ARE being returned');
    console.log('   → Checkout SHOULD display rates (if shipping zones configured correctly)');
    console.log('\n⚠️  If you see requests but NO rates:');
    console.log('   → Shopify is calling, but no rates returned');
    console.log('   → Check BuckyDrop API or product configuration');
    console.log('\n❌ If you see NO requests at all:');
    console.log('   → Shopify may not be calling your endpoint');
    console.log('   → Check carrier service configuration in Shopify Admin');
    console.log('   → Verify carrier service is added to shipping zones');
}

// Run
monitorLogs();

