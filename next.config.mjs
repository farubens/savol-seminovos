/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "palevioletred-lark-270684.hostingersite.com"
      }
    ]
  }
};

export default nextConfig;
