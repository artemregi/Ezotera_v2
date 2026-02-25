// Local development server for testing API endpoints
require('dotenv').config({ path: '.env.local' });
const { validateEnvironment } = require('../lib/validateEnv');

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Import API handlers
const loginHandler           = require('./auth/login');
const registerHandler        = require('./auth/register');
const forgotPasswordHandler  = require('./auth/forgot-password');
const verifyOTPHandler       = require('./auth/verify-otp');
const resetPasswordHandler   = require('./auth/reset-password');
const palmUploadHandler      = require('./palmistry/upload');
const palmUnlockHandler      = require('./palmistry/unlock');
const { pool } = require('../lib/db');

const PORT = process.env.PORT || 3001;
const FRONTEND_DIR = path.join(__dirname, '../ezotera-frontend');

// Helper function to add Express-like methods to http response
function wrapResponse(res) {
    res.status = function(statusCode) {
        this.statusCode = statusCode;
        return this;
    };
    res.json = function(data) {
        this.setHeader('Content-Type', 'application/json');
        this.end(JSON.stringify(data));
    };
    return res;
}

// Helper function to serve static files
function serveStaticFile(pathname, res) {
    let filePath = path.join(FRONTEND_DIR, pathname);

    // If it's a directory, try index.html
    if (pathname === '/') {
        filePath = path.join(FRONTEND_DIR, 'index.html');
    }

    // Prevent directory traversal
    if (!filePath.startsWith(FRONTEND_DIR)) {
        res.writeHead(403);
        res.end(JSON.stringify({ success: false, message: 'Forbidden' }));
        return;
    }

    // Try to serve the file
    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.log(`❌ File not found: ${filePath}`);
            res.writeHead(404);
            res.end(JSON.stringify({ success: false, message: 'File not found', path: filePath }));
            return;
        }

        // Determine content type
        const ext = path.extname(filePath);
        const contentType = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml'
        }[ext] || 'text/plain';

        console.log(`✅ Serving: ${pathname}`);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Parse body for POST requests
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', async () => {
        try {
            if (body) {
                req.body = JSON.parse(body);
            } else {
                req.body = {};
            }

            console.log(`\n📨 ${req.method} ${pathname}`);

            // Wrap response to add Express-like methods
            wrapResponse(res);

            // Route requests
            if (pathname === '/api/auth/login' && req.method === 'POST') {
                await loginHandler(req, res);
            } else if (pathname === '/api/auth/register' && req.method === 'POST') {
                await registerHandler(req, res);
            } else if (pathname === '/api/auth/forgot-password' && req.method === 'POST') {
                await forgotPasswordHandler(req, res);
            } else if (pathname === '/api/auth/verify-otp' && req.method === 'POST') {
                await verifyOTPHandler(req, res);
            } else if (pathname === '/api/auth/reset-password' && req.method === 'POST') {
                await resetPasswordHandler(req, res);
            } else if (pathname === '/api/palmistry/upload') {
                await palmUploadHandler(req, res);
            } else if (pathname === '/api/palmistry/unlock') {
                await palmUnlockHandler(req, res);
            } else if (pathname === '/api/health' && req.method === 'GET') {
                // Health check endpoint
                try {
                    const result = await pool.query('SELECT NOW()');
                    res.writeHead(200);
                    res.end(JSON.stringify({
                        success: true,
                        message: 'Database connected',
                        timestamp: result.rows[0].now
                    }));
                } catch (error) {
                    res.writeHead(503);
                    res.end(JSON.stringify({
                        success: false,
                        message: 'Database connection failed',
                        error: error.message
                    }));
                }
            } else if (pathname === '/api/users' && req.method === 'GET') {
                // Get all users (for testing)
                try {
                    const result = await pool.query('SELECT id, email, name, created_at FROM public.users LIMIT 10');
                    res.writeHead(200);
                    res.end(JSON.stringify({
                        success: true,
                        count: result.rows.length,
                        users: result.rows
                    }));
                } catch (error) {
                    res.writeHead(500);
                    res.end(JSON.stringify({
                        success: false,
                        message: 'Failed to fetch users',
                        error: error.message
                    }));
                }
            } else {
                // Serve static files from frontend folder
                serveStaticFile(pathname, res);
            }
        } catch (error) {
            console.error('❌ Server error:', error);
            res.writeHead(500);
            res.end(JSON.stringify({
                success: false,
                message: 'Internal server error',
                error: error.message
            }));
        }
    });
});

server.listen(PORT, () => {
    // Validate environment on startup
    validateEnvironment();

    console.log(`\n🚀 Development server running at http://localhost:${PORT}`);
    console.log(`\n📝 Available endpoints:`);
    console.log(`   GET  http://localhost:${PORT}/api/health                 - Check DB connection`);
    console.log(`   GET  http://localhost:${PORT}/api/users                  - List all users`);
    console.log(`   POST http://localhost:${PORT}/api/auth/login             - Login user`);
    console.log(`   POST http://localhost:${PORT}/api/auth/register          - Register user`);
    console.log(`   POST http://localhost:${PORT}/api/auth/forgot-password   - Request password reset OTP`);
    console.log(`   POST http://localhost:${PORT}/api/auth/verify-otp        - Verify OTP`);
    console.log(`   POST http://localhost:${PORT}/api/auth/reset-password    - Reset password with OTP`);
    console.log(`   POST http://localhost:${PORT}/api/palmistry/upload       - Palmistry analysis`);
    console.log(`   POST http://localhost:${PORT}/api/palmistry/unlock       - Unlock full reading`);
    console.log(`\n⚙️  Environment check:`);
    console.log(`   POSTGRES_URL: ${process.env.POSTGRES_URL ? '✅ Set' : '❌ Not set'}`);
    console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Not set'}`);
    console.log(`   SMTP_HOST: ${process.env.SMTP_HOST ? '✅ Set' : '❌ Not set'}`);
    console.log(`   SMTP_PORT: ${process.env.SMTP_PORT ? '✅ Set' : '❌ Not set'}`);
    console.log(`   SMTP_USER: ${process.env.SMTP_USER ? '✅ Set' : '❌ Not set'}`);
    console.log(`   SMTP_PASS: ${process.env.SMTP_PASS ? '✅ Set' : '❌ Not set'}`);
    console.log(`   SMTP_FROM: ${process.env.SMTP_FROM ? '✅ Set' : '❌ Not set'}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
});
