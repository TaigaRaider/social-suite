export default {
  expo: {
    name: "Facebook",
    slug: "facebook",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#1877f2"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.socialsuite.facebook",
      buildNumber: "1"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#1877f2"
      },
      package: "com.socialsuite.facebook",
      versionCode: 1,
      permissions: ["INTERNET"]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      apiUrl: process.env.API_URL || "http://10.0.2.2:3001/api",
      eas: {
        projectId: "facebook-social-suite"
      }
    },
    plugins: [],
    scheme: "facebook"
  }
};
