import { Platform } from "react-native";

export const isIPad = Platform.OS === "ios" && Platform.isPad;
export const POST_COLUMNS = isIPad ? 4 : 3;
export const MEDIA_COLUMNS = isIPad ? 3 : 2;
export const LIST_COLUMNS = isIPad ? 2 : 1;
