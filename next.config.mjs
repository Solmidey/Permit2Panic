import path from "path";

const nextConfig = {
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@react-native-async-storage/async-storage": path.resolve("./src/shims/async-storage.ts"),
    };
    return config;
  },
};

export default nextConfig;
