const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 8080;

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
  
  // ⭐ FORWARD ALL REQUEST HEADERS
  headers: (req) => {
    // Remove host header (it will be set automatically by http-proxy)
    const headers = { ...req.headers };
    delete headers.host;
    return headers;
  },
  
  // ⭐ PRESERVE ALL RESPONSE HEADERS
  onProxyRes: (proxyRes, req, res) => {
    // Copy all response headers as-is (this is the default behavior,
    // but being explicit here)
    Object.keys(proxyRes.headers).forEach(key => {
      // Skip content-encoding to avoid double compression issues
      if (key.toLowerCase() !== 'content-encoding') {
        res.setHeader(key, proxyRes.headers[key]);
      }
    });
  },
  
  // ⭐ FORWARD ALL REQUEST BODY DATA (for POST, PUT, etc.)
  onProxyReq: (proxyReq, req, res) => {
    // Forward request body if it exists
    if (req.body) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  
  logLevel: 'info',
  
  // ⭐ ADDITIONAL OPTIONS FOR BETTER HEADER FORWARDING
  xfwd: true, // Adds X-Forwarded-For, X-Forwarded-Proto, X-Forwarded-Host
  preserveHeaderKeyCase: true, // Keeps original header case
  ws: true, // Support WebSockets if needed
}));

// Error handling
app.use((err, req, res, next) => {
  console.error('Proxy error:', err);
  res.status(500).json({ error: 'Proxy request failed', message: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ CORS Proxy Server running on http://localhost:${PORT}`);
  console.log(`\n📌 Usage examples:`);
  console.log(`   http://localhost:${PORT}/https://www.google.com`);
  console.log(`   http://localhost:${PORT}/https://api.example.com/endpoint`);
});
