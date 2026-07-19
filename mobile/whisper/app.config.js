export default {
  expo: {
    name: "Whisper",
    slug: "whisper",
    owner: "tatatis-team",
    version: "1.1.6",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#d97706"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.socialsuite.whisper",
      buildNumber: "1",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#d97706"
      },
      package: "com.socialsuite.whisper",
      versionCode: 1,
      permissions: ["INTERNET"]
    },
    web: { favicon: "./assets/favicon.png" },
    extra: {
      apiUrl: process.env.API_URL || "http://10.0.2.2:3005/api",
      eas: { projectId: "54e25cbe-9a96-4dbc-bf51-bd5592819072" }
    },
    plugins: [],
    scheme: "whisper"
  }
};
