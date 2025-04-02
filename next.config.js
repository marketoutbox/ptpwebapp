/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,  // Enables strict mode for React debugging
  swcMinify: true,        // Enables SWC compiler for faster builds
  asyncHeaders() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Allow all origins (modify for security)
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type",
          },
        ],
      },
    ];
  },
  images: {
    domains: ["query1.finance.yahoo.com"], // Allow fetching stock images if needed
  },
  experimental: {
    appDir: true, // Enable experimental features (if using App Router)
  },
};

module.exports = nextConfig;
