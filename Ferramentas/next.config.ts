import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/ferramentas",
  serverExternalPackages: ["sharp", "heic-convert", "pdfkit", "muhammara", "xlsx", "mongodb"],
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "src"),
    };
    return config;
  },
};

export default nextConfig;
