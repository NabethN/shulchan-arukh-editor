/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, { isServer }) {
    // מפעילים תמיכה ב-WASM
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // מונעים שגיאות בטעינת הקובץ
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });

    return config;
  },
};

export default nextConfig;