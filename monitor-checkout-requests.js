const fs = require('fs');
const readline = require('readline');

/**
 * Monitor real checkout requests to see which countries customers are trying
 * and whether rates are being returned successfully
 */

const LOG_FILE = '/tmp/pm2-server.log';

function parseLogLine(line) {
    const result = {
        timestamp: null,
        type: null,
        country: null,
        rates: null,
        error: null
    };
    
    // Extract timestamp
    const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
    if (timestampMatch) {
        result.timestamp = timestampMatch[1];
    }
    
    // Check for carrier service request
    if (line.includes('Carrier service request')) {
        result.type = 'request';
    }
    
    // Extract destination country
    const countryMatch = line.match(/destination.*country["\s]*[:=]["\s]*([A-Z]{2})/i) ||
                         line.match(/country["\s]*[:=]["\s]*["']([A-Z]{2})["']/i) ||
                         line.match(/destination.*DE\|destination.*US\|destination.*GB/i);
    if (countryMatch) {
        result.country = countryMatch[1];
    }
    
    // Check for rates being returned
    if (line.includes('Routes being returned') || line.includes('JSON sent')) {
        result.type = 'response';
    }
    
    // Extract rate count
    const rateCountMatch = line.match(/(\d+)\s+rates/);
    if (rateCountMatch) {
        result.rates = parseInt(rateCountMatch[1]);
    }
    
    // Check for errors
    if (line.includes('Error') || line.includes('error')) {
        result.type = 'error';
        result.error = line.substring(0, 200);
    }
    
    return result;
}

function monitorLogs() {
    console.log('🔍 Monitoring checkout requests...');
    console.log('Watching:', LOG_FILE);
    console.log('Press Ctrl+C to stop\n');
    console.log('='.repeat(80) + '\n');
    
    const stats = {
        totalRequests: 0,
        countries: new Map(),
        errors: [],
        noRates: []
    };
    
    // Read last 1000 lines to catch recent activity
    const lines = fs.readFileSync(LOG_FILE, 'utf-8').split('\n').slice(-1000);
    
    console.log('📊 Recent Activity (last 1000 log lines):\n');
    
    let currentRequest = null;
    
    for (const line of lines) {
        const parsed = parseLogLine(line);
        
        if (parsed.type === 'request') {
            stats.totalRequests++;
            currentRequest = {
                timestamp: parsed.timestamp,
                country: parsed.country || 'Unknown',
                hasRates: false
            };
        }
        
        if (parsed.type === 'response' && currentRequest) {
            currentRequest.hasRates = true;
            currentRequest.rateCount = parsed.rates || 0;
            
            if (currentRequest.country) {
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
            
            console.log(`✅ ${currentRequest.timestamp} - ${currentRequest.country || 'Unknown'}: ${currentRequest.rateCount || 0} rates`);
            currentRequest = null;
        }
        
        if (parsed.type === 'error' && currentRequest) {
            stats.errors.push({
                timestamp: parsed.timestamp,
                country: currentRequest.country || 'Unknown',
                error: parsed.error
            });
            console.log(`❌ ${parsed.timestamp} - ${currentRequest.country || 'Unknown'}: ERROR`);
            currentRequest = null;
        }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80) + '\n');
    
    console.log(`Total requests found: ${stats.totalRequests}`);
    console.log(`Countries tested: ${stats.countries.size}\n`);
    
    if (stats.countries.size > 0) {
        console.log('Countries by request count:');
        const sortedCountries = Array.from(stats.countries.entries())
            .sort((a, b) => b[1].requests - a[1].requests)
            .slice(0, 20);
        
        for (const [country, data] of sortedCountries) {
            const successRate = ((data.withRates / data.requests) * 100).toFixed(0);
            console.log(`  ${country}: ${data.requests} requests, ${data.withRates} with rates (${successRate}%)`);
        }
    }
    
    if (stats.noRates.length > 0) {
        console.log(`\n⚠️  Requests with no rates: ${stats.noRates.length}`);
        stats.noRates.slice(0, 10).forEach(req => {
            console.log(`  ${req.timestamp} - ${req.country}`);
        });
    }
    
    if (stats.errors.length > 0) {
        console.log(`\n❌ Errors: ${stats.errors.length}`);
        stats.errors.slice(0, 10).forEach(err => {
            console.log(`  ${err.timestamp} - ${err.country}: ${err.error.substring(0, 100)}`);
        });
    }
    
    console.log('\n💡 To see real-time activity, customers need to use checkout.');
    console.log('   This shows historical data from server logs.');
}

// Run
monitorLogs();

