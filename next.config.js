/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dejá distDir solo si realmente lo necesitás
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // ✅ estable para VPS
  output: "standalone",

  // ✅ images optimizadas + Cloudinary permitido
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

module.exports = nextConfig;