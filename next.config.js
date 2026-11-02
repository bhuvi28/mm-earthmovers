/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/models/hm-2021d',
        destination: '/models/hm-2021',
        permanent: true,
      },
      {
        source: '/models/hm-2021b',
        destination: '/models/hm-2021',
        permanent: true,
      },
      {
        source: '/models/hm-2021e',
        destination: '/models/hm-2021',
        permanent: true,
      },
      {
        source: '/models/beml-bg511',
        destination: '/models/beml-bg605',
        permanent: true,
      },
      {
        source: '/models/xcmg',
        destination: '/models/xcmg-sdlg',
        permanent: true,
      },
      {
        source: '/models/sdlg',
        destination: '/models/xcmg-sdlg',
        permanent: true,
      },
    ];
  },
}

module.exports = nextConfig
