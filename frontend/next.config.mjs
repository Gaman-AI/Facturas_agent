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
  // Suppress punycode deprecation warning from Next.js
  experimental: {
    suppressDeprecationWarnings: true,
  },
}

export default nextConfig
