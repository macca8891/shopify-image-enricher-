const express = require('express');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const ImageAnalysisService = require('../services/ImageAnalysisService');
const ImageSearchService = require('../services/ImageSearchService');
const logger = require('../utils/logger');

const router = express.Router();

// Initialize services
const imageAnalysis = new ImageAnalysisService();
const imageSearch = new ImageSearchService();

// Analyze product images
router.post('/analyze/:productId', async (req, res) => {
    try {
        const { shop } = req.query;
        const { productId } = req.params;
        const { options = {} } = req.body;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop parameter is required' });
        }

        const shopData = await Shop.findOne({ domain: shop });
        if (!shopData || !shopData.canMakeAPICall()) {
            return res.status(403).json({ error: 'API call limit exceeded' });
        }

        const product = await Product.findOne({
            _id: productId,
            shopDomain: shop
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Update status to analyzing
        await product.updateEnrichmentStatus('analyzing', 'analyze');

        logger.info(`🔍 Analyzing images for product: ${product.title}`);

        const analysisResults = [];
        const imagesToAnalyze = [
            ...product.originalImages,
            ...product.discoveredImages
        ];

        if (imagesToAnalyze.length === 0) {
            return res.status(400).json({ error: 'No images to analyze' });
        }

        // Analyze images
        for (const image of imagesToAnalyze) {
            try {
                const analysis = await imageAnalysis.analyzeImage(image.url, {
                    ...shopData.settings.aiAnalysis,
                    ...options
                });

                // Update image with analysis data
                image.analysisData = analysis;
                
                // Assess suitability for e-commerce
                const suitability = imageAnalysis.assessImageSuitability(analysis);
                image.analysisData.suitability = suitability;

                analysisResults.push({
                    imageUrl: image.url,
                    analysis,
                    suitability
                });

                // Increment API usage
                await shopData.incrementUsage('api_calls', 1);
                await shopData.incrementUsage('images_analyzed', 1);

            } catch (analysisError) {
                logger.error(`Failed to analyze image ${image.url}:`, analysisError);
                analysisResults.push({
                    imageUrl: image.url,
                    error: analysisError.message
                });
            }
        }

        // Save updated product
        await product.save();

        // Update status to completed
        await product.updateEnrichmentStatus('completed', 'analyze');

        logger.info(`✅ Image analysis completed for ${product.title}: ${analysisResults.length} images analyzed`);

        res.json({
            success: true,
            productId: product._id,
            totalAnalyzed: analysisResults.length,
            results: analysisResults
        });

    } catch (error) {
        logger.error('Image analysis error:', error);
        
        // Update product status to failed
        try {
            const product = await Product.findById(req.params.productId);
            if (product) {
                await product.updateEnrichmentStatus('failed', 'analyze', error.message);
            }
        } catch (statusError) {
            logger.error('Failed to update product status:', statusError);
        }

        res.status(500).json({ error: 'Image analysis failed' });
    }
});

// Search for product images
router.post('/search/:productId', async (req, res) => {
    try {
        const { shop } = req.query;
        const { productId } = req.params;
        const { options = {} } = req.body;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop parameter is required' });
        }

        const shopData = await Shop.findOne({ domain: shop });
        if (!shopData || !shopData.canMakeAPICall()) {
            return res.status(403).json({ error: 'API call limit exceeded' });
        }

        const product = await Product.findOne({
            _id: productId,
            shopDomain: shop
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Update status to searching
        await product.updateEnrichmentStatus('searching', 'search');

        logger.info(`🔍 Searching for images for product: ${product.title}`);

        // Prepare product data for search
        const productData = {
            title: product.title,
            vendor: product.vendor,
            productType: product.productType,
            description: product.description,
            tags: product.tags
        };

        // Search for images
        const searchResult = await imageSearch.searchProductImages(productData, {
            ...shopData.settings.imageSearch,
            ...options
        });

        if (!searchResult.success) {
            await product.updateEnrichmentStatus('failed', 'search', searchResult.error);
            return res.status(500).json({ error: searchResult.error });
        }

        // Add discovered images to product
        product.discoveredImages = searchResult.images.map(img => ({
            url: img.url,
            thumbnailUrl: img.thumbnailUrl,
            altText: img.title,
            source: 'google_search',
            dimensions: img.dimensions,
            fileSize: img.fileSize,
            mimeType: img.mimeType,
            searchTerm: img.searchTerm,
            isSelected: false
        }));

        // Update enrichment data
        product.imageEnrichment.searchTerms = searchResult.searchTerms;
        product.imageEnrichment.aiGeneratedTerms = searchResult.aiGeneratedTerms;
        product.imageEnrichment.totalDiscovered = searchResult.totalFound;

        await product.save();

        // Update shop usage
        await shopData.incrementUsage('api_calls', searchResult.searchTerms.length);
        await shopData.incrementUsage('images_discovered', searchResult.totalFound);

        // Update status to completed
        await product.updateEnrichmentStatus('completed', 'search');

        logger.info(`✅ Image search completed for ${product.title}: ${searchResult.totalFound} images found`);

        res.json({
            success: true,
            productId: product._id,
            searchTerms: searchResult.searchTerms,
            aiGeneratedTerms: searchResult.aiGeneratedTerms,
            totalFound: searchResult.totalFound,
            images: searchResult.images
        });

    } catch (error) {
        logger.error('Image search error:', error);
        
        // Update product status to failed
        try {
            const product = await Product.findById(req.params.productId);
            if (product) {
                await product.updateEnrichmentStatus('failed', 'search', error.message);
            }
        } catch (statusError) {
            logger.error('Failed to update product status:', statusError);
        }

        res.status(500).json({ error: 'Image search failed' });
    }
});

// Select images for a product
router.post('/select/:productId', async (req, res) => {
    try {
        const { shop } = req.query;
        const { productId } = req.params;
        const { imageUrls } = req.body;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop parameter is required' });
        }

        if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            return res.status(400).json({ error: 'Image URLs array is required' });
        }

        const product = await Product.findOne({
            _id: productId,
            shopDomain: shop
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Update status to selecting
        await product.updateEnrichmentStatus('selecting', 'select');

        logger.info(`🎯 Selecting ${imageUrls.length} images for product: ${product.title}`);

        // Find and mark selected images
        const selectedImages = [];
        
        for (const imageUrl of imageUrls) {
            // Look for the image in discovered images
            const discoveredImage = product.discoveredImages.find(img => img.url === imageUrl);
            if (discoveredImage) {
                discoveredImage.isSelected = true;
                selectedImages.push(discoveredImage);
            }
            
            // Look for the image in original images
            const originalImage = product.originalImages.find(img => img.url === imageUrl);
            if (originalImage) {
                originalImage.isSelected = true;
                selectedImages.push(originalImage);
            }
        }

        // Update selected images array
        product.selectedImages = selectedImages;
        product.imageEnrichment.totalSelected = selectedImages.length;

        await product.save();

        // Update status to completed
        await product.updateEnrichmentStatus('completed', 'select');

        logger.info(`✅ Image selection completed for ${product.title}: ${selectedImages.length} images selected`);

        res.json({
            success: true,
            productId: product._id,
            selectedCount: selectedImages.length,
            selectedImages: selectedImages
        });

    } catch (error) {
        logger.error('Image selection error:', error);
        
        // Update product status to failed
        try {
            const product = await Product.findById(req.params.productId);
            if (product) {
                await product.updateEnrichmentStatus('failed', 'select', error.message);
            }
        } catch (statusError) {
            logger.error('Failed to update product status:', statusError);
        }

        res.status(500).json({ error: 'Image selection failed' });
    }
});

// Process complete workflow for a product
router.post('/process/:productId', async (req, res) => {
    try {
        const { shop } = req.query;
        const { productId } = req.params;
        const { 
            analyze = true, 
            search = true, 
            autoSelect = false,
            maxImages = 5,
            options = {} 
        } = req.body;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop parameter is required' });
        }

        const shopData = await Shop.findOne({ domain: shop });
        if (!shopData || !shopData.canMakeAPICall()) {
            return res.status(403).json({ error: 'API call limit exceeded' });
        }

        const product = await Product.findOne({
            _id: productId,
            shopDomain: shop
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        logger.info(`🚀 Starting complete image processing for product: ${product.title}`);

        const results = {
            productId: product._id,
            steps: [],
            success: true
        };

        // Step 1: Analyze existing images (if requested and images exist)
        if (analyze && (product.originalImages.length > 0 || product.discoveredImages.length > 0)) {
            try {
                const analysisResponse = await fetch(`${req.protocol}://${req.get('host')}/api/images/analyze/${productId}?shop=${shop}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ options: options.analysis || {} })
                });
                
                if (analysisResponse.ok) {
                    const analysisResult = await analysisResponse.json();
                    results.steps.push({ step: 'analyze', success: true, data: analysisResult });
                } else {
                    throw new Error('Analysis failed');
                }
            } catch (analysisError) {
                results.steps.push({ step: 'analyze', success: false, error: analysisError.message });
                logger.warn(`Analysis failed for ${product.title}:`, analysisError);
            }
        }

        // Step 2: Search for new images (if requested)
        if (search) {
            try {
                const searchResponse = await fetch(`${req.protocol}://${req.get('host')}/api/images/search/${productId}?shop=${shop}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ options: options.search || {} })
                });
                
                if (searchResponse.ok) {
                    const searchResult = await searchResponse.json();
                    results.steps.push({ step: 'search', success: true, data: searchResult });
                } else {
                    throw new Error('Search failed');
                }
            } catch (searchError) {
                results.steps.push({ step: 'search', success: false, error: searchError.message });
                logger.warn(`Search failed for ${product.title}:`, searchError);
            }
        }

        // Step 3: Auto-select images (if requested)
        if (autoSelect) {
            try {
                // Refresh product data
                const updatedProduct = await Product.findById(productId);
                
                // Select best images based on analysis scores and relevance
                const allImages = [
                    ...updatedProduct.originalImages,
                    ...updatedProduct.discoveredImages
                ];

                const rankedImages = allImages
                    .filter(img => img.analysisData && img.analysisData.suitability?.suitable !== false)
                    .sort((a, b) => {
                        const scoreA = (a.analysisData?.suitability?.score || 0) + (a.relevanceScore || 0);
                        const scoreB = (b.analysisData?.suitability?.score || 0) + (b.relevanceScore || 0);
                        return scoreB - scoreA;
                    })
                    .slice(0, maxImages);

                if (rankedImages.length > 0) {
                    const selectResponse = await fetch(`${req.protocol}://${req.get('host')}/api/images/select/${productId}?shop=${shop}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageUrls: rankedImages.map(img => img.url) })
                    });
                    
                    if (selectResponse.ok) {
                        const selectResult = await selectResponse.json();
                        results.steps.push({ step: 'select', success: true, data: selectResult });
                    } else {
                        throw new Error('Auto-selection failed');
                    }
                } else {
                    results.steps.push({ step: 'select', success: false, error: 'No suitable images found for auto-selection' });
                }
            } catch (selectError) {
                results.steps.push({ step: 'select', success: false, error: selectError.message });
                logger.warn(`Auto-selection failed for ${product.title}:`, selectError);
            }
        }

        // Update final status
        const hasFailures = results.steps.some(step => !step.success);
        await product.updateEnrichmentStatus(hasFailures ? 'failed' : 'completed');

        logger.info(`${hasFailures ? '⚠️' : '✅'} Complete image processing ${hasFailures ? 'completed with errors' : 'successful'} for ${product.title}`);

        res.json(results);

    } catch (error) {
        logger.error('Complete image processing error:', error);
        res.status(500).json({ error: 'Complete image processing failed' });
    }
});

// Batch process multiple products
router.post('/batch-process', async (req, res) => {
    try {
        const { shop } = req.query;
        const { productIds, options = {} } = req.body;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop parameter is required' });
        }

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ error: 'Product IDs array is required' });
        }

        logger.info(`🔄 Starting batch processing for ${productIds.length} products`);

        const results = [];
        
        // Process products one by one to avoid overwhelming APIs
        for (const productId of productIds) {
            try {
                const processResponse = await fetch(`${req.protocol}://${req.get('host')}/api/images/process/${productId}?shop=${shop}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(options)
                });
                
                if (processResponse.ok) {
                    const result = await processResponse.json();
                    results.push({ productId, success: true, ...result });
                } else {
                    const error = await processResponse.text();
                    results.push({ productId, success: false, error });
                }
                
                // Small delay between products
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                results.push({ productId, success: false, error: error.message });
            }
        }

        const successCount = results.filter(r => r.success).length;
        
        logger.info(`✅ Batch processing completed: ${successCount}/${productIds.length} successful`);

        res.json({
            success: true,
            total: productIds.length,
            successful: successCount,
            failed: productIds.length - successCount,
            results
        });

    } catch (error) {
        logger.error('Batch processing error:', error);
        res.status(500).json({ error: 'Batch processing failed' });
    }
});

module.exports = router;
