import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Internal tools UI — exported to apps/internal/out/ and served by Caddy on
  // the Droplet, which reverse-proxies /api and /auth to the Go API.
  output: "export",
  reactStrictMode: true,
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@odh/brand", "@odh/ui", "@odh/query"],
  // Linting is owned by the Turbo `lint` task (pnpm lint), not the build.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
