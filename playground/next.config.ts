import type { NextConfig } from "next";
import { loadRootEnv } from "./app/prototypes/road-lab/server/env";

// Load secrets from the repo-root .env (gitignored) into process.env only. Never use the `env` option for keys:
// it inlines values into bundles. Next resets process.env after this file, so route handlers call loadRootEnv() too.
loadRootEnv();

const nextConfig: NextConfig = {
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
