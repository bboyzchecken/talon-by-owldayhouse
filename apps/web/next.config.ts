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
};

export default nextConfig;
