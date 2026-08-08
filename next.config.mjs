/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "palevioletred-lark-270684.hostingersite.com"
      },
      {
        protocol: "https",
        hostname: "photo-b2b-autoaction.storage.googleapis.com"
      },
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/savol-seminovos-local/**"
      }
    ]
  }
};

export default nextConfig;
