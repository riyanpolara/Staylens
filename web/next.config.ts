import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
