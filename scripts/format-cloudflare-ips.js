#!/usr/bin/env node

/**
 * Helper script to format Cloudflare IP ranges in different formats
 * Usage: node scripts/format-cloudflare-ips.js [format]
 * Formats: list (default), comma, json, csv
 */

const cloudflareIPs = [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22'
];

const format = process.argv[2] || 'list';

switch (format) {
  case 'comma':
    console.log(cloudflareIPs.join(','));
    break;
    
  case 'json':
    console.log(JSON.stringify(cloudflareIPs, null, 2));
    break;
    
  case 'csv':
    console.log('IP Range');
    cloudflareIPs.forEach(ip => console.log(ip));
    break;
    
  case 'list':
  default:
    console.log('Cloudflare IP Ranges for BuckyDrop Whitelist:');
    console.log('='.repeat(50));
    cloudflareIPs.forEach(ip => console.log(ip));
    console.log('='.repeat(50));
    console.log(`Total: ${cloudflareIPs.length} IP ranges`);
    break;
}


