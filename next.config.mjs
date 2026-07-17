/** @type {import('next').NextConfig} */
const rawBackend = (process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_FAOS_BACKEND_URL ||
  "")
  .trim()
  .replace(/\/+$/, "");

const backendV5 = rawBackend
  ? rawBackend.endsWith("/api/v5")
    ? rawBackend
    : `${rawBackend}/api/v5`
  : "";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    dirs: ["app", "lib", "scripts"],
  },
  // Rewrite helpers — internal route avoids build-time env dependency.
  async rewrites() {
    const rules = [
      {
        source: "/render-health",
        destination: "/api/render-health",
      },
      {
        source: "/harvest",
        destination: "/api/harvest",
      },
    ];

    if (backendV5) {
      rules.push({
        source: "/render-api/:path*",
        destination: `${backendV5}/:path*`,
      });
    }

    return rules;
  },
};

export default nextConfig;
