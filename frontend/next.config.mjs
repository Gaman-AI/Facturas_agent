/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Enable standalone output for Docker builds
  output: 'standalone',
  // Suppress punycode deprecation warning from Next.js
  // Removed deprecated experimental option
}

export default nextConfig
