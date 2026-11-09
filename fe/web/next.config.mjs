function getOriginFromUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null
  try {
    const parsed = new URL(rawUrl)
    return parsed.origin
  } catch {
    return null
  }
}

function buildCspHeader() {
  const isDev = process.env.NODE_ENV !== 'production'
  const apiOrigin = getOriginFromUrl(
    process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL
  )

  const connectSrc = [
    "'self'",
    ...(apiOrigin ? [apiOrigin] : []),
    "https://accounts.google.com",
    "https://www.googleapis.com",
    "https://maps.vietmap.vn",
    "https://*.vietmap.vn",
    "https://res.cloudinary.com",
    "https://api.payos.vn",
    "https://pay.payos.vn",
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
    ...(isDev ? ["ws:", "wss:"] : []),
  ]

  const styleSrc = [
    "'self'",
    "'unsafe-inline'",
    "https://fonts.googleapis.com",
    "https://unpkg.com",
    "https://maps.vietmap.vn",
    "https://accounts.google.com",
  ]

  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://unpkg.com",
    `style-src ${styleSrc.join(' ')}`,
    "img-src 'self' data: blob: https://res.cloudinary.com https://*.googleusercontent.com https://maps.vietmap.vn https://*.vietmap.vn",
    "font-src 'self' data: https://fonts.gstatic.com https://maps.vietmap.vn https://*.vietmap.vn",
    `connect-src ${connectSrc.join(' ')}`,
    "frame-src 'self' https://accounts.google.com https://pay.payos.vn",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://pay.payos.vn",
    "frame-ancestors 'self'",
  ]

  return cspDirectives.join('; ')
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // On Windows, Turbopack child worker processes for PostCSS/Tailwind evaluation
  // can occasionally hit IPC connection timeout or exit code 0 panic on fresh runs.
  // Using workerThreads strategy provides extra stability when running on Windows (win32).
  ...(process.platform === 'win32'
    ? {
        experimental: {
          turbopackPluginRuntimeStrategy: 'workerThreads',
        },
      }
    : {}),
  images: {
    unoptimized: true,
  },
  // Security headers including Content Security Policy (CSP) and COOP
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: buildCspHeader(),
          },
          // Google Sign-In uses a popup window (accounts.google.com) that communicates
          // back with the opener window using window.postMessage().
          // Default 'same-origin' isolates the browsing context and blocks postMessage from popups.
          // 'same-origin-allow-popups' maintains origin isolation while permitting OAuth popup postMessage flow.
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
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
