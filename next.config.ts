import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  // Output standalone agar image Docker kecil (.next/standalone berisi server mandiri)
  output: "standalone",
  async rewrites() {
    return [
      {
        // Proxy data wilayah (wilayah.id tidak mengirim header CORS,
        // jadi fetch dari browser diproxy lewat server Next.js).
        source: "/api/wilayah/:path*",
        destination: "https://wilayah.id/api/:path*",
      },
    ];
  },
};

export default nextConfig;
