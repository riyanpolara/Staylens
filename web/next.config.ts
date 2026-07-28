import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serve modern formats — AVIF first (~20-25% smaller than JPEG at the same
    // visual quality), WebP as the fallback for older browsers.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Airbnb-hosted property & host photos (both datasets)
      { protocol: "https", hostname: "a0.muscache.com" },
      // Stitch design placeholder imagery
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Premium landing editorial imagery (+ fallback)
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
};

export default nextConfig;
