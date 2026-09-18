import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["bullmq", "ioredis", "postgres"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
