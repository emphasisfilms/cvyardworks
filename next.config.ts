import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Collapse the Vercel preview host and the bare apex onto the canonical www host
      // so Google only sees one copy of each page.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'cvyardworks.vercel.app' }],
        destination: 'https://www.cvyardworks.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'cvyardworks.com' }],
        destination: 'https://www.cvyardworks.com/:path*',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/admin/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/api/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mmkzpssjmkwrevgfebua.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
