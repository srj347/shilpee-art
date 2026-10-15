import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: { root: __dirname },
  // The server build (npm run build:server) skips the type check to save memory on a small
  // instance. Types are checked on the developer's machine (npm run typecheck) before each push.
  typescript: { ignoreBuildErrors: process.env.SKIP_TYPECHECK === '1' },
}

export default nextConfig
