export default {
  expo: {
    name: "Wave",
    slug: "wave",
    owner: "tatatis-team",
    version: "1.1.5",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#111b21"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.socialsuite.wave",
      buildNumber: "1",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#111b21"
      },
      package: "com.socialsuite.wave",
      versionCode: 1,
      permissions: ["INTERNET"]
    },
    web: { favicon: "./assets/favicon.png" },
    extra: {
      apiUrl: process.env.API_URL || "http://10.0.2.2:3004/api",
      eas: { projectId: "835f4999-942f-4752-aebc-bf33de1a721d" }
    },
    plugins: [],
    scheme: "wave"
  }
};
