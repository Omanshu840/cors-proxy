const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Enable CORS for all routes
app.use(cors());

// Proxy middleware - extracts URL from the path
app.use('/', createProxyMiddleware({
  router: (req) => {
    // Extract the target URL from the path (everything after the first /)
    const targetUrl = req.path.substring(1);
    
    // Handle URLs without protocol
    if (!targetUrl.startsWith('http')) {
      return `http://${targetUrl}`;
    }
    return targetUrl;
  },
  pathRewrite: (path, req) => {
    const targetUrl = req.path.substring(1);
    // Extract pathname from the full URL
    try {
      const url = new URL(targetUrl.startsWith('http') ? targetUrl : `http://${targetUrl}`);
      return url.pathname + url.search;
    } catch {
      return '/';
    }
  },
  changeOrigin: true,
  logLevel: 'info'
}));

// Error handling
app.use((err, req, res, next) => {
  console.error('Proxy error:', err);
  res.status(500).json({ error: 'Proxy request failed', message: err.message });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Proxy running on port ${PORT}`);
});

