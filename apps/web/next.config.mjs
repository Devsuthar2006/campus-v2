/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // shared-types is a workspace TS package consumed directly (no prebuild step).
  transpilePackages: ['@campusly/shared-types'],
  webpack(config) {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
  async redirects() {
    return [
      {
        source: '/signin',
        destination: '/?view=signin',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
