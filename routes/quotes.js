const express = require('express');
const router = express.Router();
const QuoteRequest = require('../models/QuoteRequest');
const QuotePhoto = require('../models/QuotePhoto');
const logger = require('../utils/logger');

/**
 * Storefront quote requests.
 *
 * POST /api/quotes   public, called by the form on sparepartmart.co
 * GET  /api/quotes   private, polled by the Order Desk. Requires QUOTES_TOKEN.
 * POST /api/quotes/:id/status  private, Order Desk marks progress.
 * GET  /api/quotes/:id/photos/:idx  private, Order Desk fetches an attached photo.
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

// ---- photos of the part or its label (board, 22 Oct 2026) -----------------
// The form resizes each photo in the browser and sends it as a base64 data URL
// inside the JSON body (express.json allows 10mb). Up to 3 are kept. The type is
// read from the file's magic bytes; whatever the browser claims, and any
// filename, is ignored. Anything that is not a JPEG, PNG or WebP is dropped.
const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;   // per photo, after the browser's resize

function sniffImage(buf) {
    if (buf.length > 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg';
    if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) return 'image/png';
    if (buf.length > 12 && buf.slice(0, 4).toString('latin1') === 'RIFF'
        && buf.slice(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
    return null;
}

function decodePhotos(raw) {
    const out = [];
    let dropped = 0;
    (Array.isArray(raw) ? raw : []).slice(0, MAX_PHOTOS).forEach(p => {
        const s = typeof p === 'string' ? p : (p && typeof p.data === 'string' ? p.data : '');
        const m = /^data:[^;,]{0,60};base64,([A-Za-z0-9+/=\s]+)$/.exec(s);
        if (!m) { dropped++; return; }
        const buf = Buffer.from(m[1], 'base64');
        const type = sniffImage(buf);
        if (!type || buf.length > MAX_PHOTO_BYTES) { dropped++; return; }
        out.push({ contentType: type, data: buf });
    });
    return { photos: out, dropped };
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

/**
 * Public, no customer data. The quote page shows its photo field only when this
 * says photos are accepted, so the form never collects photos a stale deploy
 * would silently drop.
 */
router.get('/features', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ photos: true, maxPhotos: MAX_PHOTOS });
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
                title: String(l && l.title || '').trim().slice(0, 300),
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
            marketingOptIn: b.marketingOptIn === true || b.marketingOptIn === 'true' || b.marketingOptIn === 'on',
            shippingChoice: (b.shippingChoice && b.shippingChoice.service) ? {
                service: String(b.shippingChoice.service).slice(0, 120),
                price: Number(b.shippingChoice.price) || 0,
                minDays: Number(b.shippingChoice.minDays) || null,
                maxDays: Number(b.shippingChoice.maxDays) || null
            } : undefined,
            machine: (b.machine || '').trim(),
            quantity: (b.quantity || '').trim(),
            notes: (b.notes || '').trim(),
            sourceUrl: (b.sourceUrl || '').slice(0, 500),
            ip
        });

        // Photos are best effort: a bad image never costs us the request itself.
        const { photos, dropped } = decodePhotos(b.photos);
        if (photos.length) {
            try {
                const meta = [];
                for (let i = 0; i < photos.length; i++) {
                    await QuotePhoto.create({ quote: doc._id, idx: i,
                        contentType: photos[i].contentType, bytes: photos[i].data.length,
                        data: photos[i].data });
                    meta.push({ idx: i, contentType: photos[i].contentType, bytes: photos[i].data.length });
                }
                await QuoteRequest.updateOne({ _id: doc._id }, { $set: { photos: meta } });
            } catch (perr) {
                logger.error(`Quote ${doc._id}: photos not saved:`, perr);
            }
        }
        if (dropped) logger.info(`Quote ${doc._id}: ${dropped} photo(s) dropped (not a JPEG/PNG/WebP, or too large)`);

        logger.info(`Quote request ${doc._id} from ${email}${photos.length ? ` with ${photos.length} photo(s)` : ''}`);
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

router.get('/:id/photos/:idx', async (req, res) => {
    if (!authed(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
        if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ error: 'bad id' });
        const idx = parseInt(req.params.idx, 10);
        if (!(idx >= 0 && idx < MAX_PHOTOS)) return res.status(400).json({ error: 'bad index' });
        const p = await QuotePhoto.findOne({ quote: req.params.id, idx }).lean();
        if (!p) return res.status(404).json({ error: 'not found' });
        // lean() hands back a BSON Binary; its .buffer is the exact bytes.
        const d = p.data;
        const buf = Buffer.isBuffer(d) ? d : Buffer.from(d.buffer || d);
        res.set('Content-Type', sniffImage(buf) || 'application/octet-stream');
        res.set('X-Content-Type-Options', 'nosniff');
        res.set('Cache-Control', 'private, no-store');
        return res.send(buf);
    } catch (err) {
        return res.status(500).json({ error: err.message });
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
