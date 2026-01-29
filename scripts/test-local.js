#!/usr/bin/env node

/**
 * Quick test script to verify the proxy service works locally
 * Run: node scripts/test-local.js
 */

const axios = require('axios');

const PROXY_URL = process.env.PROXY_URL || 'http://localhost:3001';

async function testProxy() {
  console.log('🧪 Testing BuckyDrop Proxy Service\n');
  console.log(`📍 Testing: ${PROXY_URL}\n`);

  // Test 1: Health Check
  console.log('1️⃣ Testing health endpoint...');
  try {
    const health = await axios.get(`${PROXY_URL}/api/buckydrop/health`);
    console.log('   ✅ Health check passed:', health.data);
  } catch (e) {
    console.log('   ❌ Health check failed:', e.message);
    console.log('   💡 Make sure the server is running: npm start');
    return;
  }

  // Test 2: IP Endpoint
  console.log('\n2️⃣ Testing IP endpoint...');
  try {
    const ip = await axios.get(`${PROXY_URL}/api/buckydrop/ip`);
    console.log('   ✅ IP endpoint working');
    console.log('   📍 Public IP:', ip.data.publicIp);
    console.log('   📝 Add this IP to BuckyDrop whitelist!');
  } catch (e) {
    console.log('   ⚠️  IP endpoint failed:', e.message);
  }

  // Test 3: Shipping Rates (if credentials are set)
  console.log('\n3️⃣ Testing shipping rates endpoint...');
  const hasCredentials = process.env.BUCKY_DROP_APPCODE && process.env.BUCKY_DROP_APPSECRET;
  
  if (!hasCredentials) {
    console.log('   ⚠️  Skipping - BUCKY_DROP_APPCODE/APPSECRET not set in environment');
    console.log('   💡 Set them in .env file to test full functionality');
  } else {
    try {
      const testRequest = {
        destination: {
          lang: "en",
          country: "Australia",
          countryCode: "AU",
          provinceCode: "VIC",
          province: "Victoria",
          detailAddress: "18 Joan St Moorabbin",
          postCode: "3189"
        },
        productList: [{
          length: 10.5,
          width: 10.5,
          height: 15.2,
          weight: 1.234,
          count: 1,
          categoryCode: "other"
        }]
      };

      const rates = await axios.post(`${PROXY_URL}/api/buckydrop/shipping-rates`, testRequest);
      console.log('   ✅ Shipping rates endpoint working!');
      console.log('   📦 Rates:', rates.data.rates);
    } catch (e) {
      if (e.response) {
        console.log('   ⚠️  API call failed:', e.response.status, e.response.data.error);
        if (e.response.data.error.includes('appCode') || e.response.data.error.includes('IP')) {
          console.log('   💡 This is likely an IP whitelisting issue');
          console.log('   💡 Get your IP and add it to BuckyDrop whitelist');
        }
      } else {
        console.log('   ❌ Request failed:', e.message);
      }
    }
  }

  console.log('\n✅ Testing complete!\n');
  console.log('📋 Next steps:');
  console.log('   1. Deploy to a server with static IP');
  console.log('   2. Get your IP: curl ' + PROXY_URL + '/api/buckydrop/ip');
  console.log('   3. Add IP to BuckyDrop whitelist');
  console.log('   4. Update Google Apps Script PROXY_URL');
}

testProxy().catch(console.error);


