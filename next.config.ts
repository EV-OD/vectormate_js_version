import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // output: 'export', // ensures static export
  // basePath: '/vectormate_js_version', // always use GH Pages subpath
  // assetPrefix: '/vectormate_js_version/', // always use GH Pages assets

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
