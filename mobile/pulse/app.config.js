export default {
  expo: {
    name: "Pulse",
    slug: "pulse",
    owner: "tatatis-team",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#1a1a2e"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.socialsuite.pulse",
      buildNumber: "1"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#1a1a2e"
      },
      package: "com.socialsuite.pulse",
      versionCode: 1,
      permissions: ["INTERNET"]
    },
    web: { favicon: "./assets/favicon.png" },
    extra: {
      apiUrl: process.env.API_URL || "http://10.0.2.2:3003/api",
      eas: { projectId: "51c967aa-eb9b-496a-bcf1-4d1429daf102" }
    },
    plugins: [],
    scheme: "pulse"
  }
};
