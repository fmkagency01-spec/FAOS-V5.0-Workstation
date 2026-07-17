/** @type {import('next').NextConfig} */
const backend = (process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_FAOS_BACKEND_URL ||
  "")
  .trim()
  .replace(/\/+$/, "");

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Rewrite helpers — internal route avoids build-time env dependency.
  async rewrites() {
    const rules = [
      {
        source: "/render-health",
        destination: "/api/render-health",
      },
    ];

    if (backend) {
      rules.push({
        source: "/render-api/:path*",
        destination: `${backend}/api/:path*`,
      });
    }

    return rules;
  },
};

export default nextConfig;
