/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "https://homeland-ram-stress-cloud.trycloudflare.com",
  },
};

module.exports = nextConfig;