import type { NextConfig } from "next";

// Images uploaded to Supabase Storage are served from the project's own host.
const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : undefined;
  } catch {
    return undefined;
  }
})();

const supabaseOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";
  } catch {
    return "";
  }
})();

/**
 * Content Security Policy: which sites the browser may load code, frames and data from.
 * - Supabase: data, sign-in and uploads (https and its realtime websocket)
 * - Google Analytics and AdSense: only loaded after cookie consent, but allowed here
 * - YouTube (privacy-enhanced) for videos; Cloudflare Turnstile for the spam check
 * Next.js needs inline scripts for page data, so 'unsafe-inline' stays for scripts; everything
 * else (plugins, framing by other sites, form posts elsewhere) is shut.
 */
const google = "https://*.google.com https://*.googlesyndication.com https://*.doubleclick.net https://*.googletagmanager.com https://*.google-analytics.com https://*.googleadservices.com https://*.adtrafficquality.google";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com ${google}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https:`,
  "font-src 'self' data:",
  `media-src 'self' blob: ${supabaseOrigin}`,
  `connect-src 'self' ${supabaseOrigin} ${supabaseOrigin.replace(/^http/, "ws")} https://challenges.cloudflare.com ${google}`,
  `frame-src https://www.youtube-nocookie.com https://challenges.cloudflare.com ${google}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(supabaseOrigin.startsWith("https://") ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Browsers remember to use HTTPS for two years (only sent over HTTPS).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Photo uploads go through server actions (default limit 1 MB). Photos are capped at 8 MB;
  // videos are uploaded straight from the browser to Supabase Storage.
  experimental: { serverActions: { bodySizeLimit: "9mb" } },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      ...(supabaseHost ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }] : []),
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
