import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep rendering simple for the hackathon: every page is dynamic (auth, DB).
  // Flip these back on when you're ready to add use cache / Suspense boundaries.
  cacheComponents: false,
  partialPrefetching: false,
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
