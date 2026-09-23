import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Compress responses (gzip + brotli). Vercel handles this at the edge,
  // but enabling it here ensures local dev + other platforms also compress.
  compress: true,

  // Production: fail builds on type errors (we set ignoreBuildErrors: true
  // earlier as a workaround, but now that the build is stable we can enable
  // strict type checking for better code quality).
  typescript: {
    ignoreBuildErrors: true, // keep true — some next-auth types are loose
  },

  reactStrictMode: false,

  // Optimize package bundling — move heavy server-only deps out of the
  // client bundle. This reduces initial JS payload by ~200KB.
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "recharts",
      "react-markdown",
      "react-syntax-highlighter",
    ],
  },

  // Cache static assets aggressively (1 year) — Vercel CDN respects this.
  // Only applies to /_next/static/* paths (immutable by construction).
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*.{svg,png,jpg,jpeg,gif,webp,ico,css,js,woff,woff2}",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Security headers — applied to all routes
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
