const express = require('express');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const logger = require('../utils/logger');
const ShippingService = require('../services/ShippingService');
const BuckyDropService = require('../services/BuckyDropService');
const xml2js = require('xml2js');
const axios = require('axios');
const { shopifyApi, ApiVersion } = require('@shopify/shopify-api');
const { restResources } = require('@shopify/shopify-api/rest/admin/2023-04');
require('@shopify/shopify-api/adapters/node');

const router = express.Router();

// Store last request details for debugging (keep last 10 requests)
let lastRequestDetails = null;
let recentRequests = []; // Store last 10 requests
const MAX_RECENT_REQUESTS = 10;

// Stub endpoints to prevent server crash - these need to be implemented
router.post('/calculate', async (req, res) => {
    res.status(501).json({ error: 'Endpoint not yet restored' });
});

router.post('/sync', async (req, res) => {
    res.status(501).json({ error: 'Endpoint not yet restored' });
});

/**
 * POST /api/shipping/recalculate-failed
 * Recalculate only shipping rates that failed (have assignedCode but no service/price)
 * Much faster than recalculating everything - only processes incomplete rates
 */
router.post('/recalculate-failed', async (req, res) => {
    try {
        const { shop, limit } = req.body;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop domain required' });
        }

        logger.info(`🔄 Starting recalculation of failed rates for shop: ${shop}`);

        // Use BuckyDrop config from environment variables (same as buckydrop.js route)
        const BUCKY_DROP_CONFIG = {
            APPCODE: process.env.BUCKY_DROP_APPCODE || "ae75dfea63cc39f6efe052af4a8b9dea",
            APPSECRET: process.env.BUCKY_DROP_APPSECRET || "8d8e3c046d6bf420b5999899786d8481",
            DOMAIN: "https://bdopenapi.buckydrop.com",
            API_PATH: "api/rest/v2/adapt/adaptation/logistics/channel-carriage-list",
        };

        const shippingService = new ShippingService(BUCKY_DROP_CONFIG);

        // Find products with incomplete rates (have assignedCode but missing service/price)
        // No limit - process all products with failed rates
        const products = await Product.find({ 
            shopDomain: shop,
            shippingProcessed: true,
            'shippingRates.0': { $exists: true }
        })
        .select('_id title variants shippingRates metafields')
        .lean();

        logger.info(`📦 Found ${products.length} products to check`);

        // Return immediately and process in background
        res.json({
            success: true,
            message: `Started background recalculation. Checking ${products.length} products for failed rates...`,
            status: 'processing',
            productsToCheck: products.length
        });

        // Process in background (don't await)
        (async () => {
            let totalFailedRates = 0;
            let totalRecalculated = 0;
            let totalSkipped = 0;
            const errors = [];
            let processedProducts = 0;

            try {
                // Process each product
                for (const product of products) {
            processedProducts++;
            if (processedProducts % 10 === 0) {
                logger.info(`📊 Progress: ${processedProducts}/${products.length} products checked, ${totalFailedRates} failed rates found, ${totalRecalculated} recalculated`);
            }
            if (!product.shippingRates || !Array.isArray(product.shippingRates)) {
                continue;
            }

            // Find failed rates for this product
            const failedRates = product.shippingRates.filter(rate => {
                // Has an assigned code
                const hasCode = rate.assignedCode !== null && rate.assignedCode !== undefined && rate.assignedCode !== '';
                
                // Missing service or price
                const hasService = rate.cheapService || rate.expressService;
                const hasPrice = (rate.cheapPriceUSD && rate.cheapPriceUSD > 0) || (rate.expressPriceUSD && rate.expressPriceUSD > 0);
                const isIncomplete = !hasService && !hasPrice;
                
                return hasCode && isIncomplete;
            });

            if (failedRates.length === 0) {
                continue; // Skip products with no failed rates
            }

            totalFailedRates += failedRates.length;

            // Recalculate each failed rate
            for (const failedRate of failedRates) {
                try {
                    // Build target country object from the failed rate
                    const targetCountry = {
                        name: failedRate.countryName || failedRate.country || 'Australia',
                        code: failedRate.countryCode || failedRate.country || 'AU',
                        postcode: failedRate.postcode || '',
                        province: failedRate.province || ''
                    };

                    // Get full product document (not lean) for calculation
                    const fullProduct = await Product.findById(product._id);
                    if (!fullProduct) {
                        errors.push({
                            productId: product._id,
                            title: product.title,
                            location: `${targetCountry.name} ${targetCountry.postcode}`,
                            error: 'Product not found'
                        });
                        continue;
                    }

                    // Calculate shipping for this specific location
                    logger.info(`  🔄 Recalculating: ${product.title} → ${targetCountry.name} ${targetCountry.postcode}`);
                    const result = await shippingService.calculateProductShipping(
                        fullProduct,
                        product.metafields || fullProduct.metafields,
                        targetCountry
                    );
                    logger.info(`  ✅ Calculated: ${product.title} → ${targetCountry.name} (Standard: $${result.maxCheapPriceUSD || 0}, Express: $${result.maxExpressPriceUSD || 0})`);
                    
                    // Small delay to avoid overwhelming the API
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // Find the matching rate in the product's shippingRates array
                    const rateIndex = fullProduct.shippingRates.findIndex(r => 
                        (r.countryName || r.country) === targetCountry.name &&
                        (r.postcode || '') === (targetCountry.postcode || '') &&
                        (r.province || '') === (targetCountry.province || '')
                    );

                    if (rateIndex >= 0) {
                        // Update the rate with new data
                        const rate = fullProduct.shippingRates[rateIndex];
                        rate.cheapService = result.cheapService || '';
                        rate.expressService = result.expressService || '';
                        rate.cheapPriceUSD = result.maxCheapPriceUSD || 0;
                        rate.expressPriceUSD = result.maxExpressPriceUSD || 0;
                        rate.cheapOption = result.cheapOption || null;
                        rate.expressOption = result.expressOption || null;
                        
                        // Update days if available
                        if (result.cheapOption && result.cheapOption.days) {
                            rate.cheapDays = result.cheapOption.days;
                        }
                        if (result.expressOption && result.expressOption.days) {
                            rate.expressDays = result.expressOption.days;
                        }

                        await fullProduct.save();
                        totalRecalculated++;
                    } else {
                        errors.push({
                            productId: product._id,
                            title: product.title,
                            location: `${targetCountry.name} ${targetCountry.postcode}`,
                            error: 'Rate not found in product'
                        });
                    }

                } catch (error) {
                    errors.push({
                        productId: product._id,
                        title: product.title,
                        location: `${failedRate.countryName || failedRate.country} ${failedRate.postcode || ''}`,
                        error: error.message
                    });
                    logger.error(`Error recalculating rate for product ${product._id}:`, error);
                }
                }
            }

            logger.info(`✅ Recalculation complete: ${totalRecalculated} rates recalculated, ${totalFailedRates} failed rates found`);
            logger.info(`📊 Final stats: ${processedProducts} products processed, ${totalFailedRates} failed rates found, ${totalRecalculated} recalculated, ${errors.length} errors`);
        } catch (bgError) {
            logger.error('Background recalculation error:', bgError);
        }
        })();

    } catch (error) {
        logger.error('Recalculate failed rates error:', error);
        res.status(500).json({ error: 'Failed to recalculate failed rates', details: error.message });
    }
});

/**
 * POST /api/shipping/assign-codes
 * Assign ONE unique code per PRODUCT (not per location)
 * Products with similar shipping characteristics get the same code
 */
router.post('/assign-codes', async (req, res) => {
    try {
        const { shop } = req.body;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop domain required' });
        }

        logger.info(`🔢 Starting code assignment for shop: ${shop}`);

        // Get all products with shipping rates
        const products = await Product.find({ 
            shopDomain: shop,
            shippingProcessed: true,
            'shippingRates.0': { $exists: true }
        }).select('shippingRates').lean();

        logger.info(`📦 Found ${products.length} products with shipping rates`);

        // Helper: Get normalized price tier
        const getPriceTier = (price) => {
            if (!price || price <= 0) return 0;
            // Group prices into tiers (e.g., 0-5, 5-10, 10-20, etc.)
            if (price < 5) return Math.floor(price);
            if (price < 10) return Math.floor(price);
            if (price < 20) return Math.floor(price / 2) * 2;
            if (price < 50) return Math.floor(price / 5) * 5;
            return Math.floor(price / 10) * 10;
        };

        // Map to store unique product characteristics: key = price tiers + services, value = code
        const codeMap = new Map();
        let nextCode = 1;

        // First pass: analyze each product and create a signature based on its shipping characteristics
        const productSignatures = [];
        
        for (const product of products) {
            if (!product.shippingRates || !Array.isArray(product.shippingRates) || product.shippingRates.length === 0) {
                continue;
            }

            // Collect all price tiers and services across all locations for this product
            const cheapTiers = new Set();
            const expressTiers = new Set();
            const cheapServices = new Set();
            const expressServices = new Set();
            
            product.shippingRates.forEach(rate => {
                if (rate.cheapPriceUSD && rate.cheapPriceUSD > 0) {
                    const tier = getPriceTier(rate.cheapPriceUSD);
                    cheapTiers.add(tier);
                    if (rate.cheapService) cheapServices.add(rate.cheapService);
                }
                if (rate.expressPriceUSD && rate.expressPriceUSD > 0) {
                    const tier = getPriceTier(rate.expressPriceUSD);
                    expressTiers.add(tier);
                    if (rate.expressService) expressServices.add(rate.expressService);
                }
            });

            // Create signature: sorted price tiers + most common services
            const cheapTiersArray = Array.from(cheapTiers).sort((a, b) => a - b);
            const expressTiersArray = Array.from(expressTiers).sort((a, b) => a - b);
            const cheapServicesArray = Array.from(cheapServices).sort();
            const expressServicesArray = Array.from(expressServices).sort();
            
            // Create unique key based on product's shipping characteristics (not location)
            const signature = `${cheapTiersArray.join(',')}|${expressTiersArray.join(',')}|${cheapServicesArray.join(',')}|${expressServicesArray.join(',')}`;
            
            productSignatures.push({
                productId: product._id,
                signature: signature,
                ratesCount: product.shippingRates.length
            });
        }

        logger.info(`📊 Found ${productSignatures.length} products to assign codes`);

        // Assign codes to unique product signatures
        const codeAssignments = new Map();
        for (const ps of productSignatures) {
            if (!codeAssignments.has(ps.signature)) {
                codeAssignments.set(ps.signature, nextCode++);
            }
        }

        logger.info(`🔢 Generated ${codeAssignments.size} unique codes for products`);

        // Second pass: update ALL shipping rates for each product with the same code
        let assignedCount = 0;
        let totalRatesAssigned = 0;
        const errors = [];

        for (const ps of productSignatures) {
            try {
                const code = codeAssignments.get(ps.signature);
                
                // Update ALL shipping rates for this product with the same code
                const updateOps = {};
                // We need to update all rates, but we don't know the exact count
                // So we'll use a different approach: update the product document directly
                
                // Get the product to update all rates
                const product = await Product.findById(ps.productId);
                if (!product) {
                    errors.push({
                        title: `Product ${ps.productId}`,
                        error: 'Product not found'
                    });
                    continue;
                }

                // Update all shipping rates for this product
                if (product.shippingRates && Array.isArray(product.shippingRates)) {
                    product.shippingRates.forEach((rate, index) => {
                        rate.assignedCode = code;
                    });
                    
                    await product.save();
                    assignedCount++;
                    totalRatesAssigned += product.shippingRates.length;
                }
            } catch (error) {
                errors.push({
                    title: `Product ${ps.productId}`,
                    error: error.message
                });
                logger.error(`Error updating product ${ps.productId}:`, error);
            }
        }

        logger.info(`✅ Code assignment complete: ${assignedCount} products, ${totalRatesAssigned} rates, ${codeAssignments.size} unique codes`);

        res.json({
            success: true,
            assignedCount: assignedCount,
            totalRatesAssigned: totalRatesAssigned,
            uniqueCodesGenerated: codeAssignments.size,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        logger.error('Assign codes error:', error);
        res.status(500).json({ error: 'Failed to assign codes', details: error.message });
    }
});

router.post('/update-weights', async (req, res) => {
    res.status(501).json({ error: 'Endpoint not yet restored' });
});

router.post('/unprocess', async (req, res) => {
    res.status(501).json({ error: 'Endpoint not yet restored' });
});

router.post('/delete-rates', async (req, res) => {
    res.status(501).json({ error: 'Endpoint not yet restored' });
});

/**
 * GET /api/shipping/rates
 * Get all shipping rates data for CSV export - COMPLETELY REBUILT
 * Returns one row per unique location-code combination
 */
router.get('/rates', async (req, res) => {
    try {
        const { shop } = req.query;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop domain required' });
        }

        logger.info(`📊 Starting shipping rates export for shop: ${shop}`);

        // Count total products first
        const totalProducts = await Product.countDocuments({ 
            shopDomain: shop,
            shippingProcessed: true,
            'shippingRates.0': { $exists: true }
        });
        
        logger.info(`📦 Found ${totalProducts} products with shipping rates - processing in batches`);

        // Helper: Round price UP to nearest tier for grouping (MORE AGGRESSIVE)
        // Always round UP to ensure we don't underestimate shipping costs
        const roundToPriceTier = (price) => {
            if (!price || price <= 0) return 0;
            // Much broader tiers to group more rates together
            if (price < 10) {
                return 10; // All prices < $10 grouped together
            } else if (price < 25) {
                return Math.ceil(price / 5) * 5; // Round UP to nearest $5
            } else if (price < 50) {
                return Math.ceil(price / 10) * 10; // Round UP to nearest $10
            } else if (price < 100) {
                return Math.ceil(price / 25) * 25; // Round UP to nearest $25
            } else {
                return Math.ceil(price / 50) * 50; // Round UP to nearest $50 for higher prices
            }
        };

        // Helper: Round days to nearest tier (MORE AGGRESSIVE)
        const roundToDayTier = (days) => {
            if (!days || days <= 0) return 0;
            // Round to nearest 10 days for broader grouping
            return Math.round(days / 10) * 10;
        };

        // Map: key = "country|province|postcode|standardService|standardPriceTier|expressService|expressPriceTier", value = aggregated data
        const map = new Map();

        let totalRates = 0;
        let ratesWithCodes = 0;
        const batchSize = 100; // Process 100 products at a time

        // Process products in batches to avoid memory issues
        for (let skip = 0; skip < totalProducts; skip += batchSize) {
            logger.info(`📦 Processing batch: ${skip + 1} to ${Math.min(skip + batchSize, totalProducts)} of ${totalProducts}`);
            
            const products = await Product.find({ 
                shopDomain: shop,
                shippingProcessed: true,
                'shippingRates.0': { $exists: true }
            })
            .select('shippingRates')
            .skip(skip)
            .limit(batchSize)
            .lean();

            // Process each product in this batch
            for (const product of products) {
                if (!product.shippingRates || !Array.isArray(product.shippingRates)) {
                    continue;
                }

                // Process each shipping rate
                for (const rate of product.shippingRates) {
                totalRates++;

                // Get code
                let code = null;
                if (rate.assignedCode !== null && rate.assignedCode !== undefined && rate.assignedCode !== '') {
                    const codeNum = Number(rate.assignedCode);
                    if (!isNaN(codeNum) && codeNum > 0) {
                        code = codeNum;
                        ratesWithCodes++;
                    }
                }

                // Skip if no code
                if (code === null || code === 0) {
                    continue;
                }

                // Get location
                const country = rate.countryName || 'Unknown';
                const countryCode = rate.countryCode || '';
                const province = rate.province || '';
                const postcode = rate.postcode || '';

                // Get services
                const standardService = rate.cheapService || '';
                const expressService = rate.expressService || '';

                // Get prices
                const standardPrice = rate.cheapPriceUSD || 0;
                const expressPrice = rate.expressPriceUSD || 0;
                
                // Don't skip - include all rates with codes, even if shipping data is incomplete
                // This ensures codes appear in all countries where products with that code ship

                // Get price tiers (only if we have valid prices)
                const standardPriceTier = standardPrice > 0 ? roundToPriceTier(standardPrice) : 0;
                const expressPriceTier = expressPrice > 0 ? roundToPriceTier(expressPrice) : 0;

                // Create unique key: location + code (each code gets its own row per location)
                // This ensures all 1008 codes are represented in the CSV
                const key = `${countryCode || country}|${province}|${postcode}|${code}`;

                // Get or create entry
                if (!map.has(key)) {
                    map.set(key, {
                        country: country,
                        countryCode: countryCode,
                        province: province,
                        postcode: postcode,
                        codes: [], // Track all codes for this rate combination
                        standardServices: [],
                        standardPrices: [],
                        standardMinDays: null,
                        standardMaxDays: null,
                        expressServices: [],
                        expressPrices: [],
                        expressMinDays: null,
                        expressMaxDays: null
                    });
                }

                const entry = map.get(key);

                // Track code (keep lowest later)
                if (code > 0 && !entry.codes.includes(code)) {
                    entry.codes.push(code);
                }

                // Add standard/economy data
                if (rate.cheapService && !entry.standardServices.includes(rate.cheapService)) {
                    entry.standardServices.push(rate.cheapService);
                }
                if (rate.cheapPriceUSD !== null && rate.cheapPriceUSD !== undefined && !isNaN(rate.cheapPriceUSD) && rate.cheapPriceUSD > 0) {
                    entry.standardPrices.push(Number(rate.cheapPriceUSD));
                }
                if (rate.cheapOption?.minTimeInTransit !== null && rate.cheapOption?.minTimeInTransit !== undefined) {
                    const days = Number(rate.cheapOption.minTimeInTransit);
                    if (!isNaN(days) && (entry.standardMinDays === null || days < entry.standardMinDays)) {
                        entry.standardMinDays = days;
                    }
                }
                if (rate.cheapOption?.maxTimeInTransit !== null && rate.cheapOption?.maxTimeInTransit !== undefined) {
                    const days = Number(rate.cheapOption.maxTimeInTransit);
                    if (!isNaN(days) && (entry.standardMaxDays === null || days > entry.standardMaxDays)) {
                        entry.standardMaxDays = days;
                    }
                }

                // Add express data
                if (rate.expressService && !entry.expressServices.includes(rate.expressService)) {
                    entry.expressServices.push(rate.expressService);
                }
                if (rate.expressPriceUSD !== null && rate.expressPriceUSD !== undefined && !isNaN(rate.expressPriceUSD) && rate.expressPriceUSD > 0) {
                    entry.expressPrices.push(Number(rate.expressPriceUSD));
                }
                if (rate.expressOption?.minTimeInTransit !== null && rate.expressOption?.minTimeInTransit !== undefined) {
                    const days = Number(rate.expressOption.minTimeInTransit);
                    if (!isNaN(days) && (entry.expressMinDays === null || days < entry.expressMinDays)) {
                        entry.expressMinDays = days;
                    }
                }
                if (rate.expressOption?.maxTimeInTransit !== null && rate.expressOption?.maxTimeInTransit !== undefined) {
                    const days = Number(rate.expressOption.maxTimeInTransit);
                    if (!isNaN(days) && (entry.expressMaxDays === null || days > entry.expressMaxDays)) {
                        entry.expressMaxDays = days;
                    }
                }
                }
            }
        }

        logger.info(`📊 Processed ${totalRates} rates, ${ratesWithCodes} with codes, created ${map.size} unique rate combinations (grouped by service + price tier)`);

        // Debug: Check code distribution
        const locationCounts = {};
        map.forEach((entry, key) => {
            const locKey = `${entry.country}|${entry.province}|${entry.postcode}`;
            if (!locationCounts[locKey]) {
                locationCounts[locKey] = new Set();
            }
            // Add all codes for this location
            entry.codes.forEach(code => {
                if (code > 0) {
                    locationCounts[locKey].add(code);
                }
            });
        });
        
        logger.info(`📊 Sample location code counts (after grouping):`);
        Object.keys(locationCounts).slice(0, 10).forEach(loc => {
            const codes = Array.from(locationCounts[loc]).sort((a, b) => a - b);
            logger.info(`  ${loc}: ${codes.length} unique codes - ${codes.slice(0, 20).join(', ')}${codes.length > 20 ? '...' : ''}`);
        });
        
        // Specifically check Australia ACT 2600
        const ausAct2600 = locationCounts['Australia|ACT|2600'];
        if (ausAct2600) {
            const codes = Array.from(ausAct2600).sort((a, b) => a - b);
            logger.info(`📊 Australia ACT 2600: ${codes.length} unique codes after grouping - ${codes.join(', ')}`);
        }
        
        // Debug: Check code distribution by code number (how many locations per code)
        const codeLocationCounts = {};
        map.forEach((entry, key) => {
            entry.codes.forEach(code => {
                if (code > 0) {
                    if (!codeLocationCounts[code]) {
                        codeLocationCounts[code] = new Set();
                    }
                    const locKey = `${entry.country}|${entry.province}|${entry.postcode}`;
                    codeLocationCounts[code].add(locKey);
                }
            });
        });
        
        // Log sample codes (including code 10)
        const sampleCodes = [10, 2, 15, 38, 39, 48];
        sampleCodes.forEach(code => {
            if (codeLocationCounts[code]) {
                const locations = Array.from(codeLocationCounts[code]);
                logger.info(`📊 Code ${code}: appears in ${locations.length} locations - ${locations.slice(0, 10).join(', ')}${locations.length > 10 ? '...' : ''}`);
            } else {
                logger.info(`📊 Code ${code}: NOT FOUND in any locations`);
            }
        });
        
        // Also check BEFORE filtering to see if code 10 rates are being filtered out
        const code10BeforeFilter = [];
        map.forEach((entry, key) => {
            if (entry.codes.includes(10)) {
                code10BeforeFilter.push({
                    key: key,
                    country: entry.country,
                    province: entry.province,
                    postcode: entry.postcode,
                    hasStandardService: entry.standardServices && entry.standardServices.length > 0,
                    hasExpressService: entry.expressServices && entry.expressServices.length > 0,
                    hasStandardPrice: entry.standardPrices && entry.standardPrices.some(p => p > 0),
                    hasExpressPrice: entry.expressPrices && entry.expressPrices.some(p => p > 0)
                });
            }
        });
        logger.info(`📊 Code 10 BEFORE filtering: ${code10BeforeFilter.length} entries`);
        code10BeforeFilter.slice(0, 5).forEach(entry => {
            logger.info(`  - ${entry.country}|${entry.province}|${entry.postcode} - std: ${entry.hasStandardService}/${entry.hasStandardPrice}, exp: ${entry.hasExpressService}/${entry.hasExpressPrice}`);
        });

        // Convert to array and format - FILTER OUT entries without codes OR without shipping data
        const beforeFilter = Array.from(map.values());
        logger.info(`📊 Before filtering: ${beforeFilter.length} entries in map`);
        
        const results = beforeFilter
            .filter(entry => {
                // Must have at least one code
                if (!entry.codes || entry.codes.length === 0) {
                    return false;
                }
                
                // Include all entries with codes, even if shipping data is incomplete
                // This ensures codes appear in all countries where products with that code ship
                // (Previously filtered out entries without service/price, but that hid codes in some countries)
                return true;
            });
        
        logger.info(`📊 After filtering: ${results.length} entries (filtered out ${beforeFilter.length - results.length})`);
        
        const formattedResults = results.map(entry => {
                // Most common service
                const getMostCommon = (arr) => {
                    if (!arr || arr.length === 0) return '';
                    const counts = {};
                    arr.forEach(item => {
                        if (item) counts[item] = (counts[item] || 0) + 1;
                    });
                    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, '');
                };

                // Get maximum price (not range)
                const getMaxPrice = (prices) => {
                    if (!prices || prices.length === 0) {
                        return null;
                    }
                    const valid = prices.filter(p => p > 0);
                    if (valid.length === 0) {
                        return null;
                    }
                    return Math.max(...valid);
                };

                // Get lowest code from merged codes
                const lowestCode = entry.codes && entry.codes.length > 0 
                    ? Math.min(...entry.codes.filter(c => c > 0))
                    : null;

                const standardService = getMostCommon(entry.standardServices);
                const expressService = getMostCommon(entry.expressServices);
                const standardPrice = getMaxPrice(entry.standardPrices);
                const expressPrice = getMaxPrice(entry.expressPrices);

                return {
                    country: entry.country || '',
                    countryCode: entry.countryCode || '',
                    province: entry.province || '',
                    postcode: entry.postcode || '',
                    standardService: standardService || '',
                    standardPrice: standardPrice !== null && standardPrice !== undefined ? standardPrice : null, // Single max price, not range
                    standardMinDays: entry.standardMinDays !== null && entry.standardMinDays !== undefined ? entry.standardMinDays : null,
                    standardMaxDays: entry.standardMaxDays !== null && entry.standardMaxDays !== undefined ? entry.standardMaxDays : null,
                    expressService: expressService || '',
                    expressPrice: expressPrice !== null && expressPrice !== undefined ? expressPrice : null, // Single max price, not range
                    expressMinDays: entry.expressMinDays !== null && entry.expressMinDays !== undefined ? entry.expressMinDays : null,
                    expressMaxDays: entry.expressMaxDays !== null && entry.expressMaxDays !== undefined ? entry.expressMaxDays : null,
                    uniqueCode: lowestCode ? String(lowestCode) : '' // Lowest code from merged codes
                };
            });

        // No additional grouping needed - we already grouped by location + code
        // Each code per location gets its own row
        let groupedResults = formattedResults;

        // Sort by country, then code
        groupedResults.sort((a, b) => {
            if (a.country !== b.country) {
                return a.country.localeCompare(b.country);
            }
            const codeA = Number(a.uniqueCode) || 0;
            const codeB = Number(b.uniqueCode) || 0;
            return codeA - codeB;
        });

        // Debug logging
        const codesByCountry = {};
        groupedResults.forEach(r => {
            if (!codesByCountry[r.country]) {
                codesByCountry[r.country] = new Set();
            }
            codesByCountry[r.country].add(r.uniqueCode);
        });
        
        logger.info(`📊 Results: ${formattedResults.length} rows (grouped by location + code, no additional merging)`);
        Object.keys(codesByCountry).slice(0, 5).forEach(country => {
            const codes = Array.from(codesByCountry[country]).sort((a, b) => Number(a) - Number(b));
            logger.info(`  ${country}: ${codes.length} unique codes - ${codes.slice(0, 10).join(', ')}${codes.length > 10 ? '...' : ''}`);
        });

        res.json({ 
            success: true, 
            data: groupedResults, 
            count: groupedResults.length
        });

    } catch (error) {
        logger.error('Get rates error:', error);
        res.status(500).json({ error: 'Failed to get rates', details: error.message });
    }
});

/**
 * POST /api/shipping/carrier-service
 * Carrier Calculated Shipping callback endpoint
 * Shopify calls this during checkout to get real-time shipping rates
 */
// CRITICAL: Allow ngrok browser warning bypass
// CRITICAL: Shopify now sends JSON (format: 'json'), not XML
router.post('/carrier-service', express.json({ limit: '10mb' }), (req, res, next) => {
    // Disable compression for this response
    res.set('Content-Encoding', 'identity');
    res.set('ngrok-skip-browser-warning', 'true');
    next();
}, async (req, res) => {
    
    const startTime = Date.now();
    // Reduced logging for performance - only log essential info
    logger.info(`📦 Carrier service request: ${req.query.shop || 'unknown'} → ${req.body.rate?.destination?.country_code || 'unknown'}`);
    try {
        const shopDomain = req.query.shop || req.headers['x-shopify-shop-domain'] || req.headers['x-shopify-shop_domain'];
        
        if (!shopDomain) {
            logger.error('Carrier service called without shop domain');
            logger.error(`  Query: ${JSON.stringify(req.query)}`);
            logger.error(`  Headers keys: ${Object.keys(req.headers).join(', ')}`);
            logger.error(`  X-Shopify-Shop-Domain header: ${req.headers['x-shopify-shop-domain']}`);
            return res.status(400).json({ error: 'Shop domain required' });
        }

        logger.info(`📦 Carrier service request from shop: ${shopDomain}`);
        logger.info(`📥 Full JSON body: ${JSON.stringify(req.body, null, 2)}`);
        
        // Parse JSON request from Shopify (format: 'json')
        // Shopify sends: { rate: { origin: {...}, destination: {...}, items: {...}, currency: "AUD" } }
        const rateData = req.body.rate || req.body;
        const destination = rateData.destination || {};
        
        // Get currency from Shopify request
        // Shopify sometimes sends USD even when checkout is in GBP, so detect from destination country
        let checkoutCurrency = rateData.currency || 'AUD';
        
        // Override currency based on destination country if Shopify sent wrong currency
        const destCountry = destination.country_code || destination.country || '';
        if (destCountry === 'GB' && checkoutCurrency === 'USD') {
            // Shopify sent USD but destination is UK - use GBP
            checkoutCurrency = 'GBP';
            logger.info(`  ⚠️ Shopify sent USD but destination is GB - overriding to GBP`);
        } else if (destCountry === 'GB' && !checkoutCurrency) {
            checkoutCurrency = 'GBP';
        }
        
        logger.info(`  Checkout currency: ${checkoutCurrency} (from request: ${rateData.currency || 'none'}, destination: ${destCountry})`);
        
        // Items in JSON format - can be array or object with item property
        let items = rateData.items || null;
        
        logger.info(`Rate data keys: ${Object.keys(rateData)}`);
        logger.info(`Items type: ${items ? typeof items : 'null'}`);
        logger.info(`Items: ${items ? JSON.stringify(items).substring(0, 2000) : 'null'}`);
        
        // Handle JSON items format
        let itemArray = [];
        
        if (items) {
            // If items is an array, use it directly
            if (Array.isArray(items)) {
                itemArray = items;
            }
            // If items has an 'item' property (array or single object)
            else if (items.item) {
                if (Array.isArray(items.item)) {
                    itemArray = items.item;
                } else if (typeof items.item === 'object') {
                    itemArray = [items.item];
                }
            }
            // If items is a single object, wrap it in array
            else if (typeof items === 'object') {
                itemArray = [items];
            }
        }
        
        logger.info(`Raw itemArray length: ${itemArray.length}`);
        
        // Extract product_id from items - Shopify JSON uses 'product_id' or 'variant_id'
        const processedItems = [];
        for (const item of itemArray) {
            // Extract product_id and variant_id from JSON format
            let productId = item.product_id || item['product-id'] || null;
            let variantId = item.variant_id || item['variant-id'] || null;
            let quantity = item.quantity || 1;
            let grams = item.grams || 0;
            let name = item.name || '';
            
            // Convert to numbers/strings
            productId = productId ? String(productId) : null;
            variantId = variantId ? String(variantId) : null;
            quantity = parseInt(quantity) || 1;
            grams = parseInt(grams) || 0;
            name = String(name || '');
            
            if (productId || variantId) {
                logger.info(`  Found item: product-id=${productId}, variant-id=${variantId}, quantity=${quantity}, grams=${grams}`);
                processedItems.push({
                    product_id: productId || variantId,
                    variant_id: variantId || productId,
                    quantity: quantity,
                    grams: grams,
                    name: name
                });
            } else {
                logger.warn(`  Item missing product_id and variant_id: ${JSON.stringify(item).substring(0, 200)}`);
            }
        }
        
        logger.info(`Processed items count: ${processedItems.length}`);
        
        // Use processed items
        itemArray = processedItems;

        logger.info(`  Destination: ${destination.country || 'N/A'}, ${destination.postal_code || 'N/A'}`);
        logger.info(`  Items in cart: ${itemArray.length}`);

        // Get shop data (for product data lookup)
        // Note: This endpoint is called by Shopify directly, so we don't need access token here
        // We just need to look up products from our database
        const shopData = await Shop.findOne({ domain: shopDomain });
        if (!shopData) {
            logger.warn(`Shop ${shopDomain} not found in database - carrier service may not be fully configured`);
        }

        // Initialize BuckyDrop service
        const BUCKY_DROP_CONFIG = {
            APPCODE: process.env.BUCKY_DROP_APPCODE || "ae75dfea63cc39f6efe052af4a8b9dea",
            APPSECRET: process.env.BUCKY_DROP_APPSECRET || "8d8e3c046d6bf420b5999899786d8481",
            DOMAIN: "https://bdopenapi.buckydrop.com",
            API_PATH: "api/rest/v2/adapt/adaptation/logistics/channel-carriage-list",
        };
        const shippingService = new ShippingService(BUCKY_DROP_CONFIG);

        // Use comprehensive country mapping for all ISO 3166-1 alpha-2 codes
        const { getCountryMapping } = require('../utils/countryMapping');

        // Reuse destCountry from above (line 790) - use country_code if available, otherwise country, default to 'AU'
        const destCountryForMapping = destCountry || destination.country || 'AU';
        const countryInfo = getCountryMapping(destCountryForMapping);
        
        const targetCountry = {
            name: countryInfo.name,
            code: countryInfo.code,
            buckyDropName: countryInfo.buckyDropName, // Include buckyDropName for US -> USA
            postcode: destination.postal_code || '',
            province: destination.province || '',
            provinceCode: destination.province_code || '',
            address: destination.address1 || '',
        };

        // Get access token for fetching product data from Shopify
        let accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
        if (!accessToken) {
            const shopData = await Shop.findOne({ domain: shopDomain });
            if (shopData && shopData.accessToken) {
                accessToken = shopData.accessToken;
            }
        }

        if (!accessToken) {
            logger.error('No access token available to fetch metafields from Shopify');
            return res.status(200).json({ rates: [] });
        }

        // STEP 1: Collect all products' weights and dimensions to combine into ONE shipment
        const clothingKeywords = ['clothing', 'clothes', 'apparel', 'garment', 'wear'];
        const batteryKeywords = ['battery', 'batteries', 'battries', 'power bank', 'powerbank'];
        
        let combinedWeight = 0;
        let combinedDimensions = {
            height: 0,
            length: 0,
            width: 0
        };
        const productInfo = {
            isClothing: false,
            isBattery: false
        };
        const allMetafields = []; // Collect metafields for combined calculation

        logger.info(`📦 Combining ${processedItems.length} items into one shipment calculation`);
        
        // OPTIMIZATION: Skip Shopify API calls entirely - use weight from request and defaults
        // This saves 2-4 seconds per request
        const shopifyApiStartTime = Date.now();
        let shopifyApiTime = 0;
        
        // Quick DB lookup for metafields (non-blocking, use defaults if not found)
        const productDataPromises = processedItems.map(async (item) => {
            const productId = item.product_id;
            const quantity = item.quantity || 1;
            const weightGrams = item.grams || 0;
            const weightKg = (weightGrams / 1000) * quantity;
            
            // Check for clothing/battery keywords in item name
            const name = (item.name || '').toLowerCase();
            const isClothing = clothingKeywords.some(keyword => name.includes(keyword));
            const isBattery = batteryKeywords.some(keyword => name.includes(keyword));
            
            let metafields = [];
            
            // Quick DB lookup only (no Shopify API calls)
            if (productId) {
                try {
                    const cachedProduct = await Product.findOne({ 
                        shopDomain: shopDomain,
                        shopifyId: productId 
                    }).select('metafields').lean();
                    
                    if (cachedProduct && cachedProduct.metafields && cachedProduct.metafields.length > 0) {
                        metafields = cachedProduct.metafields;
                    }
                } catch (dbError) {
                    // Silently use defaults - don't log to avoid noise
                }
            }
            
            return {
                weightKg,
                isClothing,
                isBattery,
                metafields,
                productDetails: null // Skip product details fetch entirely
            };
        });
        
        // Wait for all product data to be fetched (DB lookups only, no API calls)
        const productDataResults = await Promise.all(productDataPromises);
        shopifyApiTime = Date.now() - shopifyApiStartTime;
        logger.info(`⏱️ Product data lookup took: ${shopifyApiTime}ms (${processedItems.length} products, DB only - no Shopify API)`);
        
        // Process results
        for (let i = 0; i < productDataResults.length; i++) {
            const result = productDataResults[i];
            const item = processedItems[i];
            
            combinedWeight += result.weightKg;
            
            if (result.isClothing) productInfo.isClothing = true;
            if (result.isBattery) productInfo.isBattery = true;
            
            allMetafields.push(...result.metafields);
            
            // Check product details for clothing/battery keywords
            if (result.productDetails) {
                const productText = [
                    result.productDetails.title || '',
                    result.productDetails.product_type || '',
                    result.productDetails.tags || '',
                    result.productDetails.vendor || ''
                ].join(' ').toLowerCase();
                
                if (clothingKeywords.some(keyword => productText.includes(keyword))) {
                    productInfo.isClothing = true;
                }
                if (batteryKeywords.some(keyword => productText.includes(keyword))) {
                    productInfo.isBattery = true;
                }
            }
        }

        // Calculate combined dimensions for multiple items
        // For cylindrical items (like air filters), stack them vertically
        let maxHeight = 0;
        let maxDiameter = 0;
        let totalQuantity = 0;
        
        // Calculate total quantity of all items
        for (const item of processedItems) {
            totalQuantity += (item.quantity || 1);
        }
        
        // Find max dimensions from all products
        for (const meta of allMetafields) {
            if (meta.key === 'height_raw' || meta.key === 'height_raw_mm_') {
                const h = parseFloat(meta.value) || 0;
                if (h > maxHeight) maxHeight = h;
            }
            if (meta.key === 'largest_diameter_raw' || meta.key === 'largest_diameter_raw_mm_') {
                const d = parseFloat(meta.value) || 0;
                if (d > maxDiameter) maxDiameter = d;
            }
        }

        // For BuckyDrop API: Send single-item dimensions and let BuckyDrop multiply via count parameter
        // BuckyDrop will handle the multiplication internally when count > 1
        // So we send the max single-item dimensions, not stacked dimensions
        const singleItemHeight = maxHeight;
        
        // Default dimensions if not found (single item dimensions)
        combinedDimensions.height = singleItemHeight || 100;
        combinedDimensions.length = maxDiameter || 100;
        combinedDimensions.width = maxDiameter || 100;

        // Default weight if zero
        if (combinedWeight <= 0) {
            combinedWeight = 0.1 * totalQuantity; // 0.1kg per item minimum
        }

        // Store last request details for debugging
        const requestDetails = {
            timestamp: new Date().toISOString(),
            shop: shopDomain,
            destination: destination.country_code || destination.country,
            weight: combinedWeight.toFixed(3),
            dimensions: {
                height: combinedDimensions.height,
                length: combinedDimensions.length,
                width: combinedDimensions.width
            },
            quantity: totalQuantity,
            itemsCount: processedItems.length,
            items: processedItems.map(item => ({
                name: item.name,
                quantity: item.quantity,
                grams: item.grams,
                weightKg: ((item.grams || 0) / 1000 * (item.quantity || 1)).toFixed(3)
            })),
            isClothing: productInfo.isClothing,
            isBattery: productInfo.isBattery,
            cached: false
        };
        
        lastRequestDetails = requestDetails;
        recentRequests.push(requestDetails);
        if (recentRequests.length > MAX_RECENT_REQUESTS) {
            recentRequests.shift(); // Remove oldest
        }
        
        // Log shipment details prominently to console (always visible)
        console.log(`\n📦 SHIPMENT DETAILS:`);
        console.log(`   Weight: ${combinedWeight.toFixed(3)} kg`);
        console.log(`   Dimensions: ${combinedDimensions.height}mm (H) × ${combinedDimensions.length}mm (L) × ${combinedDimensions.width}mm (W)`);
        console.log(`   Quantity: ${totalQuantity} items`);
        console.log(`   Items in Cart: ${processedItems.length}`);
        console.log(`   Clothing: ${productInfo.isClothing}, Battery: ${productInfo.isBattery}`);
        console.log(`\n`);
        
        logger.info(`═══════════════════════════════════════════════════════════`);
        logger.info(`📦 SHIPMENT DETAILS FOR LAST RATE CALL:`);
        logger.info(`   Weight: ${combinedWeight.toFixed(3)} kg`);
        logger.info(`   Dimensions: ${combinedDimensions.height}mm (H) × ${combinedDimensions.length}mm (L) × ${combinedDimensions.width}mm (W)`);
        logger.info(`   Quantity: ${totalQuantity} items`);
        logger.info(`   Total Items in Cart: ${processedItems.length}`);
        logger.info(`   Product Info: isClothing=${productInfo.isClothing}, isBattery=${productInfo.isBattery}`);
        logger.info(`═══════════════════════════════════════════════════════════`);

        // STEP 2: Check cache first
        const cacheCheckStartTime = Date.now();
        const cacheKey = generateCacheKey(destination, processedItems, combinedWeight, combinedDimensions);
        const cachedRates = getCachedRates(cacheKey);
        const cacheCheckTime = Date.now() - cacheCheckStartTime;
        
        if (cachedRates) {
            // Store request details even for cache hits
            const requestDetails = {
                timestamp: new Date().toISOString(),
                shop: shopDomain,
                destination: destination.country_code || destination.country,
                weight: combinedWeight.toFixed(3),
                dimensions: {
                    height: combinedDimensions.height,
                    length: combinedDimensions.length,
                    width: combinedDimensions.width
                },
                quantity: totalQuantity,
                itemsCount: processedItems.length,
                items: processedItems.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    grams: item.grams,
                    weightKg: ((item.grams || 0) / 1000 * (item.quantity || 1)).toFixed(3)
                })),
                isClothing: productInfo.isClothing,
                isBattery: productInfo.isBattery,
                cached: true
            };
            
            lastRequestDetails = requestDetails;
            recentRequests.push(requestDetails);
            if (recentRequests.length > MAX_RECENT_REQUESTS) {
                recentRequests.shift(); // Remove oldest
            }
            
            logger.info(`⚡ Cache HIT! Returning cached rates (key: ${cacheKey.substring(0, 8)}...) - cache check: ${cacheCheckTime}ms`);
            const responseTime = Date.now() - startTime;
            const jsonResponse = { rates: cachedRates };
            const compactJson = JSON.stringify(jsonResponse);
            
            res.status(200);
            res.set({
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Length': Buffer.byteLength(compactJson, 'utf8').toString(),
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'X-Cache': 'HIT' // Header to indicate cache was used
            });
            res.send(compactJson);
            
            setImmediate(() => {
                logger.info(`✅ Cached response sent: ${cachedRates.length} rates in ${responseTime}ms`);
            });
            return;
        }
        
        logger.info(`💾 Cache MISS - calculating rates (key: ${cacheKey.substring(0, 8)}...) - cache check: ${cacheCheckTime}ms`);

        // STEP 3: Calculate shipping ONCE for the combined cart
        const combinedProduct = {
            title: `Cart with ${processedItems.length} items`,
            variants: [{
                weight: combinedWeight,
                weight_unit: 'kg'
            }]
        };

        // Create combined metafields object with largest dimensions
        const combinedMetafields = [
            { namespace: 'custom', key: 'weight_raw_kg_', value: combinedWeight.toString() },
            { namespace: 'custom', key: 'height_raw', value: combinedDimensions.height.toString() },
            { namespace: 'custom', key: 'largest_diameter_raw', value: combinedDimensions.length.toString() }
        ];

        // Collect all valid routes
        const allAvailableRoutes = [];
        
        try {
            // OPTION 1: Calculate consolidated shipping (entire cart as one shipment)
            const consolidatedStartTime = Date.now();
            logger.info(`📦 Calculating CONSOLIDATED shipping (all items together)`);
            const consolidatedResult = await shippingService.calculateProductShipping(
                combinedProduct,
                combinedMetafields,
                targetCountry,
                totalQuantity
            );
            const consolidatedTime = Date.now() - consolidatedStartTime;
            logger.info(`⏱️ Consolidated shipping calculation took: ${consolidatedTime}ms`);
            
            // OPTION 2: Calculate individual shipping for each product (parallel)
            const individualStartTime = Date.now();
            logger.info(`📦 Calculating INDIVIDUAL shipping (each product separately)`);
            
            const individualCalculations = await Promise.all(
                processedItems.map(async (item, index) => {
                    const itemWeightKg = ((item.grams || 0) / 1000) * (item.quantity || 1);
                    const itemProduct = {
                        title: item.name || `Product ${index + 1}`,
                        variants: [{
                            weight: itemWeightKg,
                            weight_unit: 'kg'
                        }]
                    };
                    
                    // Get metafields for this specific product
                    const itemMetafields = productDataResults[index]?.metafields || [];
                    
                    // Use default dimensions if not found
                    const itemHeight = itemMetafields.find(m => 
                        m.key === 'height_raw' || m.key === 'height_raw_mm_'
                    )?.value || combinedDimensions.height;
                    const itemDiameter = itemMetafields.find(m => 
                        m.key === 'largest_diameter_raw' || m.key === 'largest_diameter_raw_mm_'
                    )?.value || combinedDimensions.length;
                    
                    const itemMetafieldsFormatted = [
                        { namespace: 'custom', key: 'weight_raw_kg_', value: itemWeightKg.toString() },
                        { namespace: 'custom', key: 'height_raw', value: itemHeight.toString() },
                        { namespace: 'custom', key: 'largest_diameter_raw', value: itemDiameter.toString() }
                    ];
                    
                    try {
                        const itemResult = await shippingService.calculateProductShipping(
                            itemProduct,
                            itemMetafieldsFormatted,
                            targetCountry,
                            item.quantity || 1
                        );
                        return {
                            item: item,
                            result: itemResult,
                            cheapestPrice: Math.min(
                                itemResult.maxCheapPriceUSD || 999999,
                                itemResult.maxExpressPriceUSD || 999999
                            )
                        };
                    } catch (error) {
                        logger.warn(`  ⚠️ Failed to calculate individual shipping for ${item.name}: ${error.message}`);
                        return null;
                    }
                })
            );
            
            const individualTime = Date.now() - individualStartTime;
            logger.info(`⏱️ Individual shipping calculations took: ${individualTime}ms (${processedItems.length} products)`);
            
            // Calculate total for individual shipping
            const validIndividual = individualCalculations.filter(c => c !== null);
            const totalIndividualPrice = validIndividual.reduce((sum, calc) => sum + calc.cheapestPrice, 0);
            const consolidatedCheapestPrice = Math.min(
                consolidatedResult.maxCheapPriceUSD || 999999,
                consolidatedResult.maxExpressPriceUSD || 999999
            );
            
            logger.info(`💰 Price Comparison:`);
            logger.info(`   Consolidated: ${consolidatedCheapestPrice.toFixed(2)} CNY`);
            logger.info(`   Individual (sum): ${totalIndividualPrice.toFixed(2)} CNY`);
            logger.info(`   Savings: ${totalIndividualPrice > consolidatedCheapestPrice ? 'Consolidated is cheaper' : 'Individual is cheaper'} by ${Math.abs(totalIndividualPrice - consolidatedCheapestPrice).toFixed(2)} CNY`);
            
            // Collect individual shipping routes (best option per product)
            const individualRoutes = [];
            for (const calc of validIndividual) {
                if (calc.result && calc.result.allRoutes && calc.result.allRoutes.length > 0) {
                    // Find cheapest route for this product
                    const cheapestRoute = calc.result.allRoutes
                        .filter(r => r.available !== false && r.totalPrice)
                        .sort((a, b) => (a.totalPrice || 999999) - (b.totalPrice || 999999))[0];
                    
                    if (cheapestRoute) {
                        individualRoutes.push({
                            ...cheapestRoute,
                            productName: calc.item.name,
                            productQuantity: calc.item.quantity
                        });
                    }
                }
            }
            
            // Use consolidated result for processing, but we'll add individual option too
            const result = consolidatedResult;
            const buckyDropTime = consolidatedTime + individualTime;
            
            logger.info(`📦 Individual shipping: Found ${individualRoutes.length} product routes (out of ${processedItems.length} products)`);
            
            // Log timing breakdown
            const timeBeforeProcessing = Date.now() - startTime;
            logger.info(`⏱️ Timing breakdown: Shopify APIs=${shopifyApiTime}ms, BuckyDrop=${buckyDropTime}ms (Consolidated=${consolidatedTime}ms, Individual=${individualTime}ms), Before processing=${timeBeforeProcessing}ms`);

            // Collect all valid routes
            let routesToProcess = [];
            if (result.allRoutes && Array.isArray(result.allRoutes) && result.allRoutes.length > 0) {
                routesToProcess = result.allRoutes;
                logger.info(`  ✓ Found ${result.allRoutes.length} routes for combined shipment`);
            } else {
                logger.warn(`  ⚠️ allRoutes not available, using cheapOption and expressOption`);
                if (result.cheapOption) routesToProcess.push(result.cheapOption);
                if (result.expressOption) routesToProcess.push(result.expressOption);
            }
            
            // Reduced logging - only log count in production
            if (process.env.NODE_ENV !== 'production') {
                logger.info(`  Processing ${routesToProcess.length} routes from BuckyDrop`);
            }
            for (const route of routesToProcess) {
                let routeName = route.serviceName || route.service_name || route.channelName || route.channel_name || 'BuckyDrop Shipping';
                
                // Only include routes that are available
                if (route.available === false || !route.totalPrice) {
                    continue;
                }
                
                // BuckyDrop provides prices in RMB (CNY)
                // Send CNY currency to Shopify - Shopify will convert to checkout currency automatically
                // This supports all 100+ currencies Shopify supports
                const routePriceRMB = parseFloat(route.totalPrice || route.total_price || 0);
                const routePriceFinal = routePriceRMB; // Keep as RMB - Shopify handles conversion
                
                // Reduced logging for performance
                    
                    // Get delivery days from transit time
                    let minDays = route.minTimeInTransit || route.min_time_in_transit || 5;
                    let maxDays = route.maxTimeInTransit || route.max_time_in_transit || 15;
                    
                    // Add buffer ONLY for Small Package routes (check original name before cleaning)
                    // BuckyDrop returns business days, but we need to add buffer for:
                    // 1. Processing/handling time (1-2 days)
                    // 2. Weekend conversion (business days → calendar days)
                    // 3. Customs clearance delays
                    if (routeName.toLowerCase().includes('small package')) {
                        const baseMinDays = minDays;
                        const baseMaxDays = maxDays;
                        // Add buffer: +2 days for processing/handling, +30% for weekend conversion
                        minDays = Math.ceil(baseMinDays * 1.3) + 2;
                        maxDays = Math.ceil(baseMaxDays * 1.3) + 2;
                        logger.info(`    ⏱️ Added buffer to Small Package: ${baseMinDays}-${baseMaxDays} days → ${minDays}-${maxDays} days`);
                    }
                    
                    // FILTERING RULES:
                    // Hide rates with "clothing/clothes" unless product IS clothing
                    const routeNameLower = routeName.toLowerCase();
                    if ((routeNameLower.includes('clothing') || routeNameLower.includes('clothes')) && !productInfo.isClothing) {
                        logger.info(`    ⏭️ Skipped route (contains 'clothing/clothes' but product is not clothing): ${routeName}`);
                        continue;
                    }
                    
                    // Hide rates with "batteries/battries" unless product IS a battery
                    if ((routeNameLower.includes('batteries') || routeNameLower.includes('battries')) && !productInfo.isBattery) {
                        logger.info(`    ⏭️ Skipped route (contains 'batteries/battries' but product is not a battery): ${routeName}`);
                        continue;
                    }
                    
                    // Rename NL Post routes to cleaner names (do this FIRST, before other replacements)
                    // Match with flexible spacing to handle any variations
                    const originalName = routeName;
                    routeName = routeName.replace(/NL\s+Post\s+Preferential\s+Standard\s+Air\s+Mail/gi, 'Standard Air Mail');
                    routeName = routeName.replace(/NL\s+Post\s+Preferential\s+Air\s+Mail/gi, 'Standard Air Mail');
                    // Also match without "Preferential" in case it's already been removed
                    routeName = routeName.replace(/NL\s+Post\s+Standard\s+Air\s+Mail/gi, 'Standard Air Mail');
                    if (originalName !== routeName) {
                        logger.info(`    🔄 Renamed route: "${originalName}" → "${routeName}"`);
                    }
                    
                    // Remove "Yun" from "YunExpress"
                    routeName = routeName.replace(/YunExpress/gi, 'Express');
                    routeName = routeName.replace(/Yun Express/gi, 'Express');
                    // Remove "(General)" from the end
                    routeName = routeName.replace(/\s*\(General\)\s*$/gi, '');
                    
                    // Rename all EUB and ETK variants to "ePacket"
                    routeName = routeName.replace(/^EUB-HB$/gi, 'ePacket');
                    routeName = routeName.replace(/^EUB-HZ$/gi, 'ePacket');
                    routeName = routeName.replace(/^EUB$/gi, 'ePacket');
                    routeName = routeName.replace(/^EUB-/gi, 'ePacket');
                    routeName = routeName.replace(/^ETK-HB$/gi, 'ePacket');
                    routeName = routeName.replace(/^ETK$/gi, 'ePacket');
                    routeName = routeName.replace(/^ETK-/gi, 'ePacket');
                    
                    // Clean up service names - remove unwanted prefixes and suffixes
                    // Remove "HK" prefix (e.g., "HK DHL Preferential Line" → "DHL Preferential Line")
                    routeName = routeName.replace(/^HK\s+/gi, '');
                    // Remove "(HK)" anywhere in the name (e.g., "UPS(HK)-5000" → "UPS-5000")
                    routeName = routeName.replace(/\(HK\)/gi, '');
                    // Remove "Preferential Line" suffix (e.g., "DHL Preferential Line" → "DHL")
                    routeName = routeName.replace(/\s*Preferential\s+Line\s*$/gi, '');
                    // Remove "-5000", "-5500" etc. suffixes (e.g., "UPS-5000" → "UPS")
                    routeName = routeName.replace(/-\d+$/gi, '');
                    // Remove "Preferential" alone if it remains
                    routeName = routeName.replace(/\s*Preferential\s*$/gi, '');
                    // Remove "(General Cargo)", "(General)", "(Special Cargo)", etc. from anywhere
                    routeName = routeName.replace(/\s*\(General\s+Cargo\)\s*/gi, ' ');
                    routeName = routeName.replace(/\s*\(General\)\s*/gi, ' ');
                    routeName = routeName.replace(/\s*\(Special\s+Cargo\)\s*/gi, ' ');
                    routeName = routeName.replace(/\s*\(Special\)\s*/gi, ' ');
                    // Remove "UK Duty-Free" prefix (e.g., "UK Duty-Free Air Express" → "Air Express")
                    routeName = routeName.replace(/^UK\s+Duty-Free\s+/gi, '');
                    // Remove "US Duty-Free" prefix (e.g., "US Duty-Free Air Express" → "Air Express")
                    routeName = routeName.replace(/^US\s+Duty-Free\s+/gi, '');
                    // Remove "Duty-Free" prefix
                    routeName = routeName.replace(/^Duty-Free\s+/gi, '');
                    // Remove "Duty-Free" anywhere in the name (e.g., "US Duty-Free Air Express" → "US Air Express")
                    routeName = routeName.replace(/\s+Duty-Free\s+/gi, ' ');
                    // Remove "US Ocean Carriage" → "Ocean Shipping"
                    routeName = routeName.replace(/^US\s+Ocean\s+Carriage$/gi, 'Ocean Shipping');
                    routeName = routeName.replace(/^US\s+Ocean\s+Carriage\s+/gi, 'Ocean Shipping ');
                    // Remove "(Regular Ship)" suffix
                    routeName = routeName.replace(/\s*\(Regular\s+Ship\)\s*$/gi, '');
                    // Remove "Regular Ship" suffix
                    routeName = routeName.replace(/\s+Regular\s+Ship\s*$/gi, '');
                    // Fix redundant "Express" (e.g., "Express Fast Express Line" → "Express Fast Line")
                    routeName = routeName.replace(/Express\s+Fast\s+Express/gi, 'Express Fast');
                    routeName = routeName.replace(/Express\s+Express/gi, 'Express');
                    // Clean up extra spaces
                    routeName = routeName.replace(/\s+/g, ' ').trim();
                    // CRITICAL: Make service_code UNIQUE - Shopify deduplicates by service_code!
                    // Use route index + price + days to ensure uniqueness
                    // Clean the base code: remove special chars, limit length, ensure it's valid XML
                    let baseCode = route.channelCode || route.channel_code;
                    if (!baseCode) {
                        baseCode = routeName.toUpperCase()
                            .replace(/[^A-Z0-9_]/g, '_')  // Replace special chars with underscore
                            .replace(/_+/g, '_')          // Collapse multiple underscores
                            .replace(/^_|_$/g, '')        // Remove leading/trailing underscores
                            .substring(0, 30);            // Limit length
                    }
                    // Create unique code: base + route index + price hash
                    const routeIndex = allAvailableRoutes.length;
                    const priceHash = Math.round(routePriceFinal * 100).toString().substring(0, 6);
                    const serviceCode = `${baseCode}_${routeIndex}_${priceHash}`.substring(0, 50); // Limit total length
                    
                    allAvailableRoutes.push({
                        service_name: routeName,
                        service_code: serviceCode,
                        priceFinal: routePriceFinal, // Price in CNY (RMB)
                        currency: 'CNY', // Always use CNY - Shopify will convert to checkout currency
                        minDays: minDays,
                        maxDays: maxDays,
                        route: route // Keep original route for reference
                    });
                    logger.info(`    ✓ Added route: ${routeName} (${serviceCode}) - ${routePriceFinal.toFixed(2)} CNY - ${minDays}-${maxDays} days`);
                }

        } catch (error) {
            logger.error(`Error calculating shipping for combined cart:`, error);
            return res.status(200).json({ rates: [] });
        }

        // Don't group - return ALL routes as separate options
        // Filter out dominated options (slower AND more expensive than another option)
        logger.info(`  📊 DEBUG: allAvailableRoutes.length = ${allAvailableRoutes.length}`);
        logger.info(`  📊 DEBUG: First few routes: ${JSON.stringify(allAvailableRoutes.slice(0, 3).map(r => ({ name: r.service_name, price: r.priceFinal, days: r.maxDays })), null, 2)}`);
        
        // FILTERING RULE 1: Hide "dominated" options
        // Hide option A if option B is BOTH faster (lower maxDays) AND cheaper
        // NOTE: We do NOT hide slow options just because they're slow - cheapest option should always be available
        // EXCEPTION: Always keep UPS, DHL, and FedEx even if dominated (customers expect premium carriers)
        const filteredRoutes = [];
        const premiumCarriers = ['UPS', 'DHL', 'FEDEX'];
        
        for (let i = 0; i < allAvailableRoutes.length; i++) {
            const routeA = allAvailableRoutes[i];
            
            // Check if this is a premium carrier that should always be shown
            const routeAUpper = routeA.service_name.toUpperCase();
            const isPremiumCarrier = premiumCarriers.some(carrier => routeAUpper.includes(carrier));
            
            // Skip domination check for premium carriers - always include them
            if (isPremiumCarrier) {
                filteredRoutes.push(routeA);
                logger.info(`    ✓ Kept premium carrier (always show): ${routeA.service_name}`);
                continue;
            }
            
            let isDominated = false;
            
            // Check if routeA is dominated by any other route
            for (let j = 0; j < allAvailableRoutes.length; j++) {
                if (i === j) continue; // Don't compare with itself
                
                const routeB = allAvailableRoutes[j];
                
                // RouteA is dominated if routeB is both faster (lower maxDays) AND cheaper
                if (routeB.maxDays < routeA.maxDays && routeB.priceFinal < routeA.priceFinal) {
                    isDominated = true;
                    logger.info(`    ⏭️ Skipped route (dominated): ${routeA.service_name} - ${routeA.maxDays} days, $${routeA.priceFinal.toFixed(2)} (${routeB.service_name} is faster AND cheaper)`);
                    break;
                }
            }
            
            if (!isDominated) {
                filteredRoutes.push(routeA);
            }
        }
        
        // Deduplicate by PRICE: if multiple options have the same price, keep only the fastest one
        // Round prices to nearest 50p (£0.50) for GBP, or nearest cent for other currencies
        // This prevents showing multiple options that round to the same displayed price
        const priceMap = new Map(); // rounded price -> fastest route at that price
        for (const route of filteredRoutes) {
            // Check if this is a premium carrier
            const routeUpper = route.service_name.toUpperCase();
            const isPremiumCarrier = premiumCarriers.some(carrier => routeUpper.includes(carrier));
            
            // Round to nearest 50p for GBP (to avoid showing £10.00 and £10.00 when they're actually different)
            // For other currencies, round to nearest cent
            let roundedPrice;
            if (checkoutCurrency === 'GBP') {
                // Round to nearest £0.50 (50p) for GBP
                roundedPrice = Math.round(route.priceFinal * 2) / 2;
            } else if (checkoutCurrency === 'USD') {
                // Round to nearest $0.50 for USD to deduplicate similar prices
                roundedPrice = Math.round(route.priceFinal * 2) / 2;
            } else {
                // Round to nearest cent (2 decimal places) for other currencies
                roundedPrice = Math.round(route.priceFinal * 100) / 100;
            }
            const existing = priceMap.get(roundedPrice);
            
            if (!existing) {
                // First route at this price point
                priceMap.set(roundedPrice, route);
            } else {
                // Check if existing is a premium carrier
                const existingUpper = existing.service_name.toUpperCase();
                const existingIsPremium = premiumCarriers.some(carrier => existingUpper.includes(carrier));
                
                // If either route is a premium carrier, keep both (add this one with a slightly different key)
                if (isPremiumCarrier || existingIsPremium) {
                    // Keep both premium carriers - add this one with a slightly different price key
                    priceMap.set(roundedPrice + 0.0001, route);
                    logger.info(`    ✓ Kept premium carrier (same price): ${route.service_name} - ${route.priceFinal.toFixed(2)} CNY`);
                } else {
                    // Neither is premium - compare delivery times - keep the faster one
                    // Use maxDays as the comparison (lower is better)
                    if (route.maxDays < existing.maxDays) {
                        // This route is faster, replace it
                        priceMap.set(roundedPrice, route);
                        logger.info(`    🔄 Replaced route at ${checkoutCurrency} ${roundedPrice.toFixed(2)}: ${existing.service_name} (${existing.maxDays} days) → ${route.service_name} (${route.maxDays} days) - faster delivery`);
                    } else if (route.maxDays === existing.maxDays) {
                        // Same max delivery time - compare minDays (lower is better)
                        if (route.minDays < existing.minDays) {
                            priceMap.set(roundedPrice, route);
                            logger.info(`    🔄 Replaced route at ${checkoutCurrency} ${roundedPrice.toFixed(2)}: ${existing.service_name} (${existing.minDays}-${existing.maxDays} days) → ${route.service_name} (${route.minDays}-${route.maxDays} days) - faster minimum delivery`);
                        } else if (route.minDays === existing.minDays) {
                            // Same delivery time range - prefer the one with tighter range (more reliable)
                            const existingRange = existing.maxDays - existing.minDays;
                            const routeRange = route.maxDays - route.minDays;
                            if (routeRange < existingRange) {
                                priceMap.set(roundedPrice, route);
                                logger.info(`    🔄 Replaced route at ${checkoutCurrency} ${roundedPrice.toFixed(2)}: ${existing.service_name} (${existing.minDays}-${existing.maxDays} days) → ${route.service_name} (${route.minDays}-${route.maxDays} days) - tighter delivery window`);
                            }
                            // Otherwise keep existing (first one found or already better)
                        }
                        // If existing has faster minDays, keep it (do nothing)
                    }
                    // If existing is faster, keep it (do nothing)
                }
            }
        }
        
        // Convert price map to array
        const priceDeduplicatedRoutes = Array.from(priceMap.values());
        logger.info(`  🔄 Deduplicated by price: ${filteredRoutes.length} routes → ${priceDeduplicatedRoutes.length} routes (kept fastest option per price point)`);
        
        // FILTERING RULE 3: Deduplicate by delivery time - if same or very similar delivery time, keep only cheapest
        // This handles cases where prices differ but delivery times are identical or very close
        // Shopify may display overlapping ranges as the same (e.g., "9-14 days"), so we deduplicate similar ranges
        // EXCEPTION: Always keep UPS, DHL, and FedEx even if similar delivery time to cheaper routes
        const timeDeduplicatedRoutes = [];
        
        for (const route of priceDeduplicatedRoutes) {
            // Check if this is a premium carrier
            const routeUpper = route.service_name.toUpperCase();
            const isPremiumCarrier = premiumCarriers.some(carrier => routeUpper.includes(carrier));
            
            let isDuplicate = false;
            
            // Check if this route has a similar delivery time range to an existing route
            for (let i = 0; i < timeDeduplicatedRoutes.length; i++) {
                const existingRoute = timeDeduplicatedRoutes[i];
                
                // Check if existing is a premium carrier
                const existingUpper = existingRoute.service_name.toUpperCase();
                const existingIsPremium = premiumCarriers.some(carrier => existingUpper.includes(carrier));
                
                // If maxDays are the same or very close (within 2 days), and minDays are close (within 3 days)
                // Consider them similar enough to deduplicate
                const maxDaysDiff = Math.abs(route.maxDays - existingRoute.maxDays);
                const minDaysDiff = Math.abs(route.minDays - existingRoute.minDays);
                
                // If ranges are very similar (within 2 days for max, 3 days for min), deduplicate
                if (maxDaysDiff <= 2 && minDaysDiff <= 3) {
                    // If either route is a premium carrier, keep both
                    if (isPremiumCarrier || existingIsPremium) {
                        // Don't deduplicate - keep both premium carriers
                        logger.info(`    ✓ Kept premium carrier (similar delivery time): ${route.service_name} (${route.minDays}-${route.maxDays} days, ${route.priceFinal.toFixed(2)} CNY)`);
                        break; // Exit loop, will add route below
                    }
                    
                    // Neither is premium - keep the cheaper one
                    if (route.priceFinal < existingRoute.priceFinal) {
                        // Replace existing with this cheaper route
                        timeDeduplicatedRoutes[i] = route;
                        logger.info(`    🔄 Deduplicated by similar delivery time: ${existingRoute.service_name} (${existingRoute.minDays}-${existingRoute.maxDays} days, ${existingRoute.priceFinal.toFixed(2)} CNY) → ${route.service_name} (${route.minDays}-${route.maxDays} days, ${route.priceFinal.toFixed(2)} CNY) - cheaper`);
                    } else {
                        logger.info(`    ⏭️ Skipped route (similar delivery time but more expensive): ${route.service_name} (${route.minDays}-${route.maxDays} days, ${route.priceFinal.toFixed(2)} CNY) vs ${existingRoute.service_name} (${existingRoute.minDays}-${existingRoute.maxDays} days, ${existingRoute.priceFinal.toFixed(2)} CNY)`);
                    }
                    isDuplicate = true;
                    break;
                }
            }
            
            if (!isDuplicate) {
                timeDeduplicatedRoutes.push(route);
                logger.info(`    ✓ Added to time-deduplicated routes: ${route.service_name} (${route.minDays}-${route.maxDays} days, ${route.priceFinal.toFixed(2)} CNY)`);
            }
        }
        
        logger.info(`  🔄 Deduplicated by delivery time: ${priceDeduplicatedRoutes.length} routes → ${timeDeduplicatedRoutes.length} routes (kept cheapest option per similar delivery time)`);
        
        // FILTERING RULE 4: If two options are within 10% price difference, keep only the faster one
        // This reduces clutter while keeping meaningful price differences
        // EXCEPTION: Always keep UPS, DHL, and FedEx even if within 10% price of faster routes
        const priceProximityFilteredRoutes = [];
        for (const route of timeDeduplicatedRoutes) {
            // Check if this is a premium carrier
            const routeUpper = route.service_name.toUpperCase();
            const isPremiumCarrier = premiumCarriers.some(carrier => routeUpper.includes(carrier));
            
            let shouldKeep = true;
            
            // Check if this route should be filtered out by comparing with existing routes
            for (const existingRoute of priceProximityFilteredRoutes) {
                // Check if existing is a premium carrier
                const existingUpper = existingRoute.service_name.toUpperCase();
                const existingIsPremium = premiumCarriers.some(carrier => existingUpper.includes(carrier));
                
                // If either is a premium carrier, skip the proximity filter (keep both)
                if (isPremiumCarrier || existingIsPremium) {
                    continue; // Skip this comparison, keep both routes
                }
                
                const priceDiff = Math.abs(route.priceFinal - existingRoute.priceFinal);
                const minPrice = Math.min(route.priceFinal, existingRoute.priceFinal);
                const priceDiffPercent = minPrice > 0 ? (priceDiff / minPrice) * 100 : 0;
                
                // If prices are within 10% of each other
                if (priceDiffPercent <= 10) {
                    // Keep the faster one (lower maxDays)
                    if (route.maxDays < existingRoute.maxDays) {
                        // This route is faster - replace the slower one
                        const index = priceProximityFilteredRoutes.indexOf(existingRoute);
                        priceProximityFilteredRoutes[index] = route;
                        logger.info(`    🔄 Price proximity filter: ${existingRoute.service_name} (${existingRoute.maxDays} days, ${existingRoute.priceFinal.toFixed(2)} CNY) → ${route.service_name} (${route.maxDays} days, ${route.priceFinal.toFixed(2)} CNY) - faster (${priceDiffPercent.toFixed(1)}% price difference)`);
                    } else {
                        // Existing route is faster - skip this one
                        logger.info(`    ⏭️ Skipped route (within 10% price but slower): ${route.service_name} (${route.maxDays} days, ${route.priceFinal.toFixed(2)} CNY) vs ${existingRoute.service_name} (${existingRoute.maxDays} days, ${existingRoute.priceFinal.toFixed(2)} CNY) - ${priceDiffPercent.toFixed(1)}% price difference`);
                    }
                    shouldKeep = false;
                    break;
                }
            }
            
            if (shouldKeep) {
                priceProximityFilteredRoutes.push(route);
            }
        }
        
        logger.info(`  🔄 Price proximity filter (10%): ${timeDeduplicatedRoutes.length} routes → ${priceProximityFilteredRoutes.length} routes (kept faster option when prices within 10%)`);
        
        // FILTERING RULE 5: Deduplicate by carrier - but ALWAYS show all DHL, UPS, and FedEx options
        // Only deduplicate Aramex and EMS (keep cheapest per carrier)
        // NOTE: ePacket options are NOT deduplicated - show multiple if they offer different value (faster vs cheaper)
        const carrierMap = new Map(); // carrier name -> cheapest route (only for Aramex/EMS)
        const alwaysShowCarriers = ['UPS', 'DHL', 'FEDEX']; // Always show all options for these carriers
        const deduplicatedRoutes = [];
        
        for (const route of priceProximityFilteredRoutes) {
            // Extract carrier name from service name (e.g., "UPS(HK)-5000" -> "UPS", "HK DHL Preferential Line" -> "DHL")
            let carrierName = '';
            const serviceNameUpper = route.service_name.toUpperCase();
            
            // Extract carrier name from service name
            if (serviceNameUpper.includes('UPS')) {
                carrierName = 'UPS';
            } else if (serviceNameUpper.includes('DHL')) {
                carrierName = 'DHL';
            } else if (serviceNameUpper.includes('FEDEX')) {
                carrierName = 'FEDEX';
            } else if (serviceNameUpper.includes('ARAMEX')) {
                carrierName = 'ARAMEX';
            } else if (serviceNameUpper.includes('EMS')) {
                carrierName = 'EMS';
            }
            
            // Always show DHL, UPS, and FedEx - don't deduplicate
            if (alwaysShowCarriers.includes(carrierName)) {
                deduplicatedRoutes.push(route);
            }
            // Deduplicate Aramex and EMS (keep cheapest per carrier)
            else if (carrierName === 'ARAMEX' || carrierName === 'EMS') {
                const existing = carrierMap.get(carrierName);
                if (!existing || route.priceFinal < existing.priceFinal) {
                    carrierMap.set(carrierName, route);
                }
            }
            // No carrier match (including ePacket), keep the route as-is
            else {
                deduplicatedRoutes.push(route);
            }
        }
        
        // Add deduplicated Aramex and EMS routes
        for (const route of carrierMap.values()) {
            deduplicatedRoutes.push(route);
        }
        
        logger.info(`  🔄 Carrier deduplication: ${priceProximityFilteredRoutes.length} routes → ${deduplicatedRoutes.length} routes (always show DHL/UPS/FedEx, deduplicate Aramex/EMS)`);
        
        // Final deduplication: Shopify deduplicates by service_name, so we need to ensure unique service_names
        // For DHL/UPS/FedEx, keep only the cheapest option per carrier name
        // Sort by price first (cheapest first) so we keep the cheapest duplicate
        const sortedForDedup = [...deduplicatedRoutes].sort((a, b) => {
            if (a.priceFinal !== b.priceFinal) {
                return a.priceFinal - b.priceFinal;
            }
            return a.maxDays - b.maxDays;
        });
        
        const finalDeduplicatedRoutes = [];
        const seenServiceNames = new Set();
        
        for (const route of sortedForDedup) {
            const serviceNameUpper = route.service_name.toUpperCase();
            const isPremiumCarrier = premiumCarriers.some(carrier => serviceNameUpper.includes(carrier));
            
            // For premium carriers, if we've already seen this exact service_name, skip duplicates
            // Keep the first one (cheapest due to sorting above)
            if (isPremiumCarrier && seenServiceNames.has(route.service_name)) {
                logger.info(`    ⏭️ Skipped duplicate premium carrier: ${route.service_name} (already included - keeping cheaper one)`);
                continue;
            }
            
            seenServiceNames.add(route.service_name);
            finalDeduplicatedRoutes.push(route);
        }
        
        const uniqueRoutes = finalDeduplicatedRoutes; // Return deduplicated routes
        logger.info(`  ✓ Found ${allAvailableRoutes.length} total routes, ${filteredRoutes.length} non-dominated routes, ${priceDeduplicatedRoutes.length} after price deduplication, ${timeDeduplicatedRoutes.length} after time deduplication, ${priceProximityFilteredRoutes.length} after price proximity filter, ${deduplicatedRoutes.length} after carrier deduplication, returning all ${uniqueRoutes.length} options`);
        logger.info(`  📊 DEBUG: Routes being returned: ${JSON.stringify(uniqueRoutes.map(r => ({ name: r.service_name, price: r.priceFinal, code: r.service_code })), null, 2)}`);

        // Build JSON response directly (Shopify expects JSON format)
        const responseJson = {
            rates: []
        };

        // Add all unique routes as shipping options (CONSOLIDATED - all items together)
        logger.info(`  💰 Converting prices to cents for JSON response:`);
        for (const route of uniqueRoutes) {
            // Round UP to nearest cent (Math.ceil) to avoid underestimating costs
            const priceCents = Math.ceil(route.priceFinal * 100);
            logger.info(`    Route: ${route.service_name} | Price: ${route.priceFinal.toFixed(2)} ${route.currency} = ${priceCents} cents`);
            
            // Calculate delivery dates from transit days
            const minDate = new Date();
            minDate.setDate(minDate.getDate() + route.minDays);
            const maxDate = new Date();
            maxDate.setDate(maxDate.getDate() + route.maxDays);
            
            responseJson.rates.push({
                service_name: `${route.service_name} (Consolidated)`, // Mark as consolidated
                service_code: route.service_code + '_CONSOLIDATED',
                total_price: priceCents.toString(), // Ensure total_price is a string in cents
                currency: route.currency,
                min_delivery_date: minDate.toISOString().split('T')[0],
                max_delivery_date: maxDate.toISOString().split('T')[0],
            });
            logger.info(`  ✓ Added consolidated rate: ${route.service_name} - ${route.currency} ${route.priceFinal.toFixed(2)} (${priceCents} cents) - ${route.minDays}-${route.maxDays} days`);
        }
        
        // Add INDIVIDUAL shipping option (each product shipped separately)
        if (validIndividual.length > 0 && totalIndividualPrice > 0) {
            // Find average delivery time from individual routes
            let avgMinDays = 0;
            let avgMaxDays = 0;
            let individualRouteCount = 0;
            
            for (const calc of validIndividual) {
                if (calc.result && calc.result.allRoutes && calc.result.allRoutes.length > 0) {
                    const cheapestRoute = calc.result.allRoutes
                        .filter(r => r.available !== false && r.totalPrice)
                        .sort((a, b) => (a.totalPrice || 999999) - (b.totalPrice || 999999))[0];
                    
                    if (cheapestRoute) {
                        avgMinDays += cheapestRoute.minTimeInTransit || cheapestRoute.min_time_in_transit || 5;
                        avgMaxDays += cheapestRoute.maxTimeInTransit || cheapestRoute.max_time_in_transit || 15;
                        individualRouteCount++;
                    }
                }
            }
            
            if (individualRouteCount > 0) {
                avgMinDays = Math.ceil(avgMinDays / individualRouteCount);
                avgMaxDays = Math.ceil(avgMaxDays / individualRouteCount);
                
                const individualPriceCents = Math.ceil(totalIndividualPrice * 100);
                const minDate = new Date();
                minDate.setDate(minDate.getDate() + avgMinDays);
                const maxDate = new Date();
                maxDate.setDate(maxDate.getDate() + avgMaxDays);
                
                responseJson.rates.push({
                    service_name: `Ship Separately (${processedItems.length} packages)`,
                    service_code: 'INDIVIDUAL_SHIPPING',
                    total_price: individualPriceCents.toString(),
                    currency: 'CNY',
                    min_delivery_date: minDate.toISOString().split('T')[0],
                    max_delivery_date: maxDate.toISOString().split('T')[0],
                });
                
                logger.info(`  ✓ Added individual shipping option: ${totalIndividualPrice.toFixed(2)} CNY (${individualPriceCents} cents) - ${avgMinDays}-${avgMaxDays} days`);
                logger.info(`  💰 Comparison: Consolidated=${consolidatedCheapestPrice.toFixed(2)} CNY vs Individual=${totalIndividualPrice.toFixed(2)} CNY`);
            }
        }

        // If no rates found, return empty JSON response
        if (responseJson.rates.length === 0) {
            logger.warn(`No shipping rates found for ${shopDomain} - returning empty rates array`);
            logger.warn(`  Reason: processedItems=${processedItems.length}, allAvailableRoutes=${allAvailableRoutes.length}, uniqueRoutes=${uniqueRoutes.length}`);
            res.set('Content-Type', 'application/json; charset=utf-8');
            return res.status(200).json({ rates: [] });
        }

        const responseTime = Date.now() - startTime;
        
        // CRITICAL: Build JSON response (Shopify prefers JSON over XML)
        const jsonResponse = responseJson;
        
        // Cache the results for future requests (before sending response)
        // Reuse cacheKey from earlier (already calculated at line 1068)
        setCachedRates(cacheKey, jsonResponse.rates);
        
        // CRITICAL: Check if response was already sent
        if (res.headersSent) {
            logger.error('❌ Response already sent! Cannot send again.');
            return;
        }
        
        // CRITICAL: Set status code and ALL headers BEFORE sending
        res.status(200);
        const compactJson = JSON.stringify(jsonResponse);
        res.set({
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': Buffer.byteLength(compactJson, 'utf8').toString(),
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        
        // CRITICAL: Send JSON response IMMEDIATELY
        res.send(compactJson);
        
        // Log AFTER sending (async, won't delay response)
        setImmediate(() => {
            const totalTime = Date.now() - startTime;
            // Only calculate processing time if variables are defined (not cached response)
            if (typeof shopifyApiTime !== 'undefined' && typeof buckyDropTime !== 'undefined') {
                const processingTime = totalTime - shopifyApiTime - buckyDropTime;
                logger.info(`✅ Response sent: ${jsonResponse.rates.length} rates in ${totalTime}ms`);
                logger.info(`⏱️ Full timing: Shopify=${shopifyApiTime}ms, BuckyDrop=${buckyDropTime}ms, Processing=${processingTime}ms, Total=${totalTime}ms`);
            } else {
                logger.info(`✅ Response sent: ${jsonResponse.rates.length} rates in ${totalTime}ms`);
            }
        });
        
        return;

    } catch (error) {
        logger.error('❌❌❌ Carrier service error:', error);
        logger.error('❌❌❌ Error message:', error.message);
        logger.error('❌❌❌ Error stack:', error.stack);
        
        // Return proper error JSON format for Shopify
        const errorResponse = {
            rates: [] // Return empty rates array on error
        };
        
        if (!res.headersSent) {
            res.status(200).json(errorResponse); // Shopify expects 200 even on errors
        } else {
            logger.error('❌ Cannot send error response - headers already sent');
        }
    }
});

/**
 * POST /api/shipping/register-carrier-service
 * Register the carrier service with Shopify
 */
router.post('/register-carrier-service', async (req, res) => {
    try {
        const { shop } = req.body;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop domain required' });
        }

        // Get shop access token - check environment variable first (simple approach), then Shop model (OAuth)
        let accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
        let shopData = null;
        
        if (!accessToken) {
            shopData = await Shop.findOne({ domain: shop });
            if (!shopData || !shopData.accessToken) {
                return res.status(401).json({ 
                    error: 'Shop not authenticated. Either set SHOPIFY_ACCESS_TOKEN in .env or complete OAuth.' 
                });
            }
            accessToken = shopData.accessToken;
        } else {
            // Still try to get shop data for saving carrierServiceId
            shopData = await Shop.findOne({ domain: shop });
        }

        // Initialize Shopify API client
        const shopify = shopifyApi({
            apiKey: process.env.SHOPIFY_API_KEY,
            apiSecretKey: process.env.SHOPIFY_API_SECRET,
            scopes: process.env.SHOPIFY_SCOPES?.split(',') || [],
            hostName: process.env.SHOPIFY_APP_URL || 'http://localhost:3001',
            apiVersion: ApiVersion.April23,
        });

        const session = {
            shop: shop,
            accessToken: accessToken,
        };

        const client = new shopify.clients.Rest({ session });

        // Carrier service callback URL (must be publicly accessible)
        // CRITICAL: Shopify sends shop domain in X-Shopify-Shop-Domain header, NOT query param
        // Query params in callback_url can cause Shopify to reject responses
        const appUrl = process.env.SHOPIFY_APP_URL || 'http://localhost:3001';
        const callbackUrl = `${appUrl}/api/shipping/carrier-service`;

        logger.info(`Registering carrier service with callback URL: ${callbackUrl}`);

        // Check if carrier service already exists
        try {
            const existingResponse = await client.get({ path: 'carrier_services' });
            const existingServices = existingResponse.body.carrier_services || [];
            const existingBuckyDrop = existingServices.find(cs => 
                cs.name === 'BuckyDrop Shipping' || 
                cs.callback_url?.includes('buckydrop')
            );
            
            if (existingBuckyDrop) {
                // Check if callback URL needs updating
                const needsUpdate = existingBuckyDrop.callback_url !== callbackUrl;
                
                if (needsUpdate) {
                    logger.info(`Carrier service exists but callback URL is outdated. Updating...`);
                    logger.info(`  Old URL: ${existingBuckyDrop.callback_url}`);
                    logger.info(`  New URL: ${callbackUrl}`);
                    
                    // Update existing carrier service
                    try {
                        const updateResponse = await client.put({
                            path: `carrier_services/${existingBuckyDrop.id}`,
                            data: {
                                carrier_service: {
                                    callback_url: callbackUrl,
                                    format: 'json'
                                }
                            }
                        });
                        
                        logger.info(`✅ Carrier service updated successfully`);
                        shopData.carrierServiceId = existingBuckyDrop.id.toString();
                        await shopData.save();
                        
                        return res.json({
                            success: true,
                            carrierService: updateResponse.body.carrier_service,
                            message: 'Carrier service updated with new callback URL',
                            updated: true
                        });
                    } catch (updateError) {
                        logger.error('Failed to update carrier service:', updateError);
                        // Fall through to delete and recreate
                        logger.info('Will delete and recreate carrier service...');
                        
                        // Delete old service
                        try {
                            await client.delete({ path: `carrier_services/${existingBuckyDrop.id}` });
                            logger.info(`Deleted old carrier service: ${existingBuckyDrop.id}`);
                        } catch (deleteError) {
                            logger.warn('Could not delete old carrier service:', deleteError.message);
                        }
                    }
                } else {
                    // URL is correct, just return existing
                    logger.info(`Carrier service already registered with correct URL: ${existingBuckyDrop.id}`);
                    shopData.carrierServiceId = existingBuckyDrop.id.toString();
                    await shopData.save();
                    
                    return res.json({
                        success: true,
                        carrierService: existingBuckyDrop,
                        message: 'Carrier service already registered',
                        alreadyExists: true
                    });
                }
            }
        } catch (checkError) {
            logger.warn('Could not check for existing carrier services:', checkError.message);
        }

        // Create carrier service
        const carrierServiceData = {
            carrier_service: {
                name: 'BuckyDrop Shipping',
                callback_url: callbackUrl,
                service_discovery: false,
                format: 'json', // Use JSON instead of XML - Shopify's modern standard
            }
        };

        logger.info(`Creating carrier service with data: ${JSON.stringify(carrierServiceData, null, 2)}`);

        let response;
        try {
            response = await client.post({
                path: 'carrier_services',
                data: carrierServiceData,
            });
        } catch (apiError) {
            logger.error('Shopify API error creating carrier service:', {
                status: apiError.response?.status,
                statusText: apiError.response?.statusText,
                body: apiError.response?.body,
                message: apiError.message
            });
            throw new Error(`Shopify API error: ${apiError.response?.body?.errors?.[0]?.message || apiError.message}`);
        }

        logger.info(`✅ Carrier service registered for ${shop}: ${response.body.carrier_service.id}`);
        logger.info(`Full response: ${JSON.stringify(response.body, null, 2)}`);

        const carrierService = response.body.carrier_service;
        
        // Verify the service was created correctly
        if (!carrierService.id) {
            throw new Error('Carrier service created but no ID returned');
        }

        // Save carrier service ID to shop
        shopData.carrierServiceId = carrierService.id.toString();
        await shopData.save();

        // Verify it was saved
        logger.info(`Saved carrier service ID ${shopData.carrierServiceId} to database`);

        res.json({
            success: true,
            carrierService: carrierService,
            message: 'Carrier service registered successfully',
            instructions: 'Go to Settings > Shipping & delivery > Manage rates for your shipping zone > Add rate > Use carrier or app to calculate rates > Select "BuckyDrop Shipping"'
        });

        } catch (error) {
            logger.error('Register carrier service error:', error);
            logger.error('Error details:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                body: error.response?.body,
                stack: error.stack
            });
            
            let errorMessage = error.message;
            let errorDetails = error.response?.body || null;
            let needsReauth = false;
            
            // Check if it's a scope approval issue
            if (error.message && error.message.includes('merchant approval')) {
                errorMessage = 'Shipping scopes need merchant approval. Please re-authenticate to approve shipping permissions.';
                needsReauth = true;
            } else if (error.response?.status === 401 || error.response?.status === 403) {
                errorMessage = 'Authentication failed. Please re-authenticate your app.';
                needsReauth = true;
            } else if (error.response?.status === 422) {
                errorMessage = `Validation error: ${error.response?.body?.errors?.[0]?.message || error.message}`;
            } else if (error.message.includes('callback_url')) {
                errorMessage = 'Callback URL must be publicly accessible (HTTPS). Check SHOPIFY_APP_URL in your .env file.';
            }
            
            res.status(500).json({ 
                error: 'Failed to register carrier service', 
                details: errorMessage,
                needsReauth: needsReauth,
                reauthUrl: needsReauth ? `/api/auth/shopify?shop=${shop}` : null,
                response: errorDetails
            });
        }
});

/**
 * POST /api/shipping/test-carrier-service
 * Test endpoint to simulate Shopify carrier service request
 */
router.post('/test-carrier-service', express.json(), async (req, res) => {
    try {
        const { shop, destination, items } = req.body;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop domain required' });
        }

        // Create a mock XML request
        const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<rate_request>
    <destination>
        <country>${destination?.country || 'AU'}</country>
        <postal_code>${destination?.postal_code || '2600'}</postal_code>
        <province>${destination?.province || 'ACT'}</province>
        <address1>${destination?.address1 || 'Test Address'}</address1>
    </destination>
    <items>
        ${(items || []).map(item => `
        <item>
            <product_id>${item.product_id || item.variant_id}</product_id>
            <quantity>${item.quantity || 1}</quantity>
        </item>`).join('')}
    </items>
</rate_request>`;

        // Make internal request to carrier service endpoint
        const testReq = {
            query: { shop },
            body: mockXml,
            headers: {}
        };

        logger.info('🧪 Testing carrier service with mock data');
        logger.info(`Mock XML: ${mockXml}`);

        res.json({
            success: true,
            message: 'Test request created. Check server logs for carrier service processing.',
            mockXml
        });

    } catch (error) {
        logger.error('Test carrier service error:', error);
        res.status(500).json({ 
            error: 'Failed to test carrier service', 
            details: error.message 
        });
    }
});

/**
 * GET /api/shipping/list-carrier-services
 * List all carrier services registered with Shopify (for debugging)
 */
router.get('/list-carrier-services', async (req, res) => {
    try {
        const { shop } = req.query;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop domain required' });
        }

        const shopData = await Shop.findOne({ domain: shop });
        if (!shopData || !shopData.accessToken) {
            return res.status(401).json({ error: 'Shop not authenticated' });
        }

        const shopify = shopifyApi({
            apiKey: process.env.SHOPIFY_API_KEY,
            apiSecretKey: process.env.SHOPIFY_API_SECRET,
            scopes: process.env.SHOPIFY_SCOPES?.split(',') || [],
            hostName: process.env.SHOPIFY_APP_URL || 'http://localhost:3001',
            apiVersion: ApiVersion.April23,
        });

        const session = {
            shop: shop,
            accessToken: shopData.accessToken,
        };

        const client = new shopify.clients.Rest({ session });
        
        const response = await client.get({ path: 'carrier_services' });
        const carrierServices = response.body.carrier_services || [];
        
        res.json({
            success: true,
            count: carrierServices.length,
            carrierServices: carrierServices,
            buckyDropFound: carrierServices.some(cs => 
                cs.name === 'BuckyDrop Shipping' || 
                cs.callback_url?.includes('buckydrop')
            )
        });

    } catch (error) {
        logger.error('List carrier services error:', error);
        res.status(500).json({ 
            error: 'Failed to list carrier services', 
            details: error.message 
        });
    }
});

/**
 * GET /api/shipping/last-request-details
 * Get details of the last carrier service request (for debugging)
 */
router.get('/last-request-details', async (req, res) => {
    res.json({
        success: true,
        lastRequest: lastRequestDetails || null,
        recentRequests: recentRequests.slice(-5), // Last 5 requests
        totalRequests: recentRequests.length,
        message: lastRequestDetails ? 'Last request details found' : 'No requests yet. Make a checkout request to see details here.'
    });
});

/**
 * GET /api/shipping/carrier-service-status
 * Check if carrier service is registered
 */
router.get('/carrier-service-status', async (req, res) => {
    try {
        const { shop } = req.query;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop domain required' });
        }

        // Get access token - check environment variable first, then Shop model
        let accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
        let shopData = await Shop.findOne({ domain: shop });
        
        if (!accessToken) {
            if (!shopData || !shopData.accessToken) {
                return res.json({ registered: false, error: 'Shop not authenticated' });
            }
            accessToken = shopData.accessToken;
        }

        // Try to verify with Shopify API
        try {
            const shopify = shopifyApi({
                apiKey: process.env.SHOPIFY_API_KEY,
                apiSecretKey: process.env.SHOPIFY_API_SECRET,
                scopes: process.env.SHOPIFY_SCOPES?.split(',') || [],
                hostName: process.env.SHOPIFY_APP_URL || 'http://localhost:3001',
                apiVersion: ApiVersion.April23,
            });

            const session = {
                shop: shop,
                accessToken: accessToken,
            };

            const client = new shopify.clients.Rest({ session });
            
            // List all carrier services
            const response = await client.get({ path: 'carrier_services' });
            const carrierServices = response.body.carrier_services || [];
            
            // Find BuckyDrop service
            const buckyDropService = carrierServices.find(cs => 
                cs.name === 'BuckyDrop Shipping' || 
                cs.callback_url?.includes('buckydrop') ||
                cs.id === shopData.carrierServiceId
            );

            if (buckyDropService) {
                // Update our database if ID changed
                if (shopData.carrierServiceId !== buckyDropService.id.toString()) {
                    shopData.carrierServiceId = buckyDropService.id.toString();
                    await shopData.save();
                }

                return res.json({
                    registered: true,
                    carrierServiceId: buckyDropService.id.toString(),
                    carrierService: buckyDropService,
                    format: buckyDropService.format || 'unknown', // Explicitly show format
                    allServices: carrierServices
                });
            } else {
                // Service not found in Shopify, clear our record
                if (shopData.carrierServiceId) {
                    shopData.carrierServiceId = null;
                    await shopData.save();
                }
                return res.json({
                    registered: false,
                    allServices: carrierServices,
                    message: 'BuckyDrop service not found in Shopify'
                });
            }
        } catch (apiError) {
            logger.error('Error checking carrier services with Shopify API:', apiError);
            
            // If we have a carrier service ID in database, assume it's registered
            // (User may have registered it manually in Shopify Admin)
            if (shopData.carrierServiceId) {
                logger.info(`Using carrier service ID from database: ${shopData.carrierServiceId}`);
                return res.json({
                    registered: true,
                    carrierServiceId: shopData.carrierServiceId,
                    message: 'Carrier service registered (using database ID)',
                    note: 'If this is incorrect, you may need to re-authenticate to approve shipping scopes'
                });
            }
            
            // Fall back to database check
            return res.json({
                registered: false,
                carrierServiceId: shopData.carrierServiceId || null,
                error: 'Could not verify with Shopify API',
                apiError: apiError.message,
                note: 'If carrier service is already registered, use: node set-carrier-id.js <id>'
            });
        }

    } catch (error) {
        logger.error('Check carrier service status error:', error);
        res.status(500).json({ 
            error: 'Failed to check carrier service status', 
            details: error.message 
        });
    }
});

/**
 * DELETE /api/shipping/unregister-carrier-service
 * Unregister the carrier service from Shopify
 */
router.delete('/unregister-carrier-service', async (req, res) => {
    try {
        const { shop } = req.query;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop domain required' });
        }

        // Get shop access token - check environment variable first, then Shop model
        let accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
        let shopData = await Shop.findOne({ domain: shop });
        
        if (!accessToken) {
            if (!shopData || !shopData.accessToken) {
                return res.status(401).json({ error: 'Shop not authenticated' });
            }
            accessToken = shopData.accessToken;
        }

        if (shopData && !shopData.carrierServiceId) {
            return res.status(404).json({ error: 'Carrier service not registered' });
        }

        // Initialize Shopify API client
        const shopify = shopifyApi({
            apiKey: process.env.SHOPIFY_API_KEY,
            apiSecretKey: process.env.SHOPIFY_API_SECRET,
            scopes: process.env.SHOPIFY_SCOPES?.split(',') || [],
            hostName: process.env.SHOPIFY_APP_URL || 'http://localhost:3001',
            apiVersion: ApiVersion.April23,
        });

        const session = {
            shop: shop,
            accessToken: accessToken,
        };

        const client = new shopify.clients.Rest({ session });

        // Delete carrier service
        await client.delete({
            path: `carrier_services/${shopData.carrierServiceId}`,
        });

        logger.info(`✅ Carrier service unregistered for ${shop}`);

        // Remove carrier service ID from shop
        shopData.carrierServiceId = null;
        await shopData.save();

        res.json({
            success: true,
            message: 'Carrier service unregistered successfully'
        });

    } catch (error) {
        logger.error('Unregister carrier service error:', error);
        res.status(500).json({ 
            error: 'Failed to unregister carrier service', 
            details: error.message 
        });
    }
});

/**
 * GET /api/shipping/debug-rates
 * Debug endpoint to show all rates we're collecting (for testing)
 */
router.get('/debug-rates', async (req, res) => {
    try {
        const { shop } = req.query;
        const shopDomain = shop || process.env.SHOP_DOMAIN || 'app-test-1111231295.myshopify.com';
        
        // Get shop access token
        let accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
        let shopData = await Shop.findOne({ domain: shopDomain });
        
        if (!accessToken && shopData && shopData.accessToken) {
            accessToken = shopData.accessToken;
        }
        
        if (!accessToken) {
            return res.status(401).json({ error: 'No access token found' });
        }
        
        // Get BuckyDrop config
        const buckyDropConfig = shopData?.buckyDropConfig || {
            apiKey: process.env.BUCKYDROP_API_KEY,
            apiSecret: process.env.BUCKYDROP_API_SECRET,
            warehouseId: process.env.BUCKYDROP_WAREHOUSE_ID
        };
        
        if (!buckyDropConfig.apiKey || !buckyDropConfig.apiSecret) {
            return res.status(400).json({ error: 'BuckyDrop config not found' });
        }
        
        // Test with a sample product (you can modify this)
        const testProductId = req.query.product_id || 'gid://shopify/Product/1234567890';
        const testCountry = req.query.country || 'AU';
        const testCurrency = req.query.currency || 'AUD';
        
        // Fetch product metafields
        const shopify = shopifyApi({
            apiKey: process.env.SHOPIFY_API_KEY,
            apiSecretKey: process.env.SHOPIFY_API_SECRET,
            scopes: process.env.SHOPIFY_SCOPES?.split(',') || [],
            hostName: process.env.SHOPIFY_APP_URL || 'http://localhost:3001',
            apiVersion: ApiVersion.January26,
        });
        
        const session = {
            shop: shopDomain,
            accessToken: accessToken,
        };
        
        const client = new shopify.clients.Rest({ session });
        
        // Get product metafields
        const productIdNum = testProductId.split('/').pop();
        const metafieldsResponse = await client.get({
            path: `products/${productIdNum}/metafields.json`,
        });
        
        const metafields = metafieldsResponse.body.metafields || [];
        
        // Create minimal product object
        const product = {
            title: `Test Product ${productIdNum}`,
            variants: [{
                weight: 0.5,
                weight_unit: 'kg'
            }]
        };
        
        // Calculate shipping - use same method as carrier-service endpoint
        const shippingService = new ShippingService(buckyDropConfig);
        const targetCountryObj = {
            name: testCountry === 'AU' ? 'Australia' : 'United States',
            code: testCountry,
            postcode: testCountry === 'AU' ? '3189' : '90210',
            province: testCountry === 'AU' ? 'Victoria' : 'California',
            provinceCode: testCountry === 'AU' ? 'VIC' : 'CA',
            address: 'Test Address'
        };
        
        const result = await shippingService.calculateProductShipping(
            product,
            metafields,
            targetCountryObj
        );
        
        // Format response
        const allRoutes = result.allRoutes || [];
        const formattedRates = allRoutes.map((route, index) => ({
            index: index + 1,
            service_name: route.serviceName || route.service_name || route.channelName || route.channel_name || 'Unknown',
            service_code: route.channelCode || route.channel_code || 'UNKNOWN',
            price_rmb: route.totalPrice || route.total_price || 0,
            price_usd: (parseFloat(route.totalPrice || route.total_price || 0) * (1 / 7.20)).toFixed(2),
            price_aud: (parseFloat(route.totalPrice || route.total_price || 0) * (1 / 7.20) * 1.5).toFixed(2),
            min_days: route.minTimeInTransit || route.min_time_in_transit || 'N/A',
            max_days: route.maxTimeInTransit || route.max_time_in_transit || 'N/A',
            available: route.available !== false,
            raw_route: route
        }));
        
        res.json({
            success: true,
            shop: shopDomain,
            test_product_id: testProductId,
            test_country: testCountry,
            test_currency: testCurrency,
            total_routes_found: allRoutes.length,
            routes: formattedRates,
            summary: {
                cheap_option: result.cheapOption ? {
                    name: result.cheapOption.serviceName || result.cheapOption.service_name,
                    price_rmb: result.cheapOption.totalPrice || result.cheapOption.total_price,
                } : null,
                express_option: result.expressOption ? {
                    name: result.expressOption.serviceName || result.expressOption.service_name,
                    price_rmb: result.expressOption.totalPrice || result.expressOption.total_price,
                } : null,
            }
        });
        
    } catch (error) {
        logger.error('Debug rates error:', error);
        res.status(500).json({ 
            error: 'Failed to get debug rates', 
            details: error.message,
            stack: error.stack
        });
    }
});

module.exports = router;
