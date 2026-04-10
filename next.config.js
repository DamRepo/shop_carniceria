/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dejá distDir solo si realmente lo necesitás
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // ✅ estable para VPS
  output: "standalone",

  poweredByHeader: false,

  // ✅ images optimizadas + Cloudinary permitido
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 días
  },

  // ✅ Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // ✅ Redirect del dominio deprecado al dominio actual (301 permanente)
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "carniceriaelnegro.tech" }],
        destination: "https://carniceriaelnegro.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.carniceriaelnegro.tech" }],
        destination: "https://carniceriaelnegro.com/:path*",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;