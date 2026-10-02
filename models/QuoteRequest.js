const mongoose = require('mongoose');

/**
 * A quote request submitted from the storefront.
 *
 * This lives on Railway rather than in the local Order Desk because the
 * storefront needs a public endpoint to post to. The Order Desk polls
 * /api/quotes and pulls new ones down for sourcing and freight.
 *
 * `status` is owned by the Order Desk once it has pulled the request:
 * new -> pulled -> quoted -> won/lost. Railway only ever writes `new`.
 */
const QuoteRequestSchema = new mongoose.Schema({
    shop: { type: String, index: true },

    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    phone: { type: String, trim: true, maxlength: 60 },
    company: { type: String, trim: true, maxlength: 160 },
    country: { type: String, trim: true, maxlength: 80 },

    // One entry per line of the form, so a request covering three machines keeps
    // each part tied to its own machine and quantity. `parts` is the same
    // content rendered as text, kept so anything reading it still works.
    lines: [{
        _id: false,
        code: { type: String, trim: true, maxlength: 120 },
        brand: { type: String, trim: true, maxlength: 120 },
        machine: { type: String, trim: true, maxlength: 200 },
        qty: { type: String, trim: true, maxlength: 20 }
    }],

    parts: { type: String, required: true, maxlength: 4000 },

    // Kept for requests submitted before the form split into lines.
    machine: { type: String, trim: true, maxlength: 300 },
    quantity: { type: String, trim: true, maxlength: 120 },
    notes: { type: String, maxlength: 2000 },

    // Set when the customer arrived from a product page, so the request can be
    // tied back to what they were actually looking at.
    sourceUrl: { type: String, maxlength: 500 },

    // 'quote' from the request form, 'proforma' when they asked for an invoice
    // to raise payment against. A proforma means they intend to buy.
    requestType: { type: String, default: 'quote', index: true },

    status: { type: String, default: 'new', index: true },
    emailed: { type: Boolean, default: false },

    ip: { type: String, maxlength: 60 },
    createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.models.QuoteRequest
    || mongoose.model('QuoteRequest', QuoteRequestSchema);
