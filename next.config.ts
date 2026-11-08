import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships its own Postgres engine; let Node load it directly.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
