import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, "../../"),
  async rewrites() {
    const internalGateway =
      process.env.INTERNAL_GATEWAY_URL ||
      process.env.NEXT_PUBLIC_GATEWAY_URL ||
      "http://localhost:8080";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${internalGateway}/api/v1/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.susercontent.com",
      },
      {
        protocol: "https",
        hostname: "down-id.img.susercontent.com",
      },
      {
        protocol: "https",
        hostname: "**.shopee.co.id",
      },
      {
        protocol: "https",
        hostname: "cf.shopee.co.id",
      },
      {
        protocol: "https",
        hostname: "**.shopeemobile.com",
      },
      {
        protocol: "https",
        hostname: "deo.shopeemobile.com",
      },
      {
        protocol: "https",
        hostname: "**.tokopedia-static.net",
      },
      {
        protocol: "https",
        hostname: "*.tokopedia-static.net",
      },
    ],
  },
};

export default nextConfig;
