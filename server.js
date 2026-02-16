// Simple development server for testing Vercel serverless functions locally
const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const PORT = 3000;

// MIME types for static files
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Wrapper to make res compatible with Vercel API format
function wrapResponse(res) {
    res.status = function(code) {
        res.statusCode = code;
        return res;
    };
    res.json = function(data) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
        return res;
    };
    return res;
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Handle API routes
    if (pathname.startsWith('/api/')) {
        const apiPath = pathname.substring(5); // Remove '/api/' prefix
        const handlerPath = path.join(__dirname, 'api', apiPath + '.js');

        console.log(`📥 API Request: ${req.method} ${pathname}`);
        console.log(`   Handler path: ${handlerPath}`);

        try {
            if (fs.existsSync(handlerPath)) {
                console.log(`   ✅ Handler found`);
                // Clear require cache for hot reloading
                delete require.cache[require.resolve(handlerPath)];

                const handler = require(handlerPath);

                // Wrap response to add Express-like methods
                wrapResponse(res);

                // Parse request body for POST requests
                if (req.method === 'POST' || req.method === 'OPTIONS') {
                    let body = '';
                    req.on('data', chunk => {
                        body += chunk.toString();
                    });
                    req.on('end', async () => {
                        try {
                            req.body = body ? JSON.parse(body) : {};
                        } catch (e) {
                            req.body = {};
                        }
                        await handler(req, res);
                    });
                } else {
                    await handler(req, res);
                }
                return;
            } else {
                // API endpoint not found
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'API endpoint not found' }));
                return;
            }
        } catch (error) {
            console.error('API Error:', error);
            console.error('Stack:', error.stack);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            }));
            return;
        }
    }

    // Serve static files
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not Found');
        return;
    }

    // Get file extension
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    // Read and serve file
    fs.readFile(filePath, (error, content) => {
        if (error) {
            res.writeHead(500);
            res.end('Server Error');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}/`);
    console.log(`\n📝 Test URLs:`);
    console.log(`   Registration: http://localhost:${PORT}/ezotera-frontend/auth/register.html`);
    console.log(`   Login:        http://localhost:${PORT}/ezotera-frontend/auth/login.html`);
    console.log(`\n✅ Press Ctrl+C to stop\n`);
});
