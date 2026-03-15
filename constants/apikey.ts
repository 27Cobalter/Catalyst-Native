import { Platform } from "react-native";

export const API_KEY = Platform.select({
  ios: {
    clientId: process.env.EXPO_PUBLIC_CATALYST_FOR_IOS_CLIENT_ID,
    clientSecret: process.env.EXPO_PUBLIC_CATALYST_FOR_IOS_CLIENT_SECRET,
    redirectUri: "com.natsuneko.catalyst://authorize",
  },
  android: {
    clientId: process.env.EXPO_PUBLIC_CATALYST_FOR_ANDROID_CLIENT_ID,
    clientSecret: process.env.EXPO_PUBLIC_CATALYST_FOR_ANDROID_CLIENT_SECRET,
    redirectUri: __DEV__ ? "exp+catalyst-native://authorize" : "com.natsuneko.catalyst://authorize",
  },
  web: {
    clientId: "",
    clientSecret: "",
    redirectUri: "",
  },
  macos: {
    clientId: "",
    clientSecret: "",
    redirectUri: "",
  },
  windows: {
    clientId: "",
    clientSecret: "",
    redirectUri: "",
  },
  native: {
    clientId: "",
    clientSecret: "",
    redirectUri: "",
  },
});
