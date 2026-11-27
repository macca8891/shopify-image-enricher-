/**
 * Shipping quote log (26 Nov 2026). Records every quote the carrier-service answers
 * so the SPM desk can show what people price, where to, and what we quoted them.
 *
 * Safety: this never touches the rate response. It copies the body as it is sent and
 * writes to Mongo on the next tick after the response has finished. Every step is
 * inside try/catch and the insert is fire-and-forget, so a slow or broken database
 * can not slow down or break checkout.
 *
 * Privacy: only country, region, postcode and city are kept from the destination.
 */
const mongoose = require('mongoose');
const logger = require('./logger');

let Model = null;
function model() {
    if (!Model) Model = require('../models/ShippingQuoteLog');
    return Model;
}

const SKIP_SOURCES = new Set(['prewarm', 'coverage']);

function sourceOf(req, dest) {
    const tagged = String(req.get('X-SPM-Source') || '').toLowerCase().slice(0, 20);
    if (tagged) return tagged;
    if (req.get('X-Shopify-Hmac-Sha256') || req.get('X-Shopify-Shop-Domain')) {
        // Shopify sends the full address once the shopper is in checkout; the cart page
        // estimator (/cart/shipping_rates.json) sends country, region and postcode only.
        return (dest.address1 || dest.name || dest.email || dest.phone) ? 'checkout' : 'cart';
    }
    return 'other';
}

const clip = (v, n) => (v === undefined || v === null) ? '' : String(v).slice(0, n);
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : undefined; };

/**
 * Install on the carrier-service route, before the handler. `fx()` returns the
 * current CNY to USD rate (or null) so CNY prices can also be stored in USD.
 */
function capture(fx) {
    return function quoteLogMiddleware(req, res, next) {
        try {
            const started = Date.now();
            let body = null;
            const send = res.send;
            res.send = function (chunk) {
                try { if (body === null) body = chunk; } catch (e) { /* ignore */ }
                return send.apply(this, arguments);
            };
            res.on('finish', () => {
                setImmediate(() => {
                    try { record(req, res, body, Date.now() - started, fx); } catch (e) {
                        logger.warn(`quote log skipped: ${e.message}`);
                    }
                });
            });
        } catch (e) { /* never block the quote */ }
        next();
    };
}

function record(req, res, body, ms, fx) {
    if (mongoose.connection.readyState !== 1) return;
    const rate = (req.body && (req.body.rate || req.body)) || {};
    const dest = rate.destination || {};
    const source = sourceOf(req, dest);
    if (SKIP_SOURCES.has(source)) return;

    let parsed = null;
    if (typeof body === 'string') { try { parsed = JSON.parse(body); } catch (e) { parsed = null; } }
    else if (body && typeof body === 'object' && !Buffer.isBuffer(body)) parsed = body;
    const outRates = (parsed && Array.isArray(parsed.rates)) ? parsed.rates : [];

    const items = (Array.isArray(rate.items) ? rate.items : []).slice(0, 100).map(i => ({
        product_id: num(i.product_id), variant_id: num(i.variant_id),
        sku: clip(i.sku, 80), title: clip(i.name, 200) === 'estimate' ? '' : clip(i.name, 200),
        quantity: num(i.quantity) || 1, grams: num(i.grams), price_cents: num(i.price)
    }));
    const cartValue = items.reduce((s, i) => s + (i.price_cents || 0) * (i.quantity || 1), 0);
    const rateFx = (typeof fx === 'function') ? fx() : null;

    const rates = outRates.slice(0, 40).map(r => {
        const cents = num(r.total_price);
        const cur = clip(r.currency, 3);
        let usd;
        if (cents !== undefined) {
            if (cur === 'USD') usd = cents / 100;
            else if (cur === 'CNY' && rateFx) usd = Math.round(cents * rateFx) / 100;
        }
        return {
            service: clip(r.service_name, 120), price_cents: cents, currency: cur, usd,
            min_date: clip(r.min_delivery_date, 10), max_date: clip(r.max_delivery_date, 10),
            note: clip(r.description, 200)
        };
    });

    model().create({
        at: new Date(), source,
        country: clip(dest.country_code || dest.country, 2).toUpperCase(),
        province: clip(dest.province, 60), postal_code: clip(dest.postal_code, 12), city: clip(dest.city, 80),
        currency: clip(rate.currency, 3), cart_value_cents: cartValue,
        items, rates, rate_count: rates.length,
        cached: res.get('X-Cache') === 'HIT', ms, status: res.statusCode
    }).catch(e => logger.warn(`quote log insert failed (harmless): ${e.message}`));
}

module.exports = { capture };
