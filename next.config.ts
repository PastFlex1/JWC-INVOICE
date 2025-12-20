import type {NextConfig} from 'next';

// Forcing a server restart to ensure new environment variables are loaded.
const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
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
  turbopack: {
    // 👇 raíz real del proyecto (donde está package.json)
    root: __dirname,
  },
};

export default nextConfig;
