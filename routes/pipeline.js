const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for CSV uploads
const upload = multer({
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Upload CSV and start bulk processing
router.post('/bulk-process', upload.single('csvFile'), async (req, res) => {
    try {
        const { shop } = req.query;
        const { 
            dryRun = false,
            limit,
            concurrency,
            bgColor,
            targetSize,
            watermarkEnabled,
            watermarkText,
            watermarkOpacity,
            watermarkScale,
            replaceStrategy
        } = req.body;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop parameter is required' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'CSV file is required' });
        }

        const shopData = await Shop.findOne({ domain: shop });
        if (!shopData || !shopData.accessToken) {
            return res.status(404).json({ error: 'Shop not found or not authenticated' });
        }

        if (!shopData.settings.imagePipeline.enabled) {
            return res.status(400).json({ error: 'Image pipeline is not enabled for this shop' });
        }

        if (!shopData.settings.imagePipeline.removeBgApiKey) {
            return res.status(400).json({ error: 'Remove.bg API key is not configured' });
        }

        logger.info(`🚀 Starting bulk image processing for shop: ${shop}`);

        // Create processing directory
        const processId = `bulk_${Date.now()}`;
        const processDir = path.join(__dirname, '..', 'image-pipeline', 'processing', processId);
        await fs.mkdir(processDir, { recursive: true });

        // Move uploaded CSV to processing directory
        const csvPath = path.join(processDir, 'input.csv');
        await fs.rename(req.file.path, csvPath);

        // Create output directory
        const outputDir = path.join(processDir, 'output');
        await fs.mkdir(outputDir, { recursive: true });

        // Create .env file for this processing job
        const envContent = [
            `REMOVE_BG_API_KEY=${shopData.settings.imagePipeline.removeBgApiKey}`,
            `SHOP_DOMAIN=${shop}`,
            `SHOP_ADMIN_TOKEN=${shopData.accessToken}`,
            `DEFAULT_BG_COLOR=${bgColor || shopData.settings.imagePipeline.defaultBgColor}`,
            `DEFAULT_TARGET_SIZE=${targetSize || shopData.settings.imagePipeline.defaultTargetSize}`,
            `DEFAULT_CONCURRENCY=${concurrency || shopData.settings.imagePipeline.defaultConcurrency}`,
            `DEFAULT_MAX_RETRIES=5`
        ].join('\n');

        await fs.writeFile(path.join(processDir, '.env'), envContent);

        // Prepare Python command
        const pythonScript = path.join(__dirname, '..', 'image-pipeline', 'process_images.py');
        const args = [
            pythonScript,
            '--input', csvPath,
            '--outdir', outputDir,
            '--target', String(targetSize || shopData.settings.imagePipeline.defaultTargetSize),
            '--bg-color', bgColor || shopData.settings.imagePipeline.defaultBgColor,
            '--concurrency', String(concurrency || shopData.settings.imagePipeline.defaultConcurrency)
        ];

        // Add optional parameters
        if (dryRun === 'true') {
            args.push('--dry-run');
        }
        if (limit) {
            args.push('--limit', String(limit));
        }
        if (watermarkEnabled === 'true') {
            if (shopData.settings.imagePipeline.watermarkImage) {
                args.push('--watermark-img', shopData.settings.imagePipeline.watermarkImage);
            }
            if (watermarkText) {
                args.push('--watermark-text', watermarkText);
            }
            args.push('--watermark-opacity', String(watermarkOpacity || shopData.settings.imagePipeline.watermarkOpacity));
            args.push('--watermark-scale', String(watermarkScale || shopData.settings.imagePipeline.watermarkScale));
        }

        // Start Python process
        const pythonProcess = spawn('python3', args, {
            cwd: path.join(__dirname, '..', 'image-pipeline'),
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
            logger.info(`Python stdout: ${data.toString().trim()}`);
        });

        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
            logger.error(`Python stderr: ${data.toString().trim()}`);
        });

        pythonProcess.on('close', async (code) => {
            try {
                // Read results
                let results = {
                    success: code === 0,
                    processId,
                    stdout,
                    stderr,
                    exitCode: code,
                    completedAt: new Date()
                };

                // Try to read error log if it exists
                try {
                    const errorLogPath = path.join(outputDir, 'errors.csv');
                    const errorLogExists = await fs.access(errorLogPath).then(() => true).catch(() => false);
                    if (errorLogExists) {
                        const errorLog = await fs.readFile(errorLogPath, 'utf8');
                        results.errorLog = errorLog;
                    }
                } catch (errorLogError) {
                    logger.warn('Could not read error log:', errorLogError);
                }

                // Count processed files
                try {
                    const outputFiles = await fs.readdir(outputDir);
                    const imageFiles = outputFiles.filter(file => file.endsWith('.png'));
                    results.processedImages = imageFiles.length;
                    results.outputFiles = imageFiles;
                } catch (dirError) {
                    logger.warn('Could not read output directory:', dirError);
                }

                // Update shop usage
                if (code === 0) {
                    await shopData.incrementUsage('products', results.processedImages || 0);
                }

                logger.info(`✅ Bulk processing completed for ${shop}: ${results.processedImages || 0} images processed`);

                // Store results in a file for later retrieval
                await fs.writeFile(
                    path.join(processDir, 'results.json'),
                    JSON.stringify(results, null, 2)
                );

            } catch (cleanupError) {
                logger.error('Error during cleanup:', cleanupError);
            }
        });

        // Return immediately with process ID
        res.json({
            success: true,
            processId,
            message: 'Bulk processing started',
            status: 'processing'
        });

    } catch (error) {
        logger.error('Bulk processing error:', error);
        res.status(500).json({ error: 'Failed to start bulk processing' });
    }
});

// Get processing status
router.get('/bulk-process/:processId', async (req, res) => {
    try {
        const { shop } = req.query;
        const { processId } = req.params;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop parameter is required' });
        }

        const shopData = await Shop.findOne({ domain: shop });
        if (!shopData) {
            return res.status(404).json({ error: 'Shop not found' });
        }

        const processDir = path.join(__dirname, '..', 'image-pipeline', 'processing', processId);
        const resultsPath = path.join(processDir, 'results.json');

        try {
            const results = JSON.parse(await fs.readFile(resultsPath, 'utf8'));
            res.json(results);
        } catch (fileError) {
            // Process might still be running
            res.json({
                processId,
                status: 'processing',
                message: 'Process is still running'
            });
        }

    } catch (error) {
        logger.error('Get processing status error:', error);
        res.status(500).json({ error: 'Failed to get processing status' });
    }
});

// Get pipeline settings
router.get('/pipeline-settings', async (req, res) => {
    try {
        const { shop } = req.query;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop parameter is required' });
        }

        const shopData = await Shop.findOne({ domain: shop });
        if (!shopData) {
            return res.status(404).json({ error: 'Shop not found' });
        }

        res.json({
            success: true,
            settings: shopData.settings.imagePipeline
        });

    } catch (error) {
        logger.error('Get pipeline settings error:', error);
        res.status(500).json({ error: 'Failed to get pipeline settings' });
    }
});

// Update pipeline settings
router.put('/pipeline-settings', async (req, res) => {
    try {
        const { shop } = req.query;
        const settings = req.body;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop parameter is required' });
        }

        const shopData = await Shop.findOne({ domain: shop });
        if (!shopData) {
            return res.status(404).json({ error: 'Shop not found' });
        }

        // Update pipeline settings
        Object.assign(shopData.settings.imagePipeline, settings);
        await shopData.save();

        logger.info(`📝 Pipeline settings updated for shop: ${shop}`);

        res.json({
            success: true,
            settings: shopData.settings.imagePipeline
        });

    } catch (error) {
        logger.error('Update pipeline settings error:', error);
        res.status(500).json({ error: 'Failed to update pipeline settings' });
    }
});

// Generate sample CSV for products
router.post('/generate-sample-csv', async (req, res) => {
    try {
        const { shop } = req.query;
        const { productIds, includeAll = false } = req.body;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop parameter is required' });
        }

        const shopData = await Shop.findOne({ domain: shop });
        if (!shopData) {
            return res.status(404).json({ error: 'Shop not found' });
        }

        let query = { shopDomain: shop };
        
        if (!includeAll && productIds && productIds.length > 0) {
            query._id = { $in: productIds };
        }

        const products = await Product.find(query)
            .select('sku title handle shopifyId originalImages variants')
            .limit(100)
            .lean();

        // Generate CSV content
        const csvHeader = 'sku,image_url,image_path,handle,product_id,overlay_text,overlay_logo_path,bg_color,target,text_position,watermark_img,watermark_opacity,replace_strategy,alt_text,is_featured,variant_sku\n';
        
        let csvContent = csvHeader;
        
        for (const product of products) {
            const sku = product.sku || product.title.replace(/\s+/g, '_').toUpperCase();
            const handle = product.handle;
            const productId = product.shopifyId;
            const overlayText = product.title;
            const altText = product.title;
            
            // Use first image if available
            const firstImage = product.originalImages && product.originalImages.length > 0 
                ? product.originalImages[0] 
                : null;
            
            const imageUrl = firstImage ? firstImage.url : '';
            
            // Use first variant if available
            const firstVariant = product.variants && product.variants.length > 0 
                ? product.variants[0] 
                : null;
            
            const variantSku = firstVariant ? firstVariant.sku : '';
            
            const csvRow = [
                sku,
                imageUrl,
                '', // image_path
                handle,
                productId,
                overlayText,
                '', // overlay_logo_path
                shopData.settings.imagePipeline.defaultBgColor,
                shopData.settings.imagePipeline.defaultTargetSize,
                'bottom-left', // text_position
                '', // watermark_img
                shopData.settings.imagePipeline.watermarkOpacity,
                shopData.settings.imagePipeline.replaceStrategy,
                altText,
                'true', // is_featured
                variantSku
            ].map(field => `"${field}"`).join(',') + '\n';
            
            csvContent += csvRow;
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="bulk_process_sample.csv"');
        res.send(csvContent);

    } catch (error) {
        logger.error('Generate sample CSV error:', error);
        res.status(500).json({ error: 'Failed to generate sample CSV' });
    }
});

module.exports = router;







