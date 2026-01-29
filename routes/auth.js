const express = require('express');
const crypto = require('crypto'); // Explicitly require crypto for Shopify API
const Shop = require('../models/Shop');
const logger = require('../utils/logger');

const router = express.Router();

// Ensure crypto is available globally (for Shopify API)
if (typeof global !== 'undefined' && !global.crypto) {
    global.crypto = crypto;
}

// Initialize Shopify API only if credentials are available
let shopify = null;
if (process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET) {
    try {
        // Load adapter FIRST before importing shopifyApi
        require('@shopify/shopify-api/adapters/node');
        const { shopifyApi, ApiVersion } = require('@shopify/shopify-api');
        
        // Get hostName - just the domain, no protocol
        let hostName = process.env.SHOPIFY_APP_URL || 'localhost:3001';
        hostName = hostName.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
        
        shopify = shopifyApi({
            apiKey: process.env.SHOPIFY_API_KEY,
            apiSecretKey: process.env.SHOPIFY_API_SECRET,
            scopes: (process.env.SHOPIFY_SCOPES || 'read_products,write_products,read_orders,read_shipping,write_shipping').split(',').map(s => s.trim()),
            hostName: hostName,
            apiVersion: ApiVersion.April23,
            isEmbeddedApp: true, // Enable embedded app mode for Shopify admin
        });
        logger.info('✅ Shopify OAuth configured');
    } catch (error) {
        logger.error('⚠️ Shopify OAuth configuration error:', error);
    }
} else {
    logger.info('ℹ️ Shopify OAuth not configured (SHOPIFY_API_KEY/SECRET missing)');
}

// OAuth route - start authentication
router.get('/shopify', async (req, res) => {
    if (!shopify) {
        return res.status(503).json({ error: 'Shopify OAuth not configured' });
    }
    
    try {
        const shop = req.query.shop;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop parameter is required' });
        }

        // Clean shop domain
        let shopDomain = shop.toString().trim();
        if (!shopDomain.endsWith('.myshopify.com')) {
            if (shopDomain.includes('.')) {
                logger.warn(`Shop domain may be incomplete: ${shopDomain}`);
            } else {
                shopDomain = `${shopDomain}.myshopify.com`;
            }
        }

        logger.info(`🔗 Starting OAuth for shop: ${shopDomain}`);

        // Build callback URL - must match exactly what's in Shopify Partners
        const appUrl = process.env.SHOPIFY_APP_URL || 'http://localhost:3001';
        const callbackUrl = `${appUrl}/api/auth/shopify/callback`;
        
        logger.info(`Callback URL: ${callbackUrl}`);

        // Start OAuth - this will redirect to Shopify
        await shopify.auth.begin({
            shop: shopDomain,
            callbackPath: '/api/auth/shopify/callback',
            isOnline: false,
            rawRequest: req,
            rawResponse: res,
        });

    } catch (error) {
        logger.error('OAuth initiation error:', error);
        res.status(500).json({ error: 'Failed to initiate authentication', details: error.message });
    }
});

// OAuth callback route
router.get('/shopify/callback', async (req, res) => {
    if (!shopify) {
        return res.status(503).json({ error: 'Shopify OAuth not configured' });
    }
    
    // Check if MongoDB is connected
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
        logger.error('MongoDB not connected. ReadyState:', mongoose.connection.readyState);
        return res.status(503).send(`
            <html>
            <body>
                <h1>Authentication Failed</h1>
                <p>Database connection error. Please check MongoDB configuration.</p>
                <p>MongoDB Status: ${mongoose.connection.readyState === 0 ? 'Disconnected' : mongoose.connection.readyState === 2 ? 'Connecting' : 'Unknown'}</p>
                <p><a href="${process.env.SHOPIFY_APP_URL || 'http://localhost:3001'}">Return to app</a></p>
            </body>
            </html>
        `);
    }
    
    try {
        const callback = await shopify.auth.callback({
            rawRequest: req,
            rawResponse: res,
        });

        const { shop, accessToken, scope } = callback.session;

        logger.info(`OAuth callback - Shop: ${shop}, Scopes: ${scope || 'none'}`);

        // Save shop information
        const shopData = await Shop.findOneAndUpdate(
            { domain: shop },
            {
                domain: shop,
                accessToken: accessToken,
                scope: scope || process.env.SHOPIFY_SCOPES || 'read_products,write_products,read_orders,read_shipping,write_shipping',
                lastActiveAt: new Date(),
                isActive: true
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        
        logger.info(`Saved shop data - Scopes: ${shopData.scope}`);

        // Get shop info from Shopify
        try {
            const client = new shopify.clients.Rest({ session: callback.session });
            const shopInfo = await client.get({ path: 'shop' });
            
            shopData.name = shopInfo.body.shop.name;
            shopData.email = shopInfo.body.shop.email;
            shopData.currency = shopInfo.body.shop.currency;
            await shopData.save();
        } catch (shopInfoError) {
            logger.warn('Could not fetch shop info:', shopInfoError);
        }

        logger.info(`✅ OAuth completed for shop: ${shop}`);

        // Redirect to app - use direct URL, not embedded
        const appUrl = process.env.SHOPIFY_APP_URL || 'http://localhost:3001';
        const redirectUrl = `${appUrl}/?shop=${encodeURIComponent(shop)}`;
        
        logger.info(`Redirecting to: ${redirectUrl}`);
        
        // Simple redirect
        res.redirect(redirectUrl);

    } catch (error) {
        logger.error('OAuth callback error:', error);
        res.status(500).send(`
            <html>
            <body>
                <h1>Authentication Failed</h1>
                <p>Error: ${error.message}</p>
                <p><a href="${process.env.SHOPIFY_APP_URL || 'http://localhost:3001'}">Return to app</a></p>
            </body>
            </html>
        `);
    }
});

// Verify shop authentication
router.get('/shop/verify', async (req, res) => {
    try {
        const { shop } = req.query;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop parameter is required' });
        }

        const shopData = await Shop.findOne({ domain: shop });
        
        if (!shopData || !shopData.accessToken) {
            return res.json({ authenticated: false, message: 'Shop not authenticated' });
        }

        shopData.lastActiveAt = new Date();
        await shopData.save();

        res.json({ authenticated: true, shop: { domain: shopData.domain, name: shopData.name } });

    } catch (error) {
        logger.error('Verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

module.exports = router;

