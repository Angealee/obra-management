import type { NextConfig } from "next";

// ---------------------------------------------------------------------------
// Content-Security-Policy — now ENFORCED.
// Violations are blocked by the browser (no longer report-only). The policy is
// deliberately permissive enough for this app's known sources:
//   - 'unsafe-inline' / 'unsafe-eval' for scripts: Next.js inline hydration.
//   - 'unsafe-inline' for styles: the app uses inline styles throughout.
//   - Google Fonts (googleapis/gstatic), Supabase REST + Realtime, and https:
//     images (Supabase Storage avatars) are whitelisted below.
//
// If a legitimate feature breaks after deploy, switch the header key back to
// "Content-Security-Policy-Report-Only" (see securityHeaders) to un-block while
// you add the missing source — the violation is logged in the browser console.
// Hardening later means replacing 'unsafe-inline' for scripts with nonces.
// ---------------------------------------------------------------------------
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    // Supabase Storage avatars (public bucket) served through next/image.
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig;
