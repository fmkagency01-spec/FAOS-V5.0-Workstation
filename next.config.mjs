/** @type {import('next').NextConfig} */
const backend = (process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_FAOS_BACKEND_URL ||
  "")
  .trim()
  .replace(/\/+$/, "");

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Optional edge rewrite helpers when a Render base URL is configured.
  async rewrites() {
    if (!backend) return [];
    return [
      {
        source: "/render-health",
        destination: `${backend}/`,
      },
      {
        source: "/render-api/:path*",
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
