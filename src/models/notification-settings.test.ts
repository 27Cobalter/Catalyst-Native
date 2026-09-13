import { resetAsyncStorageMock } from "@/test/helpers/async-storage";
import {
  PUSH_NOTIFICATION_TYPES,
  checkTokenRegistration,
  loadEnabledTypes,
  loadPushEnabled,
  loadSavedFcmToken,
  registerTokenToBackend,
  saveEnabledTypes,
  savePushEnabled,
} from "./notification-settings";

jest.mock("@react-native-async-storage/async-storage");
jest.mock("@react-native-firebase/messaging", () => ({
  AuthorizationStatus: {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  },
  getMessaging: jest.fn(),
  getToken: jest.fn(),
  hasPermission: jest.fn(),
  requestPermission: jest.fn(),
  onTokenRefresh: jest.fn(),
}));

describe("notification settings (storage)", () => {
  beforeEach(() => {
    resetAsyncStorageMock();
  });

  it("push 通知は未保存時デフォルトで false", async () => {
    expect(await loadPushEnabled()).toBe(false);
  });

  it("push 通知の有効/無効が往復する", async () => {
    await savePushEnabled(true);
    expect(await loadPushEnabled()).toBe(true);
  });

  it("有効タイプは未保存時、全タイプがデフォルトで有効", async () => {
    const types = await loadEnabledTypes();

    expect(types).toEqual(new Set(PUSH_NOTIFICATION_TYPES.map((t) => t.key)));
  });

  it("有効タイプの一部だけを保存すると、その内容だけが復元される", async () => {
    await saveEnabledTypes(new Set(["reaction", "mention"]));

    const types = await loadEnabledTypes();
    expect(types).toEqual(new Set(["reaction", "mention"]));
  });

  it("FCM トークン未保存時は null", async () => {
    expect(await loadSavedFcmToken()).toBeNull();
  });
});

describe("notification settings (backend)", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it("FCM トークンに対応するサーバーの購読状態を取得する", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ isSubscribed: true }),
    });

    await expect(checkTokenRegistration("fcm-token", "access-token")).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.natsuneko.com/steambird/v1/fcm/check",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          token: "fcm-token",
        }),
      }),
    );
  });

  it("FCM トークンをサーバーへ登録する", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await registerTokenToBackend("fcm-token", "access-token");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.natsuneko.com/steambird/v1/fcm",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          token: "fcm-token",
          platform: "ios",
          deviceId: "",
        }),
      }),
    );
  });
});
