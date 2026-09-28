import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    runtimeCaching: [
      // 1. Google Fonts
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          },
        },
      },
      // 2. Images & Cloudinary Assets (Stale-While-Revalidate)
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "image-cache",
          expiration: {
            maxEntries: 120,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },
      // 3. Public catalog, CMS, and settings APIs
      {
        urlPattern:
          /\/api\/v1\/(?:categories|products|hero-sliders|settings|offers|cms|reviews).*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-cache",
          networkTimeoutSeconds: 5,
          expiration: {
            maxEntries: 60,
            maxAgeSeconds: 60 * 60 * 24, // 1 day
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      // 4. Next.js Data JSON
      {
        urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "next-data",
          networkTimeoutSeconds: 5,
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 60 * 60 * 24,
          },
        },
      },
    ],
  },
});

const getBackendTargetUrl = (): string => {
  const envUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    (process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, "")
      : "") ||
    process.env.VITE_BACKEND_URL ||
    "http://localhost:3000";
  return envUrl.trim().replace(/\/+$/, "");
};

const nextConfig: NextConfig = {
  turbopack: {},
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
     
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
    ],
  },
  env: {
    VITE_BACKEND_URL: process.env.VITE_BACKEND_URL || "",
  },
  async rewrites() {
    const backendTarget = getBackendTargetUrl();
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendTarget}/api/v1/:path*`,
      },
    ];
  },
  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.DefinePlugin({
        "import.meta.env.VITE_BACKEND_URL": JSON.stringify(
          process.env.VITE_BACKEND_URL || ""
        ),
      })
    );
    return config;
  },
};

export default withPWA(nextConfig);
