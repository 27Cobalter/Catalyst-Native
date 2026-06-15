import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "contest_spotlight_dismissed_ids";

export async function getDismissedContestSpotlightIds(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return new Set();

  try {
    const ids = JSON.parse(raw);
    if (!Array.isArray(ids)) return new Set();
    return new Set(ids.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

export async function dismissContestSpotlight(id: string): Promise<Set<string>> {
  const ids = await getDismissedContestSpotlightIds();
  ids.add(id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  return ids;
}

export async function resetDismissedContestSpotlightIds(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
