/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Proxy /api/* to the Express backend (avoids CORS in dev and LAN access).
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? 'http://localhost:5000'
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }]
  },
}

export default nextConfig
