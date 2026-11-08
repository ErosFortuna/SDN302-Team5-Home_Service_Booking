const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
  "img-src 'self' data: blob: https://res.cloudinary.com https://*.googleusercontent.com https://maps.vietmap.vn https://*.vietmap.vn",
  "font-src 'self' data: https://fonts.gstatic.com https://maps.vietmap.vn https://*.vietmap.vn",
  "connect-src 'self' https://accounts.google.com https://maps.vietmap.vn https://*.vietmap.vn https://res.cloudinary.com https://api.payos.vn https://pay.payos.vn https://fonts.googleapis.com https://fonts.gstatic.com ws: wss:",
  "frame-src 'self' https://accounts.google.com https://pay.payos.vn",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://pay.payos.vn",
  "frame-ancestors 'self'",
]

const cspHeader = cspDirectives.join('; ')

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Security headers including Content Security Policy (CSP)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
        ],
      },
    ]
  },
  // Proxy /api/* to the Express backend (avoids CORS in dev and LAN access).
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? 'http://localhost:5000'
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }]
  },
}

export default nextConfig
