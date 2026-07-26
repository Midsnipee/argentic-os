/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "https://crew-gets-vip-pathology.trycloudflare.com",
  },
};

module.exports = nextConfig;