const axios = require('axios');
const BuckyDropService = require('./BuckyDropService');
const logger = require('../utils/logger');

class ShippingService {
    constructor(buckyDropConfig) {
        this.buckyDropService = new BuckyDropService(buckyDropConfig);
        
        this.COUNTRIES = [
            { code: 'AU', name: 'Australia' },
            { code: 'NZ', name: 'New Zealand' },
            { code: 'US', name: 'United States' },
            { code: 'ID', name: 'Indonesia' },
            { code: 'IN', name: 'India' },
            { code: 'GB', name: 'United Kingdom' },
            { code: 'ZA', name: 'South Africa' },
            { code: 'JP', name: 'Japan' },
            { code: 'KR', name: 'South Korea' },
            { code: 'MY', name: 'Malaysia' },
            { code: 'TH', name: 'Thailand' },
            { code: 'PH', name: 'Philippines' },
            { code: 'SG', name: 'Singapore' },
            { code: 'TR', name: 'Turkey' },
            { code: 'IE', name: 'Ireland' },
            { code: 'MX', name: 'Mexico' }
        ];

        // Configuration from user script
        this.MAX_EXPRESS_DAYS = 10;  // Express must be 10 days or less (relaxed from 8 for better coverage)
        this.MAX_FAST_DAYS = 15;    // Fast must be 15 days or less
        this.EXCLUDE_KEYWORDS = [
            'battery', 'liquid', 'powder', 'knife', 'magnet', 'eub', 'clothing', 'fashion', 'slow', 'ocean',
            'batteries', 'heavy cargo', 'post', 'freight'
        ];
        this.PREMIUM_CARRIERS = ['dhl', 'fedex', 'ups', 'tnt', 'sf']; // Must be premium for Express
        
        // Unified Price Buckets
        this.PRICE_BUCKETS = [
            { label: '<$10.00', max_cost: 10.00, index: 0 }, 
            { label: '$10.01-$15.00', max_cost: 15.00, index: 1 },
            { label: '$15.01-$20.00', max_cost: 20.00, index: 2 },
            { label: '$20.01-$25.00', max_cost: 25.00, index: 3 },
            { label: '$25.01-$30.00', max_cost: 30.00, index: 4 },
            { label: '$30.01-$35.00', max_cost: 35.00, index: 5 },
            { label: '$35.01-$40.00', max_cost: 40.00, index: 6 },
            { label: '$40.01-$45.00', max_cost: 45.00, index: 7 },
            { label: '$45.01-$50.00', max_cost: 50.00, index: 8 },
            { label: '$50.01-$55.00', max_cost: 55.00, index: 9 },
            { label: '$55.01-$60.00', max_cost: 60.00, index: 10 },
            { label: '$60.01-$65.00', max_cost: 65.00, index: 11 },
            { label: '$65.01-$70.00', max_cost: 70.00, index: 12 },
            { label: '$70.01-$75.00', max_cost: 75.00, index: 13 },
            { label: '$75.01-$80.00', max_cost: 80.00, index: 14 },
            { label: '$80.01-$85.00', max_cost: 85.00, index: 15 },
            { label: '$85.01-$90.00', max_cost: 90.00, index: 16 },
            { label: '$90.01-$95.00', max_cost: 95.00, index: 17 },
            { label: '$95.01-$100.00', max_cost: 100.00, index: 18 },
            { label: '$100.01-$110.00', max_cost: 110.00, index: 19 },
            { label: '$110.01-$120.00', max_cost: 120.00, index: 20 },
            { label: '$120.01-$130.00', max_cost: 130.00, index: 21 },
            { label: '$130.01-$140.00', max_cost: 140.00, index: 22 },
            { label: '$140.01-$160.00', max_cost: 160.00, index: 23 },
            { label: '$160.01-$180.00', max_cost: 180.00, index: 24 },
            { label: '$180.01-$200.00', max_cost: 200.00, index: 25 },
            { label: '$200.01-$250.00', max_cost: 250.00, index: 26 },
            { label: '$250.01+', max_cost: Infinity, index: 27 }
        ];

        this.RMB_TO_USD = 1 / 7.20;
    }

    /**
     * Calculate adjusted dimensions and weight
     */
    calculateAdjustedMetrics(weight, height, length, width) {
        // Defaults if missing
        const rawW = Number(weight) || 0.1;
        const rawH = Number(height) || 10;
        const rawD = Number(length) || 10; // Assuming length/width are diameter or similar

        const weightAdd = Math.max(rawW * 0.15, 0.2);
        const adjW = Number((rawW + weightAdd).toFixed(3));
        const adjH = Number(((rawH / 10) + 2).toFixed(1)); // Convert mm to cm and add buffer? 
        // Note: Shopify dims are usually in cm or inches. Script assumed raw input needed /10 + 2.
        // I will assume Shopify stores in CM if configured so, or handle unit conversion.
        // For now, let's assume input is in grams/cm or similar. 
        // BuckyDrop usually expects cm and kg.
        
        // Script: adjH = (rawH / 10) + 2. if rawH is mm, this converts to cm + 2cm buffer.
        // I'll stick to script logic but verify units.
        
        const adjD = Number(((rawD / 10) + 2).toFixed(1));

        return { adjW, adjH, adjD };
    }

    /**
     * Filter routes based on keywords
     */
    filterRoutes(routes, adjW, countryCode = null, debugLogs = []) {
        const filtered = [];
        const excluded = [];
        
        routes.forEach(r => {
            const name = r.serviceName ? r.serviceName.toLowerCase() : '';
            let excludeReason = null;

            // Exclude prohibited keywords
            const matchedKeyword = this.EXCLUDE_KEYWORDS.find(keyword => name.includes(keyword));
            if (matchedKeyword) {
                excludeReason = `excluded keyword: "${matchedKeyword}"`;
            }

            // Country-specific exceptions (allow routes that would normally be excluded)
            // Must check BEFORE country-specific exclusions so we can override keyword exclusions
            if (countryCode === 'PH') {
                // For Philippines: Allow "Philippines Air Express (Batteries)" even though it contains "batteries"
                // It's cheaper and faster than alternatives like ETK-HB
                if (name.includes('philippines air express') && name.includes('batteries')) {
                    // Don't exclude this one - it's a good option for Philippines
                    // Override any exclusion reason that was set by keyword matching
                    excludeReason = null;
                }
            }

            // Country-specific exclusions
            if (!excludeReason && countryCode === 'NZ') {
                // For New Zealand: Exclude slow routes
                if (name.includes('etk-hb') || name.includes('ems preferential line-hz')) {
                    excludeReason = `excluded for NZ: too slow`;
                }
            }

            // Weight limits check
            if (!excludeReason && (adjW < r.weightLowLimit || adjW > r.weightHighLimit)) {
                excludeReason = `weight ${adjW}kg outside limits [${r.weightLowLimit}-${r.weightHighLimit}kg]`;
            }

            // Price check
            if (!excludeReason && r.totalPrice <= 0) {
                excludeReason = `invalid price: ${r.totalPrice}`;
            }

            if (excludeReason) {
                excluded.push({ service: r.serviceName, reason: excludeReason });
            } else {
                filtered.push(r);
            }
        });

        if (debugLogs) {
            debugLogs.push(`  📋 Filtering ${routes.length} routes (weight: ${adjW}kg):`);
            debugLogs.push(`    ✓ ${filtered.length} passed filters`);
            if (excluded.length > 0) {
                debugLogs.push(`    ✗ ${excluded.length} excluded:`);
                
                // Group exclusions by reason to show patterns
                const exclusionReasons = {};
                excluded.forEach(e => {
                    const reason = e.reason.split(':')[0]; // Get main reason category
                    if (!exclusionReasons[reason]) {
                        exclusionReasons[reason] = [];
                    }
                    exclusionReasons[reason].push(e.service);
                });
                
                Object.entries(exclusionReasons).forEach(([reason, services]) => {
                    debugLogs.push(`      - ${reason}: ${services.length} routes (${services.slice(0, 3).join(', ')}${services.length > 3 ? '...' : ''})`);
                });
                
                // Show detailed exclusions for first few
                excluded.slice(0, 5).forEach(e => {
                    debugLogs.push(`      - ${e.service}: ${e.reason}`);
                });
                if (excluded.length > 5) {
                    debugLogs.push(`      ... and ${excluded.length - 5} more`);
                }
            }
            
            // If all routes filtered out, provide diagnostic info
            if (filtered.length === 0 && routes.length > 0) {
                debugLogs.push(`  ⚠️ CRITICAL: All ${routes.length} routes were filtered out!`);
                debugLogs.push(`  📊 Product weight: ${adjW}kg`);
                
                // Show weight range of available routes
                const weightRanges = routes.map(r => `[${r.weightLowLimit}-${r.weightHighLimit}kg]`).filter((v, i, a) => a.indexOf(v) === i).slice(0, 5);
                if (weightRanges.length > 0) {
                    debugLogs.push(`  📊 Available weight ranges: ${weightRanges.join(', ')}`);
                }
            }
        }

        return filtered;
    }

    /**
     * Select Cheap/Economy and Express options
     * Cheap/Economy: Cheapest option (excluding premium carriers)
     * Express: Fastest premium carrier option, <= MAX_EXPRESS_DAYS
     * For USA and Australia: Prefer YunExpress services that balance price vs speed
     */
    selectBestRoutes(routes, countryCode = null, debugLogs = []) {
        if (!routes || routes.length === 0) {
            if (debugLogs) debugLogs.push(`  ⚠️ No routes available for selection`);
            return { cheap: null, express: null };
        }

        if (debugLogs) {
            debugLogs.push(`  🔍 Selecting best routes from ${routes.length} options:`);
        }

        const isUSA = countryCode === 'US';
        const isAUS = countryCode === 'AU';

        // Sort all routes by price
        const sortedByPrice = [...routes].sort((a, b) => a.totalPrice - b.totalPrice);

        // Find CHEAP/ECONOMY: Cheapest option, excluding premium carriers
        let cheapCandidates = sortedByPrice.filter(route => {
            const name = route.serviceName ? route.serviceName.toLowerCase() : '';
            // Exclude premium carriers
            if (this.PREMIUM_CARRIERS.some(carrier => name.includes(carrier))) {
                return false;
            }
            // For USA: Also exclude clothing routes and unavailable routes
            if (isUSA) {
                if (name.includes('clothing')) {
                    return false;
                }
                // Exclude unavailable routes (available === false)
                if (route.available === false) {
                    return false;
                }
            }
            return true;
        });

        let cheap = null;
        
        if (isAUS && cheapCandidates.length > 0) {
            // For Australia: Always prefer YunExpress Fast Express Line (General) if available
            // It's only slightly more expensive but much faster
            const fastExpressLine = cheapCandidates.find(route => {
                const name = route.serviceName ? route.serviceName.toLowerCase() : '';
                return name.includes('yunexpress') && name.includes('fast express line (general)');
            });

            if (fastExpressLine) {
                cheap = fastExpressLine;
                if (debugLogs) {
                    debugLogs.push(`    💰 Cheap (YunExpress Fast Express Line preferred for AU): ${cheap.serviceName} - ¥${cheap.totalPrice.toFixed(2)} (${cheap.minTimeInTransit}-${cheap.maxTimeInTransit} days)`);
                }
            } else {
                // Fallback: Try other YunExpress options
                const yunExpressRoutes = cheapCandidates.filter(route => {
                    const name = route.serviceName ? route.serviceName.toLowerCase() : '';
                    return name.includes('yunexpress') && 
                           (name.includes('air cargo (general)') || 
                            name.includes('premium line(general)') ||
                            name.includes('premium line (general)'));
                });

                if (yunExpressRoutes.length > 0) {
                    // Use cheapest YunExpress option as fallback
                    cheap = yunExpressRoutes.sort((a, b) => a.totalPrice - b.totalPrice)[0];
                    if (debugLogs) {
                        debugLogs.push(`    💰 Cheap (YunExpress fallback for AU): ${cheap.serviceName} - ¥${cheap.totalPrice.toFixed(2)} (${cheap.minTimeInTransit}-${cheap.maxTimeInTransit} days) - Fast Express Line not available`);
                    }
                } else {
                    // No YunExpress found, use cheapest
                    cheap = cheapCandidates[0];
                    if (debugLogs) {
                        debugLogs.push(`    💰 Cheap: ${cheap.serviceName} - ¥${cheap.totalPrice.toFixed(2)} (${cheap.minTimeInTransit}-${cheap.maxTimeInTransit} days) - No YunExpress available`);
                    }
                }
            }
        } else {
            // For USA and other countries: Use cheapest available option
            cheap = cheapCandidates.length > 0 ? cheapCandidates[0] : sortedByPrice[0];
            if (debugLogs) {
                if (cheapCandidates.length > 0) {
                    debugLogs.push(`    💰 Cheap (cheapest available${isUSA ? ', excluding clothing/NA' : ''}): ${cheap.serviceName} - ¥${cheap.totalPrice.toFixed(2)} (${cheap.minTimeInTransit}-${cheap.maxTimeInTransit} days)`);
                } else {
                    debugLogs.push(`    💰 Cheap: ${cheap.serviceName} - ¥${cheap.totalPrice.toFixed(2)} (premium carrier, no non-premium available)`);
                }
            }
        }

        // Find EXPRESS: MUST be UPS or DHL only, whichever is cheapest
        // Express must meet MAX_EXPRESS_DAYS requirement
        let expressCandidates = routes.filter(route => {
            const name = route.serviceName ? route.serviceName.toLowerCase() : '';
            // Only UPS or DHL, and must meet transit time requirement
            return route.minTimeInTransit <= this.MAX_EXPRESS_DAYS &&
                   (name.includes('ups') || name.includes('dhl'));
        });

        // Select cheapest UPS or DHL option
        const express = expressCandidates.length > 0
            ? expressCandidates.sort((a, b) => a.totalPrice - b.totalPrice)[0] // Cheapest first
            : null;

        // Ensure minimum price gap between cheap and express (at least 15% or $5 USD difference)
        // If prices are too close, adjust cheap to be cheaper
        if (cheap && express) {
            const cheapPriceUSD = cheap.totalPrice * this.RMB_TO_USD;
            const expressPriceUSD = express.totalPrice * this.RMB_TO_USD;
            const priceGap = expressPriceUSD - cheapPriceUSD;
            const minGapUSD = Math.max(5.0, cheapPriceUSD * 0.15); // At least $5 or 15% of cheap price
            
            if (priceGap < minGapUSD) {
                if (debugLogs) {
                    debugLogs.push(`    ⚠️ Price gap too small: $${priceGap.toFixed(2)} (need at least $${minGapUSD.toFixed(2)})`);
                }
                
                // For Australia: Try to find a cheaper YunExpress option
                if (isAUS && cheapCandidates.length > 1) {
                    // Try YunExpress Air Cargo (General) - should be cheaper
                    const airCargo = cheapCandidates.find(route => {
                        const name = route.serviceName ? route.serviceName.toLowerCase() : '';
                        return name.includes('yunexpress') && name.includes('air cargo (general)');
                    });
                    
                    if (airCargo && (expressPriceUSD - (airCargo.totalPrice * this.RMB_TO_USD)) >= minGapUSD) {
                        cheap = airCargo;
                        if (debugLogs) {
                            debugLogs.push(`    ✅ Adjusted cheap to YunExpress Air Cargo for better price gap: ¥${cheap.totalPrice.toFixed(2)} (${cheap.minTimeInTransit}-${cheap.maxTimeInTransit} days)`);
                        }
                    } else {
                        // Use cheapest available option to maximize gap
                        const cheaperOption = cheapCandidates[0];
                        if (cheaperOption && cheaperOption.totalPrice < cheap.totalPrice) {
                            const newGap = expressPriceUSD - (cheaperOption.totalPrice * this.RMB_TO_USD);
                            if (newGap >= minGapUSD) {
                                cheap = cheaperOption;
                                if (debugLogs) {
                                    debugLogs.push(`    ✅ Adjusted cheap to cheapest option for better price gap: ¥${cheap.totalPrice.toFixed(2)} (${cheap.minTimeInTransit}-${cheap.maxTimeInTransit} days)`);
                                }
                            }
                        }
                    }
                } else {
                    // For other countries: Use cheapest option if it creates better gap
                    const cheaperOption = cheapCandidates.length > 0 ? cheapCandidates[0] : sortedByPrice[0];
                    if (cheaperOption && cheaperOption.totalPrice < cheap.totalPrice) {
                        const newGap = expressPriceUSD - (cheaperOption.totalPrice * this.RMB_TO_USD);
                        if (newGap >= minGapUSD) {
                            cheap = cheaperOption;
                            if (debugLogs) {
                                debugLogs.push(`    ✅ Adjusted cheap to cheapest option for better price gap: ¥${cheap.totalPrice.toFixed(2)} (${cheap.minTimeInTransit}-${cheap.maxTimeInTransit} days)`);
                            }
                        }
                    }
                }
                
                // Final check - log the gap
                const finalGap = (express.totalPrice * this.RMB_TO_USD) - (cheap.totalPrice * this.RMB_TO_USD);
                if (debugLogs) {
                    debugLogs.push(`    📊 Final price gap: $${finalGap.toFixed(2)} (Cheap: $${(cheap.totalPrice * this.RMB_TO_USD).toFixed(2)}, Express: $${expressPriceUSD.toFixed(2)})`);
                }
            }
        }

        if (debugLogs) {
            if (express) {
                debugLogs.push(`    🚀 Express: ${express.serviceName} - ¥${express.totalPrice.toFixed(2)} (${express.minTimeInTransit}-${express.maxTimeInTransit} days) - Cheapest UPS/DHL option`);
            } else {
                debugLogs.push(`    🚀 Express: None found (need UPS or DHL with min transit ≤${this.MAX_EXPRESS_DAYS} days)`);
                if (expressCandidates.length === 0) {
                    const upsDhlRoutes = routes.filter(route => {
                        const name = route.serviceName ? route.serviceName.toLowerCase() : '';
                        return name.includes('ups') || name.includes('dhl');
                    });
                    if (upsDhlRoutes.length > 0) {
                        debugLogs.push(`      (Found ${upsDhlRoutes.length} UPS/DHL routes but min transit > ${this.MAX_EXPRESS_DAYS} days):`);
                        upsDhlRoutes.forEach(route => {
                            debugLogs.push(`        - ${route.serviceName}: ${route.minTimeInTransit}-${route.maxTimeInTransit} days (min ${route.minTimeInTransit} > ${this.MAX_EXPRESS_DAYS})`);
                        });
                    } else {
                        debugLogs.push(`      (No UPS or DHL carriers found in available routes)`);
                    }
                }
            }
        }

        return { cheap, express };
    }

    /**
     * Get Price Tier
     */
    getPriceTier(costUSD) {
        for (const bucket of this.PRICE_BUCKETS) {
            if (costUSD <= bucket.max_cost) {
                return bucket;
            }
        }
        return this.PRICE_BUCKETS[this.PRICE_BUCKETS.length - 1];
    }

    /**
     * Process a single product - calculates Express and Fast options
     * @param {Object} product - Product from database
     * @param {Object} metafields - Shopify metafields object (optional)
     * @param {Object} targetCountry - Target country config { name, code, postcode } (optional, defaults to Australia)
     */
    async calculateProductShipping(product, metafields = null, targetCountry = null, quantity = 1) {
        const debugLogs = []; // Collect debug logs to return to frontend
        debugLogs.push(`📦 Calculating shipping for: ${product.title}`);
        
        logger.info(`📦 Calculating shipping for: ${product.title}`);
        
        // Extract raw weight from metafield: custom.weight_raw_kg_
        // Fall back to variant weight if metafield not found
        const variant = product.variants && product.variants[0] ? product.variants[0] : {};
        let rawW = 0;
        
        if (metafields && metafields.length > 0) {
            // Look for weight_raw_kg_ metafield in custom namespace
            const weightMeta = metafields.find(m => 
                (m.namespace === 'custom' && m.key === 'weight_raw_kg_') ||
                m.key === 'weight_raw_kg_' ||
                m.key === 'weight_raw_kg'
            );
            
            if (weightMeta) {
                rawW = parseFloat(weightMeta.value) || 0;
                debugLogs.push(`  ✓ Weight from metafield (${weightMeta.namespace}.${weightMeta.key}): ${rawW} kg`);
                logger.info(`  Weight from metafield (${weightMeta.namespace}.${weightMeta.key}): ${rawW} kg`);
            } else {
                // Fall back to variant weight
                rawW = variant.weight || 0;
                debugLogs.push(`  ⚠️ weight_raw_kg_ metafield not found, using variant weight: ${rawW} ${variant.weight_unit || 'kg'}`);
                logger.warn(`  ⚠️ weight_raw_kg_ metafield not found, using variant weight: ${rawW} ${variant.weight_unit || 'kg'}`);
                
                // Handle unit conversion
                if (variant.weight_unit === 'g') {
                    rawW = rawW / 1000;
                } else if (variant.weight_unit === 'oz') {
                    rawW = rawW * 0.0283495;
                } else if (variant.weight_unit === 'lb') {
                    rawW = rawW * 0.453592;
                }
            }
        } else {
            // No metafields, use variant weight
            rawW = variant.weight || 0;
            debugLogs.push(`  ⚠️ No metafields found, using variant weight: ${rawW} ${variant.weight_unit || 'kg'}`);
            logger.warn(`  ⚠️ No metafields found, using variant weight: ${rawW} ${variant.weight_unit || 'kg'}`);
            
            // Handle unit conversion
            if (variant.weight_unit === 'g') {
                rawW = rawW / 1000;
            } else if (variant.weight_unit === 'oz') {
                rawW = rawW * 0.0283495;
            } else if (variant.weight_unit === 'lb') {
                rawW = rawW * 0.453592;
            }
        }
        
        // Default to 0.1kg if weight is 0 or invalid
        if (!rawW || rawW <= 0) {
            rawW = 0.1;
            debugLogs.push(`  ⚠️ Weight is 0 or invalid, defaulting to 0.1 kg`);
            logger.warn(`  ⚠️ Weight is 0 or invalid, defaulting to 0.1 kg`);
        }
        
        // rawW is now in KG
        debugLogs.push(`  Raw weight: ${rawW} kg`);
        logger.info(`  Raw weight: ${rawW} kg`);

        // Extract dimensions from metafields
        // Look for: largest_diameter_raw (MM) and height_raw (MM)
        // Use diameter for both length and width
        let rawL = 100; // Default in mm (length)
        let rawH = 100; // Default in mm (height)
        let rawD = 100; // Default in mm (width/diameter)

        if (metafields && metafields.length > 0) {
            logger.info(`  Found ${metafields.length} metafields`);
            
            // Look for largest_diameter_raw (any namespace) - try both with and without _mm_ suffix
            const diameterMeta = metafields.find(m => 
                m.key === 'largest_diameter_raw' || 
                m.key === 'largest_diameter_raw_mm_' ||
                m.key === 'largest_diameter_raw_mm'
            );
            // Look for height_raw (any namespace) - try both with and without _mm_ suffix
            const heightMeta = metafields.find(m => 
                m.key === 'height_raw' || 
                m.key === 'height_raw_mm_' ||
                m.key === 'height_raw_mm'
            );
            
            if (diameterMeta) {
                rawD = parseFloat(diameterMeta.value) || rawD;
                rawL = rawD; // Use diameter for both length and width
                debugLogs.push(`  ✓ Diameter from metafield (${diameterMeta.namespace}.${diameterMeta.key}): ${rawD} mm`);
                debugLogs.push(`  ✓ Using diameter for length and width: ${rawL} mm`);
                logger.info(`  Diameter from metafield (${diameterMeta.namespace}.${diameterMeta.key}): ${rawD} mm`);
                logger.info(`  Using diameter for length and width: ${rawL} mm`);
            } else {
                debugLogs.push(`  ⚠️ largest_diameter_raw metafield not found`);
                logger.warn(`  ⚠️ largest_diameter_raw metafield not found`);
            }
            
            if (heightMeta) {
                rawH = parseFloat(heightMeta.value) || rawH;
                debugLogs.push(`  ✓ Height from metafield (${heightMeta.namespace}.${heightMeta.key}): ${rawH} mm`);
                logger.info(`  Height from metafield (${heightMeta.namespace}.${heightMeta.key}): ${rawH} mm`);
            } else {
                debugLogs.push(`  ⚠️ height_raw metafield not found`);
                logger.warn(`  ⚠️ height_raw metafield not found`);
            }
            
            // Log what we found
            if (!diameterMeta && !heightMeta) {
                const availableKeys = metafields.map(m => `${m.namespace}.${m.key}`).join(', ');
                debugLogs.push(`  ⚠️ No dimension metafields found. Available: ${availableKeys}`);
                logger.warn(`  ⚠️ No dimension metafields found. Available metafields:`, availableKeys);
            }
        } else {
            debugLogs.push(`  ⚠️ No metafields found, using defaults: L=${rawL}mm, H=${rawH}mm, W=${rawD}mm`);
            logger.warn(`  ⚠️ No metafields found, using defaults: L=${rawL}mm, H=${rawH}mm, W=${rawD}mm`);
        }

        // Apply tolerance and adjustment (from spec)
        const weightAdd = Math.max(rawW * 0.15, 0.2);
        const adjW = Number((rawW + weightAdd).toFixed(3)); // Adjusted Weight (kg)
        const adjL = Number(((rawL / 10) + 2).toFixed(1));  // Adjusted Length (cm) - convert mm to cm + 2cm buffer
        const adjH = Number(((rawH / 10) + 2).toFixed(1));  // Adjusted Height (cm)
        const adjD = Number(((rawD / 10) + 2).toFixed(1));  // Adjusted Width/Diameter (cm)

        debugLogs.push(`  📏 Adjusted dimensions: W=${adjW}kg (+${weightAdd.toFixed(3)}kg), L=${adjL}cm, H=${adjH}cm, D=${adjD}cm`);
        logger.info(`  Adjusted dimensions: W=${adjW}kg, L=${adjL}cm, H=${adjH}cm, D=${adjD}cm`);

        // Use target country or default to Australia (matching Google Apps Script)
        const country = targetCountry || { 
            name: 'Australia', 
            code: 'AU', 
            postcode: '3189',
            province: 'Victoria',
            provinceCode: 'VIC',
            address: '18 Joan St Moorabbin'
        };
        debugLogs.push(`  🌍 Target: ${country.name} (${country.code}), ${country.province || ''} ${country.postcode || ''}, ${country.address || ''}`);
        logger.info(`  Target country: ${country.name} (${country.code}), ${country.province || ''} ${country.postcode || ''}`);
        
        // Track max prices across all countries for code assignment
        let maxCheapPriceUSD = 0;
        let maxExpressPriceUSD = 0;
        let bestCheapService = '';
        let bestExpressService = '';
        let cheapOption = null;
        let expressOption = null;
        let allRoutesData = []; // Store all routes for testing/debugging (for THIS country only)

        // Calculate for target country first (primary)
        // Match Google Apps Script format exactly
        // Use buckyDropName if provided, otherwise use country.name
        // BuckyDrop requires "USA" instead of "United States"
        // For Singapore, try different name formats if needed
        let countryNameForBuckyDrop = country.buckyDropName || country.name;
        
        // Special handling for United States - BuckyDrop requires "USA" not "United States"
        if (country.code === 'US' && !country.buckyDropName) {
            countryNameForBuckyDrop = 'USA';
        }
        
        // Special handling for Singapore - try "SG" as country name if "Singapore" doesn't work
        if (country.code === 'SG' && !country.buckyDropName) {
            // First try with "Singapore", but we'll log it for debugging
            countryNameForBuckyDrop = country.name;
        }
        
        // Special handling for Singapore - it's a city-state, so province should be empty
        const isSingapore = country.code === 'SG';
        
        // For Singapore, try without province fields at all, or use a minimal address
        let requestBody;
        if (isSingapore) {
            // Try without province/provinceCode fields for Singapore
            requestBody = {
                lang: "en",
                country: countryNameForBuckyDrop,
                countryCode: country.code,
                // Omit province and provinceCode for Singapore
                detailAddress: country.address || "",
                postCode: country.postcode || "",
                productList: [{
                    length: adjL,
                    width: adjD,
                    height: adjH,
                    weight: adjW,
                    count: quantity, // Use actual quantity for multiple items
                    categoryCode: "other"
                }],
                orderBy: "price",
                orderType: "asc"
            };
        } else {
            requestBody = {
                lang: "en",
                country: countryNameForBuckyDrop,
                countryCode: country.code,
                province: country.province || "",
                provinceCode: country.provinceCode || "",
                detailAddress: country.address || "",
                postCode: country.postcode || "",
                productList: [{
                    length: adjL,
                    width: adjD,
                    height: adjH,
                    weight: adjW,
                    count: quantity, // Use actual quantity for multiple items
                    categoryCode: "other"
                }],
                orderBy: "price",
                orderType: "asc"
            };
        }
        
        // Extra logging for Singapore to debug why no routes are returned
        if (isSingapore) {
            debugLogs.push(`  🔍 Singapore-specific request: province=${requestBody.province !== undefined ? `"${requestBody.province}"` : 'omitted'}, provinceCode=${requestBody.provinceCode !== undefined ? `"${requestBody.provinceCode}"` : 'omitted'}, detailAddress="${requestBody.detailAddress}", postCode="${requestBody.postCode}"`);
            logger.info(`  🔍 Singapore request details: province=${requestBody.province !== undefined ? `"${requestBody.province}"` : 'omitted'}, provinceCode=${requestBody.provinceCode !== undefined ? `"${requestBody.provinceCode}"` : 'omitted'}, detailAddress="${requestBody.detailAddress}", postCode="${requestBody.postCode}"`);
        }
        
        debugLogs.push(`  📋 Request body: ${JSON.stringify(requestBody, null, 2)}`);
        debugLogs.push(`  🔍 Using country name for BuckyDrop: "${countryNameForBuckyDrop}" (buckyDropName: ${country.buckyDropName || 'not provided'}, country.name: ${country.name})`);
        logger.info(`  Using country name for BuckyDrop: "${countryNameForBuckyDrop}" (buckyDropName: ${country.buckyDropName || 'not provided'})`);

        try {
            debugLogs.push(`  🌍 Calling BuckyDrop API for ${country.name} (using "${countryNameForBuckyDrop}" in request)...`);
            logger.info(`  Calling BuckyDrop API for ${country.name} (using "${countryNameForBuckyDrop}" in request)...`);
            const response = await this.buckyDropService.fetchShippingRates(requestBody);
            
            if (response.success && response.data) {
                // Handle different response structures - some APIs return records directly, others in a list/array field
                let allRoutes = response.data.records || [];
                
                // If records doesn't exist, check for other possible field names (list, data, items, etc.)
                if (!allRoutes || allRoutes.length === 0) {
                    // Check if response.data itself is an array
                    if (Array.isArray(response.data)) {
                        allRoutes = response.data;
                    } else if (response.data.list && Array.isArray(response.data.list)) {
                        allRoutes = response.data.list;
                    } else if (response.data.data && Array.isArray(response.data.data)) {
                        allRoutes = response.data.data;
                    } else if (response.data.items && Array.isArray(response.data.items)) {
                        allRoutes = response.data.items;
                    }
                }
                
                allRoutesData = [...allRoutes]; // Store COPY for return (before filtering) - ensure it's a new array
                debugLogs.push(`  ✅ Received ${allRoutes.length} routes from BuckyDrop`);
                logger.info(`  Received ${allRoutes.length} routes from BuckyDrop for ${country.name} (${country.code})`);
                
                if (allRoutes.length === 0) {
                    debugLogs.push(`  ⚠️ No routes returned from BuckyDrop API`);
                    debugLogs.push(`  📋 API Response: success=${response.success}, data exists=${!!response.data}, records exists=${!!response.data?.records}`);
                    debugLogs.push(`  📋 Full response structure: ${JSON.stringify(Object.keys(response.data || {}))}`);
                    if (response.data) {
                        debugLogs.push(`  📋 Response.data keys: ${JSON.stringify(Object.keys(response.data))}`);
                        debugLogs.push(`  📋 Response.data.total: ${response.data.total || 'N/A'}`);
                        debugLogs.push(`  📋 Response.data.current: ${response.data.current || 'N/A'}`);
                        debugLogs.push(`  📋 Response.data.size: ${response.data.size || 'N/A'}`);
                        debugLogs.push(`  📋 Response.data.pages: ${response.data.pages || 'N/A'}`);
                        if (response.data.records !== undefined) {
                            debugLogs.push(`  📋 records is defined: ${Array.isArray(response.data.records) ? 'array' : typeof response.data.records}, length: ${response.data.records?.length || 'N/A'}`);
                        }
                    }
                    logger.warn(`  ⚠️ No routes returned from BuckyDrop for ${country.name} (${country.code})`);
                    logger.warn(`  API Response structure:`, JSON.stringify(response.data, null, 2));
                    logger.warn(`  Request that was sent:`, JSON.stringify(requestBody, null, 2));
                }
                
                // Show sample routes
                if (allRoutes.length > 0 && allRoutes.length <= 10) {
                    debugLogs.push(`  📋 Routes received:`);
                    allRoutes.slice(0, 5).forEach(r => {
                        debugLogs.push(`    - ${r.serviceName}: ¥${r.totalPrice?.toFixed(2) || 'N/A'} (${r.minTimeInTransit || '?'}-${r.maxTimeInTransit || '?'} days)`);
                    });
                    if (allRoutes.length > 5) {
                        debugLogs.push(`    ... and ${allRoutes.length - 5} more`);
                    }
                }
                
                let routes = this.filterRoutes(allRoutes, adjW, country.code, debugLogs);
                logger.info(`  After filtering: ${routes.length} valid routes (from ${allRoutes.length} total)`);
                
                // Store ALL filtered routes (not just cheap/express) - these are the valid ones
                // This ensures we return all available options, not just the best two
                if (!allRoutesData || allRoutesData.length === 0) {
                    allRoutesData = [...routes]; // Initialize with filtered routes
                } else {
                    // Merge with existing routes (for multiple countries/products)
                    allRoutesData = [...allRoutesData, ...routes];
                }
                
                // Log detailed diagnostics if no routes after filtering
                if (routes.length === 0 && allRoutes.length > 0) {
                    logger.warn(`  ⚠️ All ${allRoutes.length} routes were filtered out for ${product.title} (${country.name})`);
                    logger.warn(`  📊 Product details: weight=${adjW}kg, dimensions=${adjL}cm x ${adjH}cm x ${adjD}cm`);
                    logger.warn(`  📋 Sample filtered routes (first 3):`);
                    allRoutes.slice(0, 3).forEach(r => {
                        logger.warn(`    - ${r.serviceName}: ¥${r.totalPrice?.toFixed(2)}, weight limits: [${r.weightLowLimit}-${r.weightHighLimit}kg], transit: ${r.minTimeInTransit}-${r.maxTimeInTransit} days`);
                    });
                } else if (routes.length === 0 && allRoutes.length === 0) {
                    logger.warn(`  ⚠️ No routes returned from BuckyDrop API for ${product.title} (${country.name})`);
                    logger.warn(`  📊 Product details: weight=${adjW}kg, dimensions=${adjL}cm x ${adjH}cm x ${adjD}cm`);
                    logger.warn(`  📋 Request sent:`, JSON.stringify(requestBody, null, 2));
                }
                
                const { cheap, express } = this.selectBestRoutes(routes, country.code, debugLogs);
                logger.info(`  Selected routes - Cheap: ${cheap?.serviceName || 'none'}, Express: ${express?.serviceName || 'none'}`);
                
                // Log final result summary
                if (!cheap && !express) {
                    logger.warn(`  ❌ ${product.title} (${country.name}): No shipping options selected after filtering and selection`);
                }

                if (cheap) {
                    const priceUSD = Number((cheap.totalPrice * this.RMB_TO_USD).toFixed(2));
                    maxCheapPriceUSD = priceUSD;
                    bestCheapService = cheap.serviceName;
                    cheapOption = cheap;
                }
                
                if (express) {
                    const priceUSD = Number((express.totalPrice * this.RMB_TO_USD).toFixed(2));
                    maxExpressPriceUSD = priceUSD;
                    bestExpressService = express.serviceName;
                    expressOption = express;
                }
            }
        } catch (err) {
            const errorMsg = `❌ Failed to get rates for ${country.code} (${country.name}): ${err.message}`;
            debugLogs.push(errorMsg);
            if (err.response?.data) {
                debugLogs.push(`  Error details: ${JSON.stringify(err.response.data)}`);
            }
            logger.error(`❌ Failed to get rates for ${country.code} (${country.name}):`, {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
                stack: err.stack
            });
            // Ensure allRoutesData is at least an empty array even on error
            if (!allRoutesData || !Array.isArray(allRoutesData)) {
                logger.warn(`⚠️ allRoutesData is not an array after error! Setting to empty array.`);
                allRoutesData = [];
            }
            // Don't throw - continue to other countries
        }
        
        // CRITICAL: Log allRoutesData before returning
        logger.info(`📤 FINAL CHECK: allRoutesData before return: type=${typeof allRoutesData}, isArray=${Array.isArray(allRoutesData)}, length=${allRoutesData ? allRoutesData.length : 'N/A'}`);
        
        // If allRoutesData is still empty but we got routes, something went wrong
        if (allRoutesData.length === 0 && (bestCheapService || bestExpressService)) {
            logger.error(`❌ CRITICAL: allRoutesData is empty but we have selected routes! This means routes were not stored.`);
        }

        // NOTE: We NO LONGER check other countries here
        // Code assignment is now done in routes/shipping.js based on MAX prices
        // across the addresses the user actually specified (not all possible countries)
        // This ensures code 1 can have different rates for USA/AU vs NZ etc

        // Get price tier for the max Cheap price (used for code assignment)
        const cheapTier = this.getPriceTier(maxCheapPriceUSD);
        
        // Log final results
        if (!bestCheapService && !bestExpressService) {
            const warnMsg = `⚠️ No shipping options found for ${product.title}`;
            debugLogs.push(warnMsg);
            logger.warn(warnMsg);
        } else {
            const successMsg = `✅ Final: Cheap=$${maxCheapPriceUSD.toFixed(2)} (${bestCheapService || 'none'}), Express=$${maxExpressPriceUSD.toFixed(2)} (${bestExpressService || 'none'})`;
            debugLogs.push(successMsg);
            logger.info(`✅ ${product.title}: Cheap=$${maxCheapPriceUSD.toFixed(2)} (${bestCheapService || 'none'}), Express=$${maxExpressPriceUSD.toFixed(2)} (${bestExpressService || 'none'})`);
        }
        
        // Ensure allRoutesData is always an array before returning
        if (!allRoutesData || !Array.isArray(allRoutesData)) {
            logger.warn(`⚠️ allRoutesData is not an array! Setting to empty array. Type: ${typeof allRoutesData}, Value:`, allRoutesData);
            allRoutesData = [];
        }
        
        // CRITICAL: Ensure allRoutesData is always an array before returning
        if (!allRoutesData || !Array.isArray(allRoutesData)) {
            logger.warn(`⚠️ allRoutesData is not an array before return! Type: ${typeof allRoutesData}, Value:`, allRoutesData);
            allRoutesData = [];
        }
        
        // Log what we're returning
        logger.info(`📤 Returning from ShippingService: allRoutesData has ${allRoutesData.length} routes`);
        logger.info(`📤 Return object will include allRoutes: ${allRoutesData.length} routes`);
        
        const returnObj = {
            productId: product._id || product.id,
            title: product.title,
            rawWeight: rawW, // Store original weight for metafield
            adjWeight: adjW,
            maxCheapPriceUSD,
            maxExpressPriceUSD,
            cheapService: bestCheapService,
            expressService: bestExpressService,
            cheapOption, // Full cheap route object
            expressOption, // Full express route object
            cheapTier,
            adjDimensions: { length: adjL, width: adjD, height: adjH },
            debugLogs, // Return debug logs for frontend display
            allRoutes: allRoutesData // Include all routes for testing/debugging - always an array
        };
        
        // Verify allRoutes is in the return object
        logger.info(`📤 Return object keys: [${Object.keys(returnObj).join(', ')}]`);
        logger.info(`📤 Return object has allRoutes: ${'allRoutes' in returnObj}, allRoutes length: ${returnObj.allRoutes ? returnObj.allRoutes.length : 'N/A'}`);
        
        return returnObj;
    }
}

module.exports = ShippingService;

