import type { NextConfig } from "next";

// ─── Build-time diagnostic ────────────────────────────────────────────────────
// This line prints the API base URL in the Vercel build log so we can confirm
// the environment variable is actually available during compilation.
// REMOVE this line once the deployment issue is resolved.
console.warn(
  "🔍 [next.config] NEXT_PUBLIC_PERRY_API_BASE_URL =",
  process.env.NEXT_PUBLIC_PERRY_API_BASE_URL ?? "(undefined — env var not found!)"
);

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
