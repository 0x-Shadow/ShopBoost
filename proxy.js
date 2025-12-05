/**
 * Simple proxy server to handle waitlist submissions
 * Keeps ANON_KEY private and safe
 */

const http = require('http');
const https = require('https');
const url = require('url');

// Environment variables - keep keys safe
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set as environment variables');
}
const PORT = process.env.PORT || 3001;

const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Only allow POST to /api/waitlist
    if (req.method !== 'POST' || req.url !== '/api/waitlist') {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
    }

    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', async () => {
        try {
            // Parse request
            const { email, business } = JSON.parse(body);

            // Validate input
            if (!email || !business) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Missing email or business' }));
                return;
            }

            // Call Edge Function with ANON_KEY (kept private on backend)
            const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/waitlist`;
            const postData = JSON.stringify({ email, business });

            const options = new URL(edgeFunctionUrl);
            options.method = 'POST';
            options.headers = {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            };

            const proxyReq = https.request(options, (proxyRes) => {
                let responseBody = '';
                proxyRes.on('data', chunk => {
                    responseBody += chunk.toString();
                });

                proxyRes.on('end', () => {
                    res.writeHead(proxyRes.statusCode);
                    res.end(responseBody);
                });
            });

            proxyReq.on('error', (error) => {
                console.error('Error calling Edge Function:', error);
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Failed to process request' }));
            });

            proxyReq.write(postData);
            proxyReq.end();

        } catch (error) {
            console.error('Error:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    });
});

server.listen(PORT, () => {
    console.log(`✅ Proxy server running on http://localhost:${PORT}`);
    console.log(`📝 POST to http://localhost:${PORT}/api/waitlist`);
});
