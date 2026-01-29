const vision = require('@google-cloud/vision');
const axios = require('axios');
const logger = require('../utils/logger');

class ImageAnalysisService {
    constructor() {
        // Initialize Google Vision client
        this.visionClient = new vision.ImageAnnotatorClient({
            keyFilename: process.env.GOOGLE_VISION_KEY_FILE || undefined,
            apiKey: process.env.GOOGLE_VISION_API_KEY || undefined
        });
    }

    /**
     * Analyze an image using Google Vision API
     * @param {string} imageUrl - URL of the image to analyze
     * @param {Object} options - Analysis options
     * @returns {Object} Analysis results
     */
    async analyzeImage(imageUrl, options = {}) {
        try {
            const {
                detectLabels = true,
                detectText = true,
                detectFaces = false,
                detectColors = true,
                safeSearch = true,
                confidenceThreshold = 0.7
            } = options;

            logger.info(`🔍 Analyzing image: ${imageUrl}`);

            // Prepare the request
            const request = {
                image: { source: { imageUri: imageUrl } },
                features: []
            };

            // Add feature detection based on options
            if (detectLabels) {
                request.features.push({ type: 'LABEL_DETECTION', maxResults: 20 });
            }
            
            if (detectText) {
                request.features.push({ type: 'TEXT_DETECTION' });
            }
            
            if (detectFaces) {
                request.features.push({ type: 'FACE_DETECTION', maxResults: 10 });
            }
            
            if (detectColors) {
                request.features.push({ type: 'IMAGE_PROPERTIES' });
            }
            
            if (safeSearch) {
                request.features.push({ type: 'SAFE_SEARCH_DETECTION' });
            }

            // Perform the analysis
            const [result] = await this.visionClient.annotateImage(request);

            // Process and format the results
            const analysis = this._processVisionResults(result, confidenceThreshold);
            
            // Get image dimensions
            const dimensions = await this._getImageDimensions(imageUrl);
            analysis.dimensions = dimensions;

            logger.info(`✅ Image analysis completed for ${imageUrl}`);
            return analysis;

        } catch (error) {
            logger.error(`❌ Image analysis failed for ${imageUrl}:`, error);
            throw new Error(`Image analysis failed: ${error.message}`);
        }
    }

    /**
     * Analyze multiple images in batch
     * @param {Array} imageUrls - Array of image URLs
     * @param {Object} options - Analysis options
     * @returns {Array} Array of analysis results
     */
    async analyzeImagesBatch(imageUrls, options = {}) {
        logger.info(`🔍 Starting batch analysis for ${imageUrls.length} images`);
        
        const results = [];
        const batchSize = 5; // Process 5 images at a time to avoid rate limits
        
        for (let i = 0; i < imageUrls.length; i += batchSize) {
            const batch = imageUrls.slice(i, i + batchSize);
            const batchPromises = batch.map(url => 
                this.analyzeImage(url, options).catch(error => ({
                    url,
                    error: error.message,
                    success: false
                }))
            );
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Small delay between batches to be respectful to the API
            if (i + batchSize < imageUrls.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        logger.info(`✅ Batch analysis completed: ${results.filter(r => r.success !== false).length}/${imageUrls.length} successful`);
        return results;
    }

    /**
     * Process Vision API results into a clean format
     * @private
     */
    _processVisionResults(result, confidenceThreshold) {
        const analysis = {
            labels: [],
            colors: [],
            text: '',
            faces: 0,
            safeSearch: {},
            confidence: 0,
            success: true
        };

        // Process labels
        if (result.labelAnnotations) {
            analysis.labels = result.labelAnnotations
                .filter(label => label.score >= confidenceThreshold)
                .map(label => ({
                    description: label.description,
                    confidence: label.score,
                    topicality: label.topicality
                }));
        }

        // Process text detection
        if (result.textAnnotations && result.textAnnotations.length > 0) {
            analysis.text = result.textAnnotations[0].description || '';
        }

        // Process face detection
        if (result.faceAnnotations) {
            analysis.faces = result.faceAnnotations.length;
        }

        // Process color information
        if (result.imagePropertiesAnnotation && result.imagePropertiesAnnotation.dominantColors) {
            analysis.colors = result.imagePropertiesAnnotation.dominantColors.colors
                .slice(0, 5) // Top 5 colors
                .map(color => ({
                    red: color.color.red || 0,
                    green: color.color.green || 0,
                    blue: color.color.blue || 0,
                    score: color.score,
                    pixelFraction: color.pixelFraction,
                    hex: this._rgbToHex(
                        color.color.red || 0,
                        color.color.green || 0,
                        color.color.blue || 0
                    )
                }));
        }

        // Process safe search
        if (result.safeSearchAnnotation) {
            analysis.safeSearch = {
                adult: result.safeSearchAnnotation.adult,
                medical: result.safeSearchAnnotation.medical,
                racy: result.safeSearchAnnotation.racy,
                spoof: result.safeSearchAnnotation.spoof,
                violence: result.safeSearchAnnotation.violence
            };
        }

        // Calculate overall confidence based on labels
        if (analysis.labels.length > 0) {
            analysis.confidence = analysis.labels.reduce((sum, label) => sum + label.confidence, 0) / analysis.labels.length;
        }

        return analysis;
    }

    /**
     * Get image dimensions
     * @private
     */
    async _getImageDimensions(imageUrl) {
        try {
            const response = await axios.head(imageUrl, { timeout: 5000 });
            
            // Try to get dimensions from headers first
            const contentLength = response.headers['content-length'];
            
            // If we can't get dimensions from headers, we'll need to download and analyze
            // For now, we'll skip this to avoid downloading large images
            return {
                width: null,
                height: null,
                fileSize: contentLength ? parseInt(contentLength) : null,
                mimeType: response.headers['content-type']
            };
        } catch (error) {
            logger.warn(`Could not get image dimensions for ${imageUrl}:`, error.message);
            return {
                width: null,
                height: null,
                fileSize: null,
                mimeType: null
            };
        }
    }

    /**
     * Convert RGB to hex
     * @private
     */
    _rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    /**
     * Determine if an image is suitable for e-commerce
     * @param {Object} analysis - Image analysis results
     * @returns {Object} Suitability assessment
     */
    assessImageSuitability(analysis) {
        const assessment = {
            suitable: true,
            score: 0,
            reasons: [],
            recommendations: []
        };

        // Check safe search results
        if (analysis.safeSearch) {
            const unsafeCategories = ['adult', 'racy', 'violence'];
            for (const category of unsafeCategories) {
                if (['LIKELY', 'VERY_LIKELY'].includes(analysis.safeSearch[category])) {
                    assessment.suitable = false;
                    assessment.reasons.push(`Image flagged for ${category} content`);
                }
            }
        }

        // Check for text overlay (might indicate watermarks)
        if (analysis.text && analysis.text.length > 20) {
            assessment.score -= 10;
            assessment.recommendations.push('Image contains text overlay - may have watermarks');
        }

        // Check for faces (usually not ideal for product photos)
        if (analysis.faces > 0) {
            assessment.score -= 5;
            assessment.recommendations.push('Image contains faces - consider product-only photos');
        }

        // Boost score based on relevant labels
        const productLabels = ['Product', 'Technology', 'Electronic device', 'Gadget', 'Tool', 'Equipment'];
        const relevantLabels = analysis.labels.filter(label => 
            productLabels.some(prodLabel => 
                label.description.toLowerCase().includes(prodLabel.toLowerCase())
            )
        );
        assessment.score += relevantLabels.length * 5;

        // Normalize score to 0-100
        assessment.score = Math.max(0, Math.min(100, assessment.score + 50));

        return assessment;
    }
}

module.exports = ImageAnalysisService;
