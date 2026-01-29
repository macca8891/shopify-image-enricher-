#!/usr/bin/env node

/**
 * Quick script to get your server's public IP address
 * Run this after deploying to get the IP for BuckyDrop whitelisting
 */

const axios = require('axios');

async function getPublicIP() {
  try {
    console.log('Fetching public IP address...\n');
    
    // Try multiple services in case one is down
    const services = [
      'https://api.ipify.org?format=json',
      'https://api64.ipify.org?format=json',
      'https://ifconfig.me/ip',
      'https://icanhazip.com'
    ];

    for (const service of services) {
      try {
        if (service.includes('ipify')) {
          const response = await axios.get(service, { timeout: 5000 });
          const ip = response.data.ip || response.data;
          console.log('✅ Your public IP address:', ip);
          console.log('\n📋 Add this IP to your BuckyDrop whitelist:');
          console.log(`   ${ip}\n`);
          return ip;
        } else {
          const response = await axios.get(service, { timeout: 5000 });
          const ip = response.data.trim();
          console.log('✅ Your public IP address:', ip);
          console.log('\n📋 Add this IP to your BuckyDrop whitelist:');
          console.log(`   ${ip}\n`);
          return ip;
        }
      } catch (e) {
        continue;
      }
    }
    
    throw new Error('Could not fetch IP from any service');
  } catch (error) {
    console.error('❌ Error fetching IP:', error.message);
    console.log('\n💡 Alternative: Visit your server at:');
    console.log('   https://your-server.com/api/buckydrop/ip\n');
    process.exit(1);
  }
}

// If running directly
if (require.main === module) {
  getPublicIP();
}

module.exports = { getPublicIP };


