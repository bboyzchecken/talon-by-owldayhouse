import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static marketing site — exported to apps/web/out/ for FTP/CDN.
  output: "export",
  reactStrictMode: true,
  trailingSlash: true,
  images: { unoptimized: true },
  // Compile workspace packages (incl. their next/font + Tailwind classes).
  transpilePackages: ["@odh/brand", "@odh/ui"],
  // Linting is owned by the Turbo `lint` task (pnpm lint), not the build.
  eslint: { ignoreDuringBuilds: true },
  // Import *.html as a raw string (used by the hidden /owl-docs tool to inline
  // its self-contained generator into an <iframe srcDoc>). Webpack only — this
  // project's dev + export builds both run on webpack (no --turbopack).
  webpack: (config) => {
    config.module.rules.push({ test: /\.html$/i, type: "asset/source" });
    return config;
  },
};

export default nextConfig;
