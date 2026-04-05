/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { nextRuntime }) => {
    if (nextRuntime === 'edge') {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        perf_hooks: false,
        fs: false,
        dns: false,
        os: false,
        path: false,
        child_process: false,
      };
    }
    return config;
  },
};

export default nextConfig;
