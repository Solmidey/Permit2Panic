/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@react-native-async-storage/async-storage": require.resolve("./shims/async-storage.js"),
    };
    return config;
  },
};

module.exports = nextConfig;
