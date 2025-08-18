import type { NextConfig } from "next";

// App Router is auto-detected by the presence of the /app directory.
// Add runtime rewrites so any "/api/*" calls get proxied to the external backend.
const backendURL = process.env.NEXT_PUBLIC_API_URL;

const nextConfig: NextConfig = {
  async rewrites() {
    if (!backendURL) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${backendURL.replace(/\/$/, "")}/:path*`,
      },
    ];
  },
};

export default nextConfig;
