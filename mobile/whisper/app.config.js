export default {
  expo: {
    name: "Whisper",
    slug: "whisper",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#181818"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.socialsuite.whisper",
      buildNumber: "1"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#181818"
      },
      package: "com.socialsuite.whisper",
      versionCode: 1,
      permissions: ["INTERNET"]
    },
    web: { favicon: "./assets/favicon.png" },
    extra: {
      apiUrl: process.env.API_URL || "http://10.0.2.2:3005/api",
      eas: { projectId: "whisper-social-suite" }
    },
    plugins: [],
    scheme: "whisper"
  }
};
