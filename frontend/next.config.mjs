/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Prevents double mounting socket connections in development
  output: "standalone"
};

export default nextConfig;
