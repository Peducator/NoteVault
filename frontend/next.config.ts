import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:5000/api/:path*",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/doc",
        destination: "/docs",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
