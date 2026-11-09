const { resolveApiBaseUrl } = require('./src/services/apiBaseUrl');

module.exports = ({ config }) => {
  const isProductionBuild =
    process.env.EAS_BUILD_PROFILE === 'production' ||
    process.env.NODE_ENV === 'production' ||
    process.env.APP_ENV === 'production';

  if (isProductionBuild) {
    // Fail early during build time if EXPO_PUBLIC_API_URL is missing, insecure, private, or a placeholder (V-20)
    resolveApiBaseUrl({
      isDev: false,
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      platform: 'android',
    });
  }

  return {
    ...config,
    plugins: [...(config.plugins ?? []), 'expo-status-bar', 'expo-web-browser'],
  };
};

