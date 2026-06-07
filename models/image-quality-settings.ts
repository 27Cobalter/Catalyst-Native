import AsyncStorage from "@react-native-async-storage/async-storage";

export type TimelineImageQuality = "low" | "medium";

const STORAGE_KEYS = {
  quality: "timeline_image_quality",
  wifiUpgrade: "timeline_image_wifi_upgrade",
} as const;

export async function loadTimelineImageQuality(): Promise<TimelineImageQuality> {
  const value = await AsyncStorage.getItem(STORAGE_KEYS.quality);
  if (value === "low" || value === "medium") return value;
  return "low";
}

export async function saveTimelineImageQuality(quality: TimelineImageQuality): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.quality, quality);
}

export async function loadWifiUpgrade(): Promise<boolean> {
  const value = await AsyncStorage.getItem(STORAGE_KEYS.wifiUpgrade);
  return value === "true";
}

export async function saveWifiUpgrade(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.wifiUpgrade, enabled ? "true" : "false");
}
