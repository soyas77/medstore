/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    // Ensures shadcn/lucide tree-shaking works well
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default nextConfig;
