import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AuthorizationStatus,
  onTokenRefresh as firebaseOnTokenRefresh,
  getMessaging,
  getToken,
  hasPermission,
  requestPermission,
} from "@react-native-firebase/messaging";
import { Alert, Linking, PermissionsAndroid, Platform } from "react-native";

// Push通知の種類
export type PushNotificationType = {
  key: string;
  rawValue: string;
  displayName: string;
  description: string;
};

export const PUSH_NOTIFICATION_TYPES: PushNotificationType[] = [
  {
    key: "reaction",
    rawValue: "natsuneko-laboratory:reaction:increment",
    displayName: "リアクション",
    description: "投稿にリアクションが付いたとき",
  },
  {
    key: "fleetReaction",
    rawValue: "natsuneko-laboratory:fleet:reaction:increment",
    displayName: "Fleetのリアクション",
    description: "Fleet にリアクションが付いたとき",
  },
  {
    key: "follow",
    rawValue: "natsuneko-laboratory:follow:increment",
    displayName: "フォロー",
    description: "新しくフォローされたとき",
  },
  {
    key: "message",
    rawValue: "natsuneko-laboratory:message",
    displayName: "メッセージ",
    description: "新しいメッセージを受信したとき",
  },
  {
    key: "mention",
    rawValue: "natsuneko-laboratory:mention",
    displayName: "メンション",
    description: "メンションされたとき",
  },
];

const STORAGE_KEYS = {
  pushEnabled: "notification_push_enabled",
  enabledTypes: "notification_enabled_types",
  fcmToken: "notification_fcm_token",
} as const;

const FCM_ENDPOINT = "https://api.natsuneko.com/steambird/v1/fcm";

export type { AuthorizationStatus };

type AppAuthorizationStatus = "notDetermined" | "denied" | "authorized" | "provisional";

function mapAuthorizationStatus(status: number): AppAuthorizationStatus {
  switch (status) {
    case AuthorizationStatus.NOT_DETERMINED:
      return "notDetermined";
    case AuthorizationStatus.DENIED:
      return "denied";
    case AuthorizationStatus.AUTHORIZED:
      return "authorized";
    case AuthorizationStatus.PROVISIONAL:
      return "provisional";
    default:
      return "notDetermined";
  }
}

export async function getAuthorizationStatus(): Promise<AppAuthorizationStatus> {
  const status = await hasPermission(getMessaging());
  return mapAuthorizationStatus(status);
}

// granted: 許可された / denied: 拒否された / blocked: ダイアログを出せないため端末の設定から許可してもらう必要がある
export type AuthorizationRequestResult = "granted" | "denied" | "blocked";

export async function requestAuthorization(): Promise<AuthorizationRequestResult> {
  if (Platform.OS === "android") {
    // Android 12 以下は実行時パーミッションが無く、オフなら設定から戻してもらうしかない
    if (Platform.Version < 33) return "blocked";

    // Android 13+ は未要求でも「拒否」扱いになるため、まずダイアログを出す。
    // 2 回拒否されるとダイアログを出さずに never_ask_again が返る
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    if (result === PermissionsAndroid.RESULTS.GRANTED) return "granted";
    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return "blocked";
    return "denied";
  }

  const status = await requestPermission(getMessaging(), {
    alert: true,
    sound: true,
    badge: true,
  });

  return status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL
    ? "granted"
    : "denied";
}

export async function getFcmToken(): Promise<string | null> {
  try {
    const token = await getToken(getMessaging());
    return token;
  } catch {
    return null;
  }
}

export async function onTokenRefresh(callback: (token: string) => void) {
  return firebaseOnTokenRefresh(getMessaging(), callback);
}

export async function loadPushEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(STORAGE_KEYS.pushEnabled);
  return value === "true";
}

export async function savePushEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.pushEnabled, enabled ? "true" : "false");
}

export async function loadEnabledTypes(): Promise<Set<string>> {
  const value = await AsyncStorage.getItem(STORAGE_KEYS.enabledTypes);
  if (value) {
    const keys: string[] = JSON.parse(value);
    return new Set(keys);
  }
  // デフォルトは全タイプ有効
  return new Set(PUSH_NOTIFICATION_TYPES.map((t) => t.key));
}

export async function saveEnabledTypes(types: Set<string>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.enabledTypes, JSON.stringify([...types]));
}

export async function loadSavedFcmToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.fcmToken);
}

export async function saveFcmToken(token: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.fcmToken, token);
}

export async function clearFcmToken(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.fcmToken);
}

// バックエンドAPI
export async function checkTokenRegistration(
  token: string,
  accessToken: string,
): Promise<boolean> {
  const response = await fetch(`${FCM_ENDPOINT}/check`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw new Error(`FCM registration check failed: ${response.status}`);
  }

  const data: unknown = await response.json();
  if (
    !data ||
    typeof data !== "object" ||
    !("isSubscribed" in data) ||
    typeof data.isSubscribed !== "boolean"
  ) {
    throw new Error("FCM registration check returned an invalid response");
  }

  return data.isSubscribed;
}

export async function registerTokenToBackend(
  token: string,
  accessToken: string,
): Promise<void> {
  const requestBody = {
    token,
    platform: Platform.OS,
    deviceId: "",
  };

  const response = await fetch(FCM_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (__DEV__) {
    console.log(`FCM register response: ${response.status}`);
  }

  if (!response.ok) {
    throw new Error(`FCM registration failed: ${response.status}`);
  }
}

export async function unregisterTokenFromBackend(token: string, accessToken: string): Promise<void> {
  const response = await fetch(FCM_ENDPOINT, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });

  if (__DEV__) {
    console.log(`FCM unregister response: ${response.status}`);
  }
}

export function openSystemSettings(): void {
  if (Platform.OS === "ios") {
    Linking.openURL("app-settings:");
  } else if (Platform.OS === "android") {
    Linking.openSettings();
  }
}

export function showPermissionDeniedAlert(onOpenSettings?: () => void): void {
  const message =
    Platform.OS === "ios"
      ? "通知を受け取るには、iOSの設定でCatalystの通知を許可してください。"
      : "通知を受け取るには、端末の設定でCatalystの通知を許可してください。";

  Alert.alert("通知がオフになっています", message, [
    {
      text: "設定を開く",
      onPress: () => {
        onOpenSettings?.();
        openSystemSettings();
      },
    },
    { text: "キャンセル", style: "cancel" },
  ]);
}

export function showEnableFailedAlert(): void {
  Alert.alert("通知を有効にできませんでした", "通信環境を確認して、もう一度お試しください。");
}
