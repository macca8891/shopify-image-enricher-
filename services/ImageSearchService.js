const axios = require('axios');
const OpenAI = require('openai');
const logger = require('../utils/logger');

class ImageSearchService {
    constructor() {
        this.googleAPIKey = process.env.GOOGLE_API_KEY;
        this.searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
        
        // Initialize OpenAI only if API key is available
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
        } else {
            this.openai = null;
            logger.warn('⚠️ OpenAI API key not configured - AI search term generation disabled');
        }
    }

    /**
     * Generate AI-powered search terms for a product
     * @param {Object} productData - Product information
     * @returns {Array} Array of search terms
     */
    async generateSearchTerms(productData) {
        // If OpenAI is not configured, return basic search terms
        if (!this.openai) {
            logger.info(`ℹ️ Using basic search terms for: ${productData.title} (OpenAI not configured)`);
            const fallbackTerms = [
                `${productData.title}`,
                `${productData.vendor || ''} ${productData.title}`.trim(),
                `${productData.productType || ''} product photo`.trim(),
                `${productData.title} white background`,
                `${productData.title} professional photo`
            ].filter(term => term.length > 0);
            return fallbackTerms;
        }
        
        try {
            logger.info(`🤖 Generating AI search terms for: ${productData.title}`);

            const prompt = `Based on the following product information, generate 8-12 highly specific and effective search terms for finding high-quality product images on Google. Focus on terms that would yield professional product photos, lifestyle shots, and images from different angles.

Product Details:
- Title: ${productData.title}
- Vendor/Brand: ${productData.vendor || 'N/A'}
- Product Type: ${productData.productType || 'N/A'}
- Description: ${productData.description ? productData.description.substring(0, 500) : 'N/A'}
- Tags: ${productData.tags ? productData.tags.join(', ') : 'N/A'}

Guidelines:
1. Include the brand/vendor name when available
2. Use specific product model numbers or names
3. Include product category keywords
4. Add variations like "product photo", "professional photo", "white background"
5. Consider different angles: "front view", "side view", "detail shot"
6. Include relevant technical terms or features

Return only the search terms, one per line, without quotes or additional formatting.`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 300,
                temperature: 0.7,
            });

            const termsText = response.choices[0].message.content.trim();
            const searchTerms = termsText.split('\n').map(term => term.trim()).filter(term => term.length > 0);

            logger.info(`✅ Generated ${searchTerms.length} search terms for ${productData.title}`);
            return searchTerms;

        } catch (error) {
            logger.error('Error generating AI search terms:', error);
            
            // Fallback to basic search terms
            const fallbackTerms = [
                `${productData.title}`,
                `${productData.vendor || ''} ${productData.title}`.trim(),
                `${productData.productType || ''} product photo`.trim(),
                `${productData.title} white background`,
                `${productData.title} professional photo`
            ].filter(term => term.length > 0);

            return fallbackTerms;
        }
    }

    /**
     * Search for images using Google Custom Search API
     * @param {Array} searchTerms - Array of search terms
     * @param {Object} options - Search options
     * @returns {Array} Array of image results
     */
    async searchImages(searchTerms, options = {}) {
        const {
            maxResults = 20,
            safeSearch = 'moderate',
            fileTypes = ['jpg', 'jpeg', 'png', 'webp'],
            minWidth = 400,
            minHeight = 400
        } = options;

        logger.info(`🔍 Searching for images with ${searchTerms.length} search terms`);

        const allResults = [];
        const resultsPerTerm = Math.ceil(maxResults / searchTerms.length);

        for (const term of searchTerms.slice(0, 5)) { // Limit to 5 terms to avoid API limits
            try {
                const images = await this._performGoogleImageSearch(term, {
                    num: Math.min(resultsPerTerm, 10), // Google API max is 10 per request
                    safe: safeSearch,
                    fileType: fileTypes.join('|'),
                    imgSize: 'medium', // or 'large' for higher quality
                    searchType: 'image'
                });

                const processedImages = this._processSearchResults(images, term, {
                    minWidth,
                    minHeight
                });

                allResults.push(...processedImages);

                // Rate limiting - wait between requests
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
                logger.error(`Error searching for term "${term}":`, error);
                continue;
            }
        }

        // Remove duplicates and sort by relevance
        const uniqueResults = this._removeDuplicates(allResults);
        const sortedResults = this._sortByRelevance(uniqueResults);

        logger.info(`✅ Found ${sortedResults.length} unique images from ${searchTerms.length} search terms`);
        return sortedResults.slice(0, maxResults);
    }

    /**
     * Perform Google Custom Search API call
     * @private
     */
    async _performGoogleImageSearch(query, options = {}) {
        const searchUrl = 'https://www.googleapis.com/customsearch/v1';
        
        const params = {
            key: this.googleAPIKey,
            cx: this.searchEngineId,
            q: query,
            searchType: 'image',
            num: options.num || 10,
            safe: options.safe || 'moderate',
            imgType: 'photo',
            imgSize: options.imgSize || 'medium',
            rights: 'cc_publicdomain,cc_attribute,cc_sharealike,cc_noncommercial,cc_nonderived'
        };

        const response = await axios.get(searchUrl, { 
            params,
            timeout: 10000 
        });

        return response.data.items || [];
    }

    /**
     * Process and filter search results
     * @private
     */
    _processSearchResults(images, searchTerm, options) {
        const { minWidth, minHeight } = options;
        
        return images.map(image => ({
            url: image.link,
            thumbnailUrl: image.image.thumbnailLink,
            title: image.title,
            snippet: image.snippet,
            contextLink: image.image.contextLink,
            searchTerm: searchTerm,
            dimensions: {
                width: parseInt(image.image.width) || null,
                height: parseInt(image.image.height) || null
            },
            fileSize: parseInt(image.image.byteSize) || null,
            mimeType: image.mime,
            source: 'google_search',
            relevanceScore: 0, // Will be calculated later
            isSelected: false
        })).filter(image => {
            // Filter by minimum dimensions if available
            if (image.dimensions.width && image.dimensions.height) {
                return image.dimensions.width >= minWidth && image.dimensions.height >= minHeight;
            }
            return true; // Keep images where dimensions are unknown
        });
    }

    /**
     * Remove duplicate images based on URL
     * @private
     */
    _removeDuplicates(images) {
        const seen = new Set();
        return images.filter(image => {
            if (seen.has(image.url)) {
                return false;
            }
            seen.add(image.url);
            return true;
        });
    }

    /**
     * Sort images by relevance
     * @private
     */
    _sortByRelevance(images) {
        return images.map(image => {
            let score = 0;

            // Boost score for larger images
            if (image.dimensions.width && image.dimensions.height) {
                const area = image.dimensions.width * image.dimensions.height;
                score += Math.min(area / 100000, 10); // Max 10 points for size
            }

            // Boost score for common product photo keywords in title/snippet
            const productKeywords = ['product', 'photo', 'professional', 'white background', 'studio', 'commercial'];
            const text = `${image.title} ${image.snippet}`.toLowerCase();
            productKeywords.forEach(keyword => {
                if (text.includes(keyword)) {
                    score += 2;
                }
            });

            // Boost score for high-quality image formats
            if (['image/jpeg', 'image/png', 'image/webp'].includes(image.mimeType)) {
                score += 1;
            }

            image.relevanceScore = score;
            return image;
        }).sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    /**
     * Search for product images with AI-generated terms
     * @param {Object} productData - Product information
     * @param {Object} options - Search options
     * @returns {Object} Search results with metadata
     */
    async searchProductImages(productData, options = {}) {
        try {
            logger.info(`🎯 Starting comprehensive image search for: ${productData.title}`);

            // Generate AI search terms
            const aiTerms = await this.generateSearchTerms(productData);
            
            // Add some manual search terms as backup
            const manualTerms = [
                productData.title,
                `${productData.vendor || ''} ${productData.title}`.trim(),
                `${productData.productType || 'product'} ${productData.title}`.trim()
            ].filter(term => term.length > 0);

            // Combine and deduplicate terms
            const allTerms = [...new Set([...aiTerms, ...manualTerms])];

            // Search for images
            const images = await this.searchImages(allTerms, options);

            const result = {
                searchTerms: allTerms,
                aiGeneratedTerms: aiTerms,
                totalFound: images.length,
                images: images,
                searchedAt: new Date(),
                success: true
            };

            logger.info(`✅ Image search completed: ${images.length} images found for ${productData.title}`);
            return result;

        } catch (error) {
            logger.error(`❌ Image search failed for ${productData.title}:`, error);
            return {
                searchTerms: [],
                aiGeneratedTerms: [],
                totalFound: 0,
                images: [],
                error: error.message,
                success: false
            };
        }
    }

    /**
     * Get image information without downloading
     * @param {string} imageUrl - Image URL
     * @returns {Object} Image metadata
     */
    async getImageInfo(imageUrl) {
        try {
            const response = await axios.head(imageUrl, { 
                timeout: 5000,
                maxRedirects: 3
            });

            return {
                url: imageUrl,
                fileSize: parseInt(response.headers['content-length']) || null,
                mimeType: response.headers['content-type'] || null,
                lastModified: response.headers['last-modified'] || null,
                accessible: true
            };
        } catch (error) {
            return {
                url: imageUrl,
                fileSize: null,
                mimeType: null,
                lastModified: null,
                accessible: false,
                error: error.message
            };
        }
    }
}

module.exports = ImageSearchService;
