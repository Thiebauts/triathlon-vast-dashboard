import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Next.js to bundle papaparse (needed for server-side CSV reading)
  serverExternalPackages: [],
};

export default nextConfig;
