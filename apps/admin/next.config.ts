import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@helpmytravel/shared'],
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3001'] },
  },
};

export default nextConfig;
