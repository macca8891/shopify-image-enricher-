const express = require('express');
const axios = require('axios');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const logger = require('../utils/logger');

const router = express.Router();

// Test endpoint to verify code version (before any shop checks)
router.get('/version-check', (req, res) => {
    res.json({ 
        version: '2.0',
        hasFetch: typeof fetch !== 'undefined',
        code: 'NEW IMPORT CODE WITH FETCH',
        timestamp: new Date().toISOString()
    });
});

// Import products from Shopify
router.post('/import', async (req, res) => {
    try {
        const { shop } = req.query;
        const { status, force } = req.body; // Optional: 'active', 'draft', 'archived', or undefined (all products). force=true to update all products
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop parameter is required' });
        }

        const shopData = await Shop.findOne({ domain: shop });
        if (!shopData || !shopData.accessToken) {
            return res.status(404).json({ error: 'Shop not found or not authenticated' });
        }

        logger.info(`🚀🚀🚀 NEW IMPORT CODE v3.0 - Using GraphQL to fetch products WITH metafields`);
        
        const importStartTime = Date.now();
        
        // Use GraphQL API to fetch products WITH metafields in a single query
        const allProducts = [];
        let hasNextPage = true;
        let cursor = null;
        let pageCount = 0;
        const maxBatches = 200; // Max 200 batches = 50,000 products

        while (hasNextPage && pageCount < maxBatches) {
            pageCount++;
            
            const graphqlQuery = `
                query getProducts($cursor: String) {
                    products(first: 250, after: $cursor) {
                        edges {
                            node {
                                id
                                legacyResourceId
                                title
                                handle
                                description
                                vendor
                                productType
                                status
                                createdAt
                                updatedAt
                                publishedAt
                                tags
                                variants(first: 100) {
                                    edges {
                                        node {
                                            id
                                            legacyResourceId
                                            title
                                            price
                                            sku
                                            inventoryQuantity
                                        }
                                    }
                                }
                                images(first: 10) {
                                    edges {
                                        node {
                                            id
                                            url
                                            altText
                                        }
                                    }
                                }
                                metafields(first: 50) {
                                    edges {
                                        node {
                                            id
                                            namespace
                                            key
                                            value
                                            type
                                            description
                                        }
                                    }
                                }
                            }
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                }
            `;

            logger.info(`📡 [GraphQL] Fetching page ${pageCount}${cursor ? ' (with cursor)' : ''}...`);

            const response = await fetch(`https://${shop}/admin/api/2023-04/graphql.json`, {
                method: 'POST',
            headers: {
                'X-Shopify-Access-Token': shopData.accessToken,
                'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: graphqlQuery,
                    variables: { cursor: cursor }
                })
            });

            if (!response.ok) {
                if (response.status === 429) {
                    logger.warn(`⏳ Rate limited, waiting 5 seconds...`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    continue; // Retry the same page
                }
                
                const errorText = await response.text();
                logger.error(`❌ HTTP ${response.status}: ${errorText}`);
                break;
            }

            const result = await response.json();
            
            if (result.errors) {
                logger.error(`❌ GraphQL errors:`, result.errors);
                break;
            }

            const products = result.data.products.edges.map(edge => {
                const node = edge.node;
                
                // Convert GraphQL format to REST API format for compatibility
                return {
                    id: node.legacyResourceId,
                    title: node.title,
                    handle: node.handle,
                    body_html: node.description || '',
                    vendor: node.vendor || '',
                    product_type: node.productType || '',
                    status: node.status?.toLowerCase() || (node.publishedAt ? 'active' : 'draft'),
                    published_at: node.publishedAt,
                    tags: node.tags?.join(',') || '',
                    created_at: node.createdAt,
                    updated_at: node.updatedAt,
                    variants: node.variants.edges.map(v => ({
                        id: v.node.legacyResourceId,
                        title: v.node.title,
                        price: v.node.price,
                        sku: v.node.sku || '',
                        weight: 0, // Weight not available in GraphQL ProductVariant, will be updated from existing data or calculated
                        weight_unit: 'kg',
                        inventory_quantity: v.node.inventoryQuantity || 0
                    })),
                    images: node.images.edges.map((img, idx) => ({
                        id: img.node.id?.split('/').pop() || '',
                        src: img.node.url,
                        alt: img.node.altText || node.title,
                        position: idx + 1
                    })),
                    // Store metafields in a format compatible with our code
                    _metafields: node.metafields.edges.map(m => ({
                        id: m.node.id?.split('/').pop() || '',
                        namespace: m.node.namespace,
                        key: m.node.key,
                        value: m.node.value,
                        type: m.node.type,
                        description: m.node.description || ''
                    }))
                };
            });
            
            logger.info(`📦 [GraphQL] Page ${pageCount}: Got ${products.length} products with metafields`);
            
            if (products.length === 0) {
                logger.info(`📦 No more products, stopping`);
                break;
            }
            
            allProducts.push(...products);
            const elapsedSeconds = Math.round((Date.now() - importStartTime) / 1000);
            const estimatedTotal = hasNextPage ? Math.ceil(allProducts.length / pageCount) * pageCount : allProducts.length;
            const estimatedTimeRemaining = hasNextPage ? Math.round((elapsedSeconds / pageCount) * (Math.ceil(estimatedTotal / 250) - pageCount)) : 0;
            
            logger.info(`📦 [GraphQL] Page ${pageCount}: Found ${products.length} products (Total: ${allProducts.length}) | Elapsed: ${elapsedSeconds}s${estimatedTimeRemaining > 0 ? ` | Est. remaining: ~${estimatedTimeRemaining}s` : ''}`);

            hasNextPage = result.data.products.pageInfo.hasNextPage;
            cursor = result.data.products.pageInfo.endCursor;
            
            // Add delay to prevent rate limiting
            if (hasNextPage) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second between pages
            }
            
            // Rate limit protection: extra delay every 10 pages
            if (pageCount % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        const fetchTime = Math.round((Date.now() - importStartTime) / 1000);
        const shopifyProducts = allProducts;
        logger.info(`✅ Total products fetched with metafields: ${shopifyProducts.length} (took ${fetchTime}s)`);
        
        // Debug: Check status field in first few products
        if (shopifyProducts.length > 0) {
            const statusCounts = {};
            shopifyProducts.slice(0, 10).forEach(p => {
                const status = p.status || (p.published_at ? 'active' : 'draft');
                statusCounts[status] = (statusCounts[status] || 0) + 1;
            });
            logger.info(`🔍 Sample product statuses (first 10): ${JSON.stringify(statusCounts)}`);
        }
        
        let importedCount = 0;
        let updatedCount = 0;
        const statusUpdateCounts = { active: 0, draft: 0, archived: 0 };

        for (const shopifyProduct of shopifyProducts) {
            try {
                const existingProduct = await Product.findOne({
                    shopifyId: shopifyProduct.id.toString(),
                    shopDomain: shop
                });

                // Get metafields from GraphQL response (stored in _metafields)
                // Ensure metafields are plain objects (not Mongoose documents)
                const rawMetafields = shopifyProduct._metafields || [];
                const metafields = rawMetafields.map(m => ({
                    id: String(m.id || ''),
                    namespace: String(m.namespace || ''),
                    key: String(m.key || ''),
                    value: String(m.value || ''),
                    type: String(m.type || ''),
                    description: String(m.description || '')
                }));
                
                // Extract weight from metafield: custom.weight_raw_kg_ or custom.weight_raw
                let weightFromMetafield = null;
                if (metafields && metafields.length > 0) {
                    // Try multiple possible metafield key formats
                    const weightMeta = metafields.find(m => 
                        (m.namespace === 'custom' && m.key === 'weight_raw_kg_') ||
                        (m.namespace === 'custom' && m.key === 'weight_raw_kg') ||
                        (m.namespace === 'custom' && m.key === 'weight_raw') ||
                        m.key === 'weight_raw_kg_' ||
                        m.key === 'weight_raw_kg' ||
                        m.key === 'weight_raw'
                    );
                    if (weightMeta) {
                        const rawValue = weightMeta.value;
                        // Skip if value is "NO WEIGHT" or similar
                        if (rawValue && rawValue.toUpperCase() !== 'NO WEIGHT' && rawValue.trim() !== '') {
                            weightFromMetafield = parseFloat(rawValue);
                            if (isNaN(weightFromMetafield)) {
                                weightFromMetafield = null;
                            }
                        }
                    }
                }
                
                // Debug: Log metafields for first few products
                if (importedCount + updatedCount < 5) {
                    logger.info(`📦 Product ${shopifyProduct.title}: Found ${metafields.length} metafields`);
                    const diameter = metafields.find(m => 
                        m.key === 'largest_diameter_raw' || 
                        m.key === 'largest_diameter_raw_mm_' ||
                        m.key === 'largest_diameter_raw_mm'
                    );
                    const height = metafields.find(m => 
                        m.key === 'height_raw' || 
                        m.key === 'height_raw_mm_' ||
                        m.key === 'height_raw_mm'
                    );
                    if (diameter) logger.info(`  ✓ diameter (${diameter.key}): ${diameter.value}`);
                    if (height) logger.info(`  ✓ height (${height.key}): ${height.value}`);
                    if (weightFromMetafield !== null) {
                        const weightMeta = metafields.find(m => 
                            (m.namespace === 'custom' && (m.key === 'weight_raw_kg_' || m.key === 'weight_raw_kg' || m.key === 'weight_raw')) ||
                            m.key === 'weight_raw_kg_' || m.key === 'weight_raw_kg' || m.key === 'weight_raw'
                        );
                        logger.info(`  ✓ weight from metafield (${weightMeta?.namespace || 'custom'}.${weightMeta?.key || 'weight_raw_kg_'}): ${weightFromMetafield} kg`);
                    } else {
                        // Log if we looked but didn't find it
                        const hasWeightMeta = metafields.some(m => 
                            m.key && (m.key.includes('weight') || m.key.includes('Weight'))
                        );
                        if (hasWeightMeta) {
                            const weightMetas = metafields.filter(m => m.key && (m.key.includes('weight') || m.key.includes('Weight')));
                            logger.info(`  ⚠️ Found weight-related metafields but couldn't parse: ${weightMetas.map(m => `${m.namespace}.${m.key}=${m.value}`).join(', ')}`);
                        }
                    }
                }

                const productData = {
                    shopifyId: shopifyProduct.id.toString(),
                    shopDomain: shop,
                    title: shopifyProduct.title,
                    handle: shopifyProduct.handle,
                    description: shopifyProduct.body_html,
                    vendor: shopifyProduct.vendor,
                    productType: shopifyProduct.product_type,
                    tags: shopifyProduct.tags ? shopifyProduct.tags.split(',').map(tag => tag.trim()) : [],
                    // Determine status from Shopify product fields
                    // Shopify uses published_at and published_scope to determine status
                    status: (() => {
                        if (shopifyProduct.status) {
                            // If status field exists, use it directly
                            return shopifyProduct.status;
                        } else if (shopifyProduct.published_at) {
                            // If published_at exists, product is active
                            return 'active';
                        } else {
                            // If no published_at, product is draft
                            return 'draft';
                        }
                    })(),
                    variants: shopifyProduct.variants.map((v, idx) => {
                        // Use weight from metafield if available, otherwise preserve existing or use variant weight
                        const existingVariant = existingProduct?.variants?.find(ev => ev.id === v.id.toString());
                        let variantWeight = 0;
                        let variantWeightUnit = 'kg';
                        
                        if (weightFromMetafield !== null) {
                            // Use weight from metafield (already in kg) - this takes priority
                            variantWeight = weightFromMetafield;
                            variantWeightUnit = 'kg';
                            // Log for first few products to verify it's working
                            if (importedCount + updatedCount < 5) {
                                logger.info(`  ✓ Variant ${v.id}: Using weight from metafield: ${variantWeight} kg`);
                            }
                        } else if (existingVariant?.weight) {
                            // Preserve existing weight if metafield not found
                            variantWeight = existingVariant.weight;
                            variantWeightUnit = existingVariant.weight_unit || 'kg';
                        } else if (v.weight) {
                            // Use variant weight from Shopify
                            variantWeight = v.weight;
                            variantWeightUnit = v.weight_unit || 'kg';
                        }
                        
                        return {
                            id: v.id.toString(),
                            title: v.title,
                            price: v.price,
                            sku: v.sku,
                            weight: variantWeight,
                            weight_unit: variantWeightUnit,
                            inventory_quantity: v.inventory_quantity || 0
                        };
                    }),
                    originalImages: shopifyProduct.images.map(img => ({
                        url: img.src,
                        altText: img.alt || shopifyProduct.title,
                        position: img.position,
                        shopifyId: img.id.toString(),
                        source: 'shopify'
                    })),
                    metafields: metafields, // Store metafields from GraphQL
                    shopifyCreatedAt: new Date(shopifyProduct.created_at),
                    shopifyUpdatedAt: new Date(shopifyProduct.updated_at),
                    lastSyncedAt: new Date()
                };

                let savedProduct;
                try {
                if (existingProduct) {
                        // Update existing product - use findOneAndUpdate to ensure all fields are updated
                        // Disable validators for metafields to avoid casting issues
                        // If force=true, always update; otherwise only update if product changed
                        const shouldUpdate = force || 
                            !existingProduct.shopifyUpdatedAt || 
                            existingProduct.shopifyUpdatedAt.getTime() !== new Date(shopifyProduct.updated_at).getTime();
                        
                        if (shouldUpdate) {
                            savedProduct = await Product.findOneAndUpdate(
                                { _id: existingProduct._id },
                                { $set: productData },
                                { new: true, runValidators: false }
                            );
                            statusUpdateCounts[productData.status] = (statusUpdateCounts[productData.status] || 0) + 1;
                    updatedCount++;
                        } else {
                            // Product hasn't changed, skip update
                            savedProduct = existingProduct;
                        }
                } else {
                    // Create new product
                        savedProduct = await Product.create(productData);
                        statusUpdateCounts[productData.status] = (statusUpdateCounts[productData.status] || 0) + 1;
                        importedCount++;
                    }
                } catch (saveError) {
                    // If save fails due to metafields or casting, try without validators
                    const isMetafieldError = saveError.message && (
                        saveError.message.includes('metafields') || 
                        saveError.message.includes('CastError') ||
                        saveError.message.includes('Cast to')
                    );
                    
                    if (isMetafieldError) {
                        logger.warn(`⚠️ Save error for ${shopifyProduct.title}, retrying without validators`);
                        
                        // Log the weight that should be saved
                        if (weightFromMetafield !== null && productData.variants && productData.variants.length > 0) {
                            logger.info(`  🔧 Attempting to save weight ${weightFromMetafield} kg for variant ${productData.variants[0].id}`);
                            logger.info(`  📦 ProductData variant weight before save: ${JSON.stringify(productData.variants[0].weight)} ${productData.variants[0].weight_unit}`);
                        }
                        
                        // Try saving without metafields first, then update metafields separately
                        const productDataWithoutMetafields = { ...productData };
                        delete productDataWithoutMetafields.metafields;
                        
                        if (existingProduct) {
                            // Update product without metafields first (this should save the weight)
                            logger.info(`  💾 Saving product ${shopifyProduct.title} without metafields (weight should be ${productDataWithoutMetafields.variants[0]?.weight} kg)`);
                            savedProduct = await Product.findOneAndUpdate(
                                { _id: existingProduct._id },
                                { $set: productDataWithoutMetafields },
                                { new: true, runValidators: false, setDefaultsOnInsert: true }
                            );
                            
                            // Now try to update metafields separately
                            // Convert metafields to plain objects to avoid casting issues
                            try {
                                const plainMetafields = metafields.map(m => ({
                                    id: String(m.id || ''),
                                    namespace: String(m.namespace || ''),
                                    key: String(m.key || ''),
                                    value: String(m.value || ''),
                                    type: String(m.type || ''),
                                    description: String(m.description || '')
                                }));
                                
                                await Product.findOneAndUpdate(
                                    { _id: existingProduct._id },
                                    { $set: { metafields: plainMetafields } },
                                    { runValidators: false }
                                );
                                logger.info(`  ✅ Metafields saved (${plainMetafields.length} fields)`);
                            } catch (metafieldError) {
                                logger.warn(`  ⚠️ Could not save metafields: ${metafieldError.message}`);
                            }
                        } else {
                            const newProduct = new Product(productDataWithoutMetafields);
                            savedProduct = await newProduct.save({ validateBeforeSave: false });
                            
                            // Try to add metafields separately
                            // Convert metafields to plain objects to avoid casting issues
                            try {
                                const plainMetafields = metafields.map(m => ({
                                    id: String(m.id || ''),
                                    namespace: String(m.namespace || ''),
                                    key: String(m.key || ''),
                                    value: String(m.value || ''),
                                    type: String(m.type || ''),
                                    description: String(m.description || '')
                                }));
                                
                                await Product.findOneAndUpdate(
                                    { _id: savedProduct._id },
                                    { $set: { metafields: plainMetafields } },
                                    { runValidators: false }
                                );
                                logger.info(`  ✅ Metafields saved (${plainMetafields.length} fields)`);
                            } catch (metafieldError) {
                                logger.warn(`  ⚠️ Could not save metafields: ${metafieldError.message}`);
                            }
                        }
                        
                        // Verify weight was saved
                        if (savedProduct && savedProduct.variants && savedProduct.variants.length > 0) {
                            const savedWeight = savedProduct.variants[0].weight;
                            logger.info(`  ✅ Saved product - Variant weight in DB: ${savedWeight} ${savedProduct.variants[0].weight_unit || 'kg'}`);
                        } else {
                            logger.error(`  ❌ ERROR: savedProduct or variants missing after save!`);
                        }
                        
                        if (existingProduct) {
                            updatedCount++;
                        } else {
                    importedCount++;
                        }
                        statusUpdateCounts[productData.status] = (statusUpdateCounts[productData.status] || 0) + 1;
                    } else {
                        throw saveError;
                    }
                }

            } catch (productError) {
                logger.error(`Error processing product ${shopifyProduct.id}:`, productError);
                continue;
            }
        }

        // Metafields are now included in the GraphQL response, so no separate fetching needed
        logger.info(`✅ Metafields included in GraphQL response for all products`);

        // Update shop usage
        await shopData.incrementUsage('products', importedCount + updatedCount);

        const totalTime = Math.round((Date.now() - importStartTime) / 1000);
        const totalMinutes = Math.floor(totalTime / 60);
        const totalSeconds = totalTime % 60;
        const timeString = totalMinutes > 0 ? `${totalMinutes}m ${totalSeconds}s` : `${totalSeconds}s`;
        
        logger.info(`✅ Product import completed: ${importedCount} new, ${updatedCount} updated (Total time: ${timeString})`);
        logger.info(`📊 Status breakdown: ${JSON.stringify(statusUpdateCounts)}`);

        res.json({
            success: true,
            imported: importedCount,
            updated: updatedCount,
            total: shopifyProducts.length,
            statusBreakdown: statusUpdateCounts,
            timeSeconds: totalTime,
            timeString: timeString
        });

    } catch (error) {
        logger.error('Product import error:', error);
        logger.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Failed to import products',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Get products with pagination and filtering
router.get('/', async (req, res) => {
    try {
        const { 
            shop, 
            page = 1, 
            limit = 100, // Reduced limit to prevent browser crashes with large datasets
            status,
            processed,
            search,
            hasImages,
            vendor
        } = req.query;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop parameter is required' });
        }

        const query = { shopDomain: shop };

        // Apply filters
        if (status && status !== 'all') {
            // Strictly match the status - exclude null/undefined
            query.status = status; // Filter by Shopify product status (active, draft, archived)
        }
        
        // Apply processed filter
        if (processed && processed !== 'all') {
            if (processed === 'processed') {
                query.shippingProcessed = true;
            } else if (processed === 'unprocessed') {
                query.shippingProcessed = { $ne: true };
            } else if (processed === 'failed') {
                // Products that are processed but have no shipping rates or all rates are 0
                query.shippingProcessed = true;
                query.$or = [
                    { shippingRates: { $exists: false } },
                    { shippingRates: { $size: 0 } },
                    { 
                        shippingRates: {
                            $not: {
                                $elemMatch: {
                                    $or: [
                                        { cheapPriceUSD: { $gt: 0 } },
                                        { expressPriceUSD: { $gt: 0 } }
                                    ]
                                }
                            }
                        }
                    }
                ];
            }
        }
        
        logger.info(`🔍 Filtering products: status=${status || 'all'}, processed=${processed || 'all'}`);

        // Handle search filter - need to combine with failed filter's $or if both exist
        if (search) {
            const searchOr = [
                { title: { $regex: search, $options: 'i' } },
                { vendor: { $regex: search, $options: 'i' } },
                { productType: { $regex: search, $options: 'i' } }
            ];
            
            // If failed filter already set $or, we need to combine them with $and
            if (query.$or) {
                query.$and = [
                    { $or: query.$or },
                    { $or: searchOr }
                ];
                delete query.$or;
            } else {
                query.$or = searchOr;
            }
        }

        if (hasImages !== undefined) {
            if (hasImages === 'true') {
                query.$or = [
                    { 'originalImages.0': { $exists: true } },
                    { 'discoveredImages.0': { $exists: true } },
                    { 'selectedImages.0': { $exists: true } }
                ];
            } else {
                query.originalImages = { $size: 0 };
                query.discoveredImages = { $size: 0 };
                query.selectedImages = { $size: 0 };
            }
        }

        if (vendor) {
            query.vendor = vendor;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [products, total] = await Promise.all([
            Product.find(query)
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Product.countDocuments(query)
        ]);

        // Optimize payload: Remove large arrays and objects to prevent browser crashes
        // Keep only essential fields for list view (full data can be fetched separately when needed)
        products.forEach(product => {
            // Optimize shipping rates: Remove large allRoutes arrays
            if (product.shippingRates && Array.isArray(product.shippingRates)) {
                product.shippingRates = product.shippingRates.map(rate => ({
                    addressId: rate.addressId,
                    countryName: rate.countryName,
                    countryCode: rate.countryCode,
                    province: rate.province,
                    postcode: rate.postcode,
                    calculatedAt: rate.calculatedAt,
                    cheapService: rate.cheapService,
                    expressService: rate.expressService,
                    cheapPriceUSD: rate.cheapPriceUSD,
                    expressPriceUSD: rate.expressPriceUSD,
                    assignedCode: rate.assignedCode,
                    assignedWeight: rate.assignedWeight,
                    normCheapPrice: rate.normCheapPrice,
                    normExpressPrice: rate.normExpressPrice,
                    adjDimensions: rate.adjDimensions,
                    rawWeight: rate.rawWeight,
                    adjWeight: rate.adjWeight,
                    // Exclude large arrays: allRoutes, cheapOption, expressOption
                    // These can be fetched separately when viewing product details
                    hasAllRoutes: !!rate.allRoutes,
                    routesCount: rate.allRoutes ? rate.allRoutes.length : 0
                }));
            }
            
            // Optimize images: Only keep first image URL for thumbnail, exclude analysisData
            if (product.originalImages && Array.isArray(product.originalImages)) {
                product.originalImages = product.originalImages.slice(0, 1).map(img => ({
                    url: img.url,
                    altText: img.altText,
                    position: img.position
                    // Exclude: analysisData, dimensions, fileSize, etc.
                }));
            }
            
            // Exclude discoveredImages and selectedImages from list view (not needed)
            delete product.discoveredImages;
            delete product.selectedImages;
            
            // Exclude large imageEnrichment processingSteps array
            if (product.imageEnrichment && product.imageEnrichment.processingSteps) {
                product.imageEnrichment = {
                    status: product.imageEnrichment.status,
                    lastProcessed: product.imageEnrichment.lastProcessed,
                    totalDiscovered: product.imageEnrichment.totalDiscovered,
                    totalSelected: product.imageEnrichment.totalSelected
                    // Exclude: processingSteps, searchTerms, aiGeneratedTerms
                };
            }
            
            // Exclude description if it's very long (keep first 200 chars)
            if (product.description && product.description.length > 200) {
                product.description = product.description.substring(0, 200) + '...';
            }
        });

        // Metafields are now stored in MongoDB during import, so they're already included in the products
        // Just ensure they're initialized if missing
        let metafieldsCount = 0;
        products.forEach(product => {
            if (!product.metafields) {
                product.metafields = [];
            } else {
                metafieldsCount += product.metafields.length;
            }
        });
        
        // Debug: Log metafields info for first product
        if (products.length > 0 && products[0].metafields && products[0].metafields.length > 0) {
            const firstProduct = products[0];
            const diameter = firstProduct.metafields.find(m => m.key === 'largest_diameter_raw');
            const height = firstProduct.metafields.find(m => m.key === 'height_raw');
            logger.info(`📦 Sample product "${firstProduct.title}": ${firstProduct.metafields.length} metafields, diameter: ${diameter ? diameter.value : 'N/A'}, height: ${height ? height.value : 'N/A'}`);
        } else if (products.length > 0) {
            logger.warn(`⚠️ First product "${products[0].title}" has no metafields - products may need to be re-imported`);
        }
        
        logger.info(`📊 Returning ${products.length} products with ${metafieldsCount} total metafields`);

        // Log what we're returning
        if (status && status !== 'all') {
            const statusCounts = {};
            products.forEach(p => {
                const s = p.status || 'null';
                statusCounts[s] = (statusCounts[s] || 0) + 1;
            });
            logger.info(`📊 Returning ${products.length} products. Status breakdown: ${JSON.stringify(statusCounts)}`);
        }

        res.json({
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
                hasNext: skip + products.length < total,
                hasPrev: parseInt(page) > 1
            }
        });

    } catch (error) {
        logger.error('Get products error:', error);
        res.status(500).json({ error: 'Failed to get products' });
    }
});

// Check which products are already processed (for bulk operations)
// IMPORTANT: This route must come BEFORE /ids and /:productId to avoid route conflicts
router.post('/check-processed', async (req, res) => {
    try {
        const { shop, productIds } = req.body;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop parameter is required' });
        }
        
        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ error: 'productIds array is required' });
        }

        const shopData = await Shop.findOne({ domain: shop });
        if (!shopData || !shopData.accessToken) {
            return res.status(404).json({ error: 'Shop not found or not authenticated' });
        }

        // Fetch products and check their processed status
        const products = await Product.find({
            _id: { $in: productIds },
            shopDomain: shop
        }).select('_id title shippingProcessed shippingRates').lean();

        const processedProducts = products
            .filter(p => p.shippingProcessed)
            .map(p => ({
                id: p._id.toString(),
                title: p.title || p._id.toString(),
                ratesCount: p.shippingRates?.length || 0
            }));

        logger.info(`✅ Found ${processedProducts.length} already-processed products out of ${productIds.length} total`);
        res.json({ processedProducts, total: productIds.length });
    } catch (error) {
        logger.error('Check processed error:', error);
        res.status(500).json({ error: 'Failed to check processed status' });
    }
});

// Get all product IDs matching filter (for bulk operations)
// IMPORTANT: This route must come BEFORE /:productId to avoid route conflicts
router.get('/ids', async (req, res) => {
    try {
        const { shop, status, processed, search } = req.query;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop parameter is required' });
        }

        const shopData = await Shop.findOne({ domain: shop });
        if (!shopData || !shopData.accessToken) {
            return res.status(404).json({ error: 'Shop not found or not authenticated' });
        }

        const query = { shopDomain: shop };

        // Apply filters (same logic as /api/products)
        if (status && status !== 'all') {
            query.status = status;
        }
        
        // Apply processed filter
        if (processed && processed !== 'all') {
            if (processed === 'processed') {
                query.shippingProcessed = true;
            } else if (processed === 'unprocessed') {
                query.shippingProcessed = { $ne: true };
            } else if (processed === 'failed') {
                // Products that are processed but have no shipping rates or all rates are 0
                query.shippingProcessed = true;
                query.$or = [
                    { shippingRates: { $exists: false } },
                    { shippingRates: { $size: 0 } },
                    { 
                        shippingRates: {
                            $not: {
                                $elemMatch: {
                                    $or: [
                                        { cheapPriceUSD: { $gt: 0 } },
                                        { expressPriceUSD: { $gt: 0 } }
                                    ]
                                }
                            }
                        }
                    }
                ];
            }
        }

        if (search) {
            const searchOr = [
                { title: { $regex: search, $options: 'i' } },
                { vendor: { $regex: search, $options: 'i' } },
                { productType: { $regex: search, $options: 'i' } }
            ];
            
            // If failed filter already set $or, we need to combine them with $and
            if (query.$or) {
                query.$and = [
                    { $or: query.$or },
                    { $or: searchOr }
                ];
                delete query.$or;
            } else {
                query.$or = searchOr;
            }
        }

        logger.info(`🔍 Fetching product IDs: status=${status || 'all'}, processed=${processed || 'all'}`);

        // Only fetch IDs (more efficient)
        const products = await Product.find(query).select('_id').lean();
        const productIds = products.map(p => p._id.toString());

        logger.info(`✅ Found ${productIds.length} product IDs matching filter`);

        res.json({
            productIds: productIds,
            count: productIds.length
        });
    } catch (error) {
        logger.error('Error fetching product IDs:', error);
        res.status(500).json({ error: 'Failed to fetch product IDs', details: error.message });
    }
});

// Get shipping rates for a product (with full allRoutes data)
router.get('/:productId/shipping-rates', async (req, res) => {
    try {
        const { shop } = req.query;
        const { productId } = req.params;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop parameter is required' });
        }

        const product = await Product.findOne({
            _id: productId,
            shopDomain: shop
        }).select('shippingRates title').lean();

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({
            productId: productId,
            title: product.title,
            shippingRates: product.shippingRates || []
        });

    } catch (error) {
        logger.error('Get shipping rates error:', error);
        res.status(500).json({ error: 'Failed to get shipping rates' });
    }
});

// Get single product
router.get('/:productId', async (req, res) => {
    try {
        const { shop } = req.query;
        const { productId } = req.params;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop parameter is required' });
        }

        const product = await Product.findOne({
            _id: productId,
            shopDomain: shop
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(product);

    } catch (error) {
        logger.error('Get product error:', error);
        res.status(500).json({ error: 'Failed to get product' });
    }
});

// Update product
router.put('/:productId', async (req, res) => {
    try {
        const { shop } = req.query;
        const { productId } = req.params;
        const updates = req.body;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop parameter is required' });
        }

        const product = await Product.findOneAndUpdate(
            { _id: productId, shopDomain: shop },
            updates,
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        logger.info(`📝 Product updated: ${product.title}`);
        res.json({ success: true, product });

    } catch (error) {
        logger.error('Update product error:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// Delete product
router.delete('/:productId', async (req, res) => {
    try {
        const { shop } = req.query;
        const { productId } = req.params;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop parameter is required' });
        }

        const product = await Product.findOneAndDelete({
            _id: productId,
            shopDomain: shop
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        logger.info(`🗑️ Product deleted: ${product.title}`);
        res.json({ success: true, message: 'Product deleted successfully' });

    } catch (error) {
        logger.error('Delete product error:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// Get product statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const { shop } = req.query;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop parameter is required' });
        }

        const stats = await Product.aggregate([
            { $match: { shopDomain: shop } },
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    withOriginalImages: {
                        $sum: {
                            $cond: [{ $gt: [{ $size: '$originalImages' }, 0] }, 1, 0]
                        }
                    },
                    withDiscoveredImages: {
                        $sum: {
                            $cond: [{ $gt: [{ $size: '$discoveredImages' }, 0] }, 1, 0]
                        }
                    },
                    completed: {
                        $sum: {
                            $cond: [{ $eq: ['$imageEnrichment.status', 'completed'] }, 1, 0]
                        }
                    },
                    pending: {
                        $sum: {
                            $cond: [{ $eq: ['$imageEnrichment.status', 'pending'] }, 1, 0]
                        }
                    },
                    processing: {
                        $sum: {
                            $cond: [
                                { 
                                    $in: ['$imageEnrichment.status', ['analyzing', 'searching', 'selecting']] 
                                }, 1, 0
                            ]
                        }
                    },
                    failed: {
                        $sum: {
                            $cond: [{ $eq: ['$imageEnrichment.status', 'failed'] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        const result = stats[0] || {
            totalProducts: 0,
            withOriginalImages: 0,
            withDiscoveredImages: 0,
            completed: 0,
            pending: 0,
            processing: 0,
            failed: 0
        };

        res.json(result);

    } catch (error) {
        logger.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

module.exports = router;
