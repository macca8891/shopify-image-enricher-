const express = require('express');
const router = express.Router();
const QuoteRequest = require('../models/QuoteRequest');
const logger = require('../utils/logger');

/**
 * Storefront quote requests.
 *
 * POST /api/quotes   public, called by the form on sparepartmart.co
 * GET  /api/quotes   private, polled by the Order Desk. Requires QUOTES_TOKEN.
 * POST /api/quotes/:id/status  private, Order Desk marks progress.
 *
 * The GET carries customer names, emails and phone numbers, so it stays shut
 * unless QUOTES_TOKEN is set in the environment. No token, no listing.
 */

// Crude in-memory throttle. A new dependency is not worth it for a form that
// a human fills in; this only needs to stop a script hammering the endpoint.
const RECENT = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function throttled(ip) {
    const now = Date.now();
    const hits = (RECENT.get(ip) || []).filter(t => now - t < WINDOW_MS);
    hits.push(now);
    RECENT.set(ip, hits);
    if (RECENT.size > 5000) RECENT.clear();
    return hits.length > MAX_PER_WINDOW;
}

function authed(req) {
    const want = process.env.QUOTES_TOKEN;
    if (!want) return false;
    const got = req.get('X-Quotes-Token') || req.query.token || '';
    return got === want;
}

/**
 * Whether the listing token is configured, and the first/last two characters of
 * what the server holds. Enough to tell "variable missing" apart from "value
 * does not match" without disclosing the token itself.
 */
router.get('/config', (req, res) => {
    const t = process.env.QUOTES_TOKEN || '';
    res.json({
        tokenConfigured: !!t,
        tokenLength: t.length,
        tokenHint: t ? `${t.slice(0, 2)}...${t.slice(-2)}` : null,
        hasWhitespace: t !== t.trim(),
        // Railway injects these itself. With several services (and, in this
        // project's history, duplicates) they name exactly which one is
        // actually serving this domain, so the variable goes to the right place.
        railway: {
            project: process.env.RAILWAY_PROJECT_NAME || null,
            service: process.env.RAILWAY_SERVICE_NAME || null,
            environment: process.env.RAILWAY_ENVIRONMENT_NAME || null,
            deployedCommit: (process.env.RAILWAY_GIT_COMMIT_SHA || '').slice(0, 7) || null
        }
    });
});

router.post('/', async (req, res) => {
    try {
        const b = req.body || {};

        // Honeypot. Real users never see this field, bots fill everything in.
        if (b.website) {
            logger.info('Quote request dropped: honeypot filled');
            return res.json({ ok: true });   // look successful to the bot
        }

        const ip = (req.get('X-Forwarded-For') || req.ip || '').split(',')[0].trim();
        if (throttled(ip)) {
            return res.status(429).json({
                ok: false,
                error: 'Too many requests. Please email sales@sparepartmart.co instead.'
            });
        }

        const name = (b.name || '').trim();
        const email = (b.email || '').trim();
        const parts = (b.parts || '').trim();
        if (!name || !email || !parts) {
            return res.status(400).json({
                ok: false,
                error: 'Name, email and the parts you need are all required.'
            });
        }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            return res.status(400).json({ ok: false, error: 'That email address does not look right.' });
        }

        // Structured rows, capped so a crafted payload cannot bloat a document.
        const lines = (Array.isArray(b.lines) ? b.lines : [])
            .slice(0, 60)
            .map(l => ({
                code: String(l && l.code || '').trim().slice(0, 120),
                brand: String(l && l.brand || '').trim().slice(0, 120),
                machine: String(l && l.machine || '').trim().slice(0, 200),
                qty: String(l && l.qty || '').trim().slice(0, 20)
            }))
            .filter(l => l.code || l.brand || l.machine);

        const doc = await QuoteRequest.create({
            shop: b.shop || 'spare-part-mart.myshopify.com',
            requestType: b.requestType === 'proforma' ? 'proforma' : 'quote',
            name, email, parts, lines,
            phone: (b.phone || '').trim(),
            company: (b.company || '').trim(),
            country: (b.country || '').trim(),
            address1: (b.address1 || '').trim(),
            address2: (b.address2 || '').trim(),
            city: (b.city || '').trim(),
            province: (b.province || '').trim(),
            zip: (b.zip || '').trim(),
            poNumber: (b.poNumber || '').trim(),
            machine: (b.machine || '').trim(),
            quantity: (b.quantity || '').trim(),
            notes: (b.notes || '').trim(),
            sourceUrl: (b.sourceUrl || '').slice(0, 500),
            ip
        });

        logger.info(`Quote request ${doc._id} from ${email}`);
        return res.json({ ok: true, id: doc._id });
    } catch (err) {
        logger.error('Quote request failed:', err);
        return res.status(500).json({
            ok: false,
            error: 'Something went wrong. Please email sales@sparepartmart.co.'
        });
    }
});

router.get('/', async (req, res) => {
    if (!authed(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const q = {};
        if (req.query.status) q.status = req.query.status;
        if (req.query.since) q.createdAt = { $gt: new Date(req.query.since) };
        const rows = await QuoteRequest.find(q)
            .sort({ createdAt: -1 })
            .limit(Math.min(parseInt(req.query.limit || '100', 10), 500))
            .lean();
        return res.json({ quotes: rows });
    } catch (err) {
        logger.error('Quote listing failed:', err);
        return res.status(500).json({ error: err.message, quotes: [] });
    }
});

router.post('/:id/status', async (req, res) => {
    if (!authed(req)) return res.status(401).json({ error: 'Unauthorized' });
    const allowed = ['new', 'pulled', 'quoted', 'won', 'lost'];
    const status = (req.body || {}).status;
    if (!allowed.includes(status)) {
        return res.status(400).json({ error: `status must be one of ${allowed.join(', ')}` });
    }
    try {
        const patch = { status };
        if ((req.body || {}).emailed !== undefined) patch.emailed = !!req.body.emailed;
        await QuoteRequest.updateOne({ _id: req.params.id }, { $set: patch });
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
