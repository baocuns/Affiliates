/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'down-vn.img.susercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'cf.shopee.vn',
      },
    ],
  },
};

export default nextConfig;
