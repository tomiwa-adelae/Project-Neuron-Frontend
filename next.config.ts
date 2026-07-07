import type { NextConfig } from "next"
import withSerwistInit from "@serwist/next"

// Serwist generates the service worker (public/sw.js) from app/sw.ts at build
// time and injects the precache manifest. Disabled in development so the SW's
// caching doesn't serve stale assets while iterating.
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
})

const nextConfig: NextConfig = {
  // Serwist adds a webpack config for SW generation. Next 16 defaults to
  // Turbopack (dev + build), which errors on a bare webpack config; an empty
  // turbopack config silences that. The production build runs `next build
  // --webpack` so Serwist's plugin actually emits public/sw.js.
  turbopack: {},
}

export default withSerwist(nextConfig)
