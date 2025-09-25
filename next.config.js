// next.config.js - ENHANCED CORS Configuration for Vue App
/** @type {import(‘next’).NextConfig} */
const nextConfig = {
// Enable CORS for session API endpoints
async headers() {
return [
{
// Apply CORS headers to all session API routes
source: ’/api/app/session/:path*’,
headers: [
{
key: ‘Access-Control-Allow-Origin’,
value: process.env.NEXT_PUBLIC_APP_URL || ‘https://app.scansnap.io’,
},
{
key: ‘Access-Control-Allow-Methods’,
value: ‘GET, POST, PUT, DELETE, OPTIONS’,
},
{
key: ‘Access-Control-Allow-Headers’,
value: ‘Content-Type, Authorization, X-Requested-With, Accept, Origin’,
},
{
key: ‘Access-Control-Allow-Credentials’,
value: ‘true’,
},
{
key: ‘Access-Control-Max-Age’,
value: ‘86400’, // 24 hours - cache preflight
},
],
},
{
// Also allow CORS for any other API routes the app might need
source: ‘/api/:path*’,
headers: [
{
key: ‘Access-Control-Allow-Origin’,
value: process.env.NEXT_PUBLIC_APP_URL || ‘https://app.scansnap.io’,
},
{
key: ‘Access-Control-Allow-Methods’,
value: ‘GET, POST, PUT, DELETE, OPTIONS’,
},
{
key: ‘Access-Control-Allow-Headers’,
value: ‘Content-Type, Authorization, X-Requested-With, Accept, Origin’,
},
{
key: ‘Access-Control-Allow-Credentials’,
value: ‘true’,
},
],
},
]
},
}

module.exports = nextConfig
