import type { NextConfig } from "next";
import { loadRootEnv } from "./app/prototypes/road-lab/server/env";

// Load secrets from the repo-root .env (gitignored) into process.env only. Never use the `env` option for keys:
// it inlines values into bundles. Next resets process.env after this file, so route handlers call loadRootEnv() too.
loadRootEnv();

const nextConfig: NextConfig = {
  // Let phones on the local network (e.g. an iPhone hotspot, 172.20.10.x) load dev resources.
  allowedDevOrigins: ["172.20.10.*", "192.168.*.*", "10.*.*.*"],
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
