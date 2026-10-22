const mongoose = require('mongoose');

/**
 * A photo of the part or its label, attached to a storefront quote request
 * (board, 22 Oct 2026). Kept out of QuoteRequest itself so the Order Desk's
 * listing poll stays small; the desk fetches each photo once by quote and index.
 *
 * The content type is worked out from the file's own bytes on upload, never
 * from the browser's claim or the filename, and filenames are not stored.
 */
const QuotePhotoSchema = new mongoose.Schema({
    quote: { type: mongoose.Schema.Types.ObjectId, index: true, required: true },
    idx: { type: Number, required: true },
    contentType: { type: String, required: true },
    bytes: { type: Number },
    data: { type: Buffer, required: true },
    createdAt: { type: Date, default: Date.now }
});
QuotePhotoSchema.index({ quote: 1, idx: 1 }, { unique: true });

module.exports = mongoose.models.QuotePhoto
    || mongoose.model('QuotePhoto', QuotePhotoSchema);
