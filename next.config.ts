import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  // Output standalone dihapus untuk deploy Vercel (menghindari ENOENT next-server.js.nft.json)
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
