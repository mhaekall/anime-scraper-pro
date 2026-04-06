/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,
  serverExternalPackages: ['@neondatabase/serverless', 'better-auth', 'drizzle-orm'],
};

export default nextConfig;
