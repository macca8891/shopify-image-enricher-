const express = require('express');
const crypto = require('crypto');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Verify webhook HMAC signature
 */
function verifyWebhook(req, res, next) {
    try {
        const hmac = req.get('X-Shopify-Hmac-Sha256');
        const body = req.rawBody; // Need to capture raw body in server.js
        
        const hash = crypto
            .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
            .update(body, 'utf8')
            .digest('base64');
        
        if (hash === hmac) {
            next();
        } else {
            logger.error('Webhook verification failed');
            res.status(401).send('Unauthorized');
        }
    } catch (error) {
        logger.error('Webhook verification error:', error);
        res.status(500).send('Error');
    }
}

/**
 * GDPR REQUIRED: Customer data request
 * Shop owner wants to see what data we have on a customer
 * Must respond within 30 days
 */
router.post('/customers/data_request', verifyWebhook, async (req, res) => {
    try {
        const { shop_domain, customer, orders_requested } = req.body;
        
        logger.info(`📋 Customer data request received for shop: ${shop_domain}`);
        
        // In this app, we don't store customer data, only shop and product data
        const responseData = {
            message: 'No customer-specific data stored',
            shop: shop_domain,
            customer_id: customer?.id,
            note: 'This app only processes product images and does not store personal customer information'
        };
        
        // In production, you should:
        // 1. Gather all customer data from your database
        // 2. Email it to the shop owner
        // 3. Log the request for compliance
        
        logger.info(`✅ Customer data request processed for ${shop_domain}`);
        
        res.status(200).json(responseData);
    } catch (error) {
        logger.error('Customer data request error:', error);
        res.status(500).send('Error processing request');
    }
});

/**
 * GDPR REQUIRED: Customer redaction
 * Customer requested their data to be deleted
 * Must comply within 48 hours
 */
router.post('/customers/redact', verifyWebhook, async (req, res) => {
    try {
        const { shop_domain, customer } = req.body;
        
        logger.info(`🗑️ Customer redaction request received for shop: ${shop_domain}`);
        
        // In this app, we don't store customer data
        // If you add customer-specific features in the future, delete data here
        
        // Example if you stored customer data:
        // await CustomerData.deleteMany({ 
        //     shopDomain: shop_domain, 
        //     customerId: customer.id 
        // });
        
        logger.info(`✅ Customer redaction completed for ${shop_domain}`);
        
        res.status(200).send();
    } catch (error) {
        logger.error('Customer redaction error:', error);
        res.status(500).send('Error processing redaction');
    }
});

/**
 * GDPR REQUIRED: Shop redaction
 * Shop uninstalled the app, delete all their data
 * Must comply within 48 hours
 */
router.post('/shop/redact', verifyWebhook, async (req, res) => {
    try {
        const { shop_domain } = req.body;
        
        logger.info(`🗑️ Shop redaction request received: ${shop_domain}`);
        
        // Delete all shop data
        await Shop.findOneAndDelete({ domain: shop_domain });
        logger.info(`Deleted shop: ${shop_domain}`);
        
        // Delete all products for this shop
        const result = await Product.deleteMany({ shopDomain: shop_domain });
        logger.info(`Deleted ${result.deletedCount} products for ${shop_domain}`);
        
        // Delete any other shop-specific data
        // Add more deletions as needed
        
        logger.info(`✅ Shop redaction completed for ${shop_domain}`);
        
        res.status(200).send();
    } catch (error) {
        logger.error('Shop redaction error:', error);
        res.status(500).send('Error processing shop redaction');
    }
});

/**
 * App uninstalled webhook
 * Triggered when merchant uninstalls the app
 */
router.post('/app/uninstalled', verifyWebhook, async (req, res) => {
    try {
        const { shop_domain } = req.body;
        
        logger.info(`📤 App uninstalled: ${shop_domain}`);
        
        // Mark shop as inactive but don't delete yet
        // Shop data will be deleted via shop/redact webhook
        await Shop.findOneAndUpdate(
            { domain: shop_domain },
            { isActive: false, uninstalledAt: new Date() }
        );
        
        logger.info(`✅ App uninstalled processed for ${shop_domain}`);
        
        res.status(200).send();
    } catch (error) {
        logger.error('App uninstalled error:', error);
        res.status(500).send('Error');
    }
});

/**
 * Products update webhook
 * Triggered when a product is updated in Shopify
 */
router.post('/products/update', verifyWebhook, async (req, res) => {
    try {
        const product = req.body;
        const shopDomain = req.get('X-Shopify-Shop-Domain');
        
        logger.info(`🔄 Product update webhook: ${product.title} from ${shopDomain}`);
        
        // Update product in our database
        await Product.findOneAndUpdate(
            { shopifyId: product.id.toString(), shopDomain },
            {
                title: product.title,
                handle: product.handle,
                description: product.body_html,
                vendor: product.vendor,
                productType: product.product_type,
                tags: product.tags ? product.tags.split(',').map(tag => tag.trim()) : [],
                shopifyUpdatedAt: new Date(product.updated_at),
                lastSyncedAt: new Date()
            }
        );
        
        res.status(200).send();
    } catch (error) {
        logger.error('Product update webhook error:', error);
        res.status(500).send('Error');
    }
});

/**
 * Products delete webhook
 * Triggered when a product is deleted in Shopify
 */
router.post('/products/delete', verifyWebhook, async (req, res) => {
    try {
        const { id } = req.body;
        const shopDomain = req.get('X-Shopify-Shop-Domain');
        
        logger.info(`🗑️ Product delete webhook: ${id} from ${shopDomain}`);
        
        // Delete product from our database
        await Product.findOneAndDelete({
            shopifyId: id.toString(),
            shopDomain
        });
        
        res.status(200).send();
    } catch (error) {
        logger.error('Product delete webhook error:', error);
        res.status(500).send('Error');
    }
});

module.exports = router;





