/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true, // Use SWC for minification instead of Terser
  images: {
    domains: ["gateway.pinata.cloud", "amber-fascinating-bee-454.mypinata.cloud"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.mypinata.cloud",
        pathname: "/ipfs/**",
      },
      {
        protocol: "https",
        hostname: "gateway.pinata.cloud",
        pathname: "/ipfs/**",
      },
    ],
  },
  // Disable webpack5 minification plugin which is causing the error
  webpack: (config, { dev, isServer }) => {
    // Only apply in production builds
    if (!dev) {
      // Find and remove the MinifyPlugin that's causing issues
      config.optimization.minimizer = config.optimization.minimizer.filter(
        (minimizer) => !minimizer.constructor.name.includes("MinifyPlugin") && !minimizer.options?.minifyOptions,
      )
    }

    return config
  },
}

module.exports = nextConfig
