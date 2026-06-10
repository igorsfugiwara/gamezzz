/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'mery-catan.netlify.app' },
      { hostname: 'poke-trunfo.netlify.app' },
    ],
  },
};
module.exports = nextConfig;
