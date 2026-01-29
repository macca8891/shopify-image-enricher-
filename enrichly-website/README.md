# Enrichly Website

A modern, responsive website for Enrichly - the AI-powered product image enhancement Shopify app.

## 🌟 Features

- **Modern Design**: Clean, professional design with gradient accents and smooth animations
- **Responsive**: Fully responsive design that works on all devices
- **Interactive Demo**: Live demo section showing image processing capabilities
- **Conversion Focused**: Optimized for early access signups and app installations
- **Performance Optimized**: Fast loading with optimized assets and smooth animations

## 🚀 Getting Started

1. **Clone/Download** the website files
2. **Serve locally** using any web server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```
3. **Open** `http://localhost:8000` in your browser

## 📁 Project Structure

```
enrichly-website/
├── index.html          # Main landing page
├── css/
│   └── style.css       # All styles and responsive design
├── js/
│   └── script.js       # Interactive functionality
├── images/
│   ├── enrichly-logo.svg
│   ├── before-example.jpg  # Demo images (add these)
│   ├── after-example.jpg
│   └── demo-product.jpg
└── assets/             # Additional assets
```

## 🎨 Design System

### Colors
- **Primary**: `#6366f1` (Indigo)
- **Secondary**: `#10b981` (Emerald) 
- **Accent**: `#f59e0b` (Amber)
- **Text**: `#1f2937` (Gray-800)
- **Background**: `#ffffff` / `#f9fafb`

### Typography
- **Font**: Inter (Google Fonts)
- **Weights**: 300, 400, 500, 600, 700, 800

### Gradients
- **Primary**: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- **Secondary**: `linear-gradient(135deg, #f093fb 0%, #f5576c 100%)`
- **Accent**: `linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)`

## 📱 Responsive Breakpoints

- **Desktop**: > 768px
- **Tablet**: 768px and below
- **Mobile**: 480px and below

## ⚡ Performance Features

- **Optimized Images**: Lazy loading for better performance
- **Smooth Animations**: Hardware-accelerated CSS animations
- **Efficient JavaScript**: Throttled scroll events and optimized DOM queries
- **Mobile-First**: Responsive design approach

## 🛠️ Customization

### Adding New Sections
1. Add HTML structure in `index.html`
2. Add corresponding styles in `css/style.css`
3. Add any interactive functionality in `js/script.js`

### Updating Colors
Update CSS custom properties in `:root` selector in `style.css`:
```css
:root {
  --primary-color: #your-color;
  --secondary-color: #your-color;
  /* ... */
}
```

### Adding Images
Place images in the `images/` directory and reference them in HTML:
```html
<img src="images/your-image.jpg" alt="Description">
```

## 📋 TODO: Required Assets

To complete the website, add these image assets to the `images/` directory:

1. **before-example.jpg** - Product image before processing
2. **after-example.jpg** - Same product after Enrichly processing  
3. **demo-product.jpg** - Interactive demo product image
4. **og-image.jpg** - Open Graph social media preview (1200x630px)

## 🚀 Deployment

### Option 1: Static Hosting (Recommended)
- **Netlify**: Drag and drop the folder or connect via Git
- **Vercel**: Import the project from GitHub
- **GitHub Pages**: Push to repository and enable Pages

### Option 2: Traditional Web Hosting
- Upload all files to your web hosting provider
- Ensure the domain points to `index.html`

### Option 3: CDN
- Upload to AWS S3 + CloudFront
- Configure for static website hosting

## 🔧 Browser Support

- **Chrome**: 70+
- **Firefox**: 65+
- **Safari**: 12+
- **Edge**: 79+
- **Mobile browsers**: iOS Safari 12+, Chrome Mobile 70+

## 📈 Analytics

The website is ready for analytics integration:
- Google Analytics 4
- Facebook Pixel
- Custom event tracking (see `trackEvent` function in `script.js`)

## 🎯 Conversion Optimization

The website includes several conversion-focused elements:
- **Multiple CTAs**: Throughout the page flow
- **Social Proof**: Stats and testimonials sections
- **Trust Signals**: Security badges and guarantees
- **Urgency**: Early access and limited-time offers
- **Risk Reversal**: Free trial and money-back guarantees

## 📞 Support

For questions about the website or Enrichly:
- Email: support@enrichly.io
- Website: https://enrichly.io
- Documentation: https://docs.enrichly.io

---

Built with ❤️ for Shopify merchants worldwide.



