import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["bullmq", "ioredis", "postgres"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      { source: "/studio", destination: "/app", permanent: false },
      { source: "/studio/composer", destination: "/app/create", permanent: false },
      { source: "/studio/packs", destination: "/app/characters", permanent: false },
      { source: "/studio/packs/:id", destination: "/app/characters/:id", permanent: false },
      { source: "/studio/starters", destination: "/app/characters/new", permanent: false },
      { source: "/studio/jobs", destination: "/app/jobs", permanent: false },
    ];
  },
};

export default nextConfig;
