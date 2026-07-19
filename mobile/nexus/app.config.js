export default {
  expo: {
    name: "Facebook",
    slug: "facebook",
    owner: "tatatis-team",
    version: "1.1.6",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#475569"
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
        backgroundColor: "#475569"
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
        projectId: "48736074-ca8b-4e74-9e76-4b75c32e9b36"
      }
    },
    plugins: [],
    scheme: "facebook"
  }
};
