import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  sassOptions: {
  additionalData: `
    @use "@/assets/styles/mixins" as *;
    @use "@/assets/styles/variables" as *;
  `,
},
  async rewrites() {
    return [
      {
        source: '/@:nickname/:hash',
        destination: '/share/:nickname/:hash',
      },
    ];
  },
};

export default nextConfig;
