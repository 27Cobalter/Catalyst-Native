import {
  CatalystDivider,
  CatalystListItemContent,
  CatalystSwitch,
  CatalystText,
} from "@/components/design-system";
import { accountAtom } from "@/models/atoms/account";
import { streamingEnabledAtom } from "@/models/atoms/streaming";
import {
  PUSH_NOTIFICATION_TYPES,
  checkTokenRegistration,
  getAuthorizationStatus,
  getFcmToken,
  loadEnabledTypes,
  loadPushEnabled,
  loadSavedFcmToken,
  onTokenRefresh,
  openSystemSettings,
  registerTokenToBackend,
  requestAuthorization,
  saveEnabledTypes,
  saveFcmToken,
  savePushEnabled,
  showPermissionDeniedAlert,
  unregisterTokenFromBackend,
} from "@/models/notification-settings";
import { saveStreamingEnabled } from "@/models/streaming-settings";
import { useAtom, useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

type WeeklyThemeSubscription = {
  notifyOnOpen: boolean;
  notifyOnStreak: boolean;
  notifyBeforeClose: boolean;
};

export default function NotificationSettingsPage() {
  const account = useAtomValue(accountAtom);
  const isLoggedIn = !!account;

  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [authStatus, setAuthStatus] = useState<string>("notDetermined");
  const [enabledTypes, setEnabledTypes] = useState<Set<string>>(new Set());
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyThemeSubscription, setWeeklyThemeSubscription] = useState<WeeklyThemeSubscription | null>(null);
  const [isWeeklyThemeSubscriptionUpdating, setIsWeeklyThemeSubscriptionUpdating] = useState(false);
  const [isStreamingEnabled, setIsStreamingEnabled] =
    useAtom(streamingEnabledAtom);

  // 初期化時にサーバーの購読状態を正としてローカル設定を同期する
  useEffect(() => {
    let ignore = false;

    const initialize = async () => {
      const [pushEnabled, types, status, savedToken] = await Promise.all([
        loadPushEnabled(),
        loadEnabledTypes(),
        getAuthorizationStatus(),
        loadSavedFcmToken(),
      ]);

      if (ignore) return;
      setIsLoading(true);

      const currentToken = account ? await getFcmToken() : null;
      const token = currentToken ?? savedToken;
      if (currentToken && currentToken !== savedToken) {
        await saveFcmToken(currentToken);
      }

      let synchronizedPushEnabled = pushEnabled;
      if (account && token) {
        try {
          synchronizedPushEnabled = await checkTokenRegistration(
            token,
            account.credential.accessToken,
          );
          await savePushEnabled(synchronizedPushEnabled);
        } catch (error) {
          if (__DEV__) {
            console.warn("FCM registration sync failed", error);
          }
        }
      }

      if (ignore) return;
      setIsPushEnabled(synchronizedPushEnabled);
      setEnabledTypes(types);
      setAuthStatus(status);
      setFcmToken(token);
      setIsLoading(false);
    };

    initialize().catch((error) => {
      if (__DEV__) {
        console.warn("Notification settings initialization failed", error);
      }
      if (!ignore) setIsLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, [account]);

  // FCMトークンのリフレッシュを監視
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    onTokenRefresh(async (token) => {
      setFcmToken(token);
      await saveFcmToken(token);
      if (isPushEnabled && account) {
        await registerTokenToBackend(token, account.credential.accessToken);
      }
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      unsubscribe?.();
    };
  }, [isPushEnabled, account]);

  useEffect(() => {
    let ignore = false;
    if (!account) {
      return;
    }
    const weeklyThemes = account.credential.client.catalyst.v1.weeklyThemes;
    if (!weeklyThemes) return;

    weeklyThemes.subscription
      .get({ throwOnError: true })
      .then(({ data }) => {
        if (!ignore) setWeeklyThemeSubscription(data);
      })
      .catch(() => {
        if (!ignore) setWeeklyThemeSubscription(null);
      });

    return () => {
      ignore = true;
    };
  }, [account]);

  const isEffectivelyEnabled =
    isPushEnabled &&
    (authStatus === "authorized" || authStatus === "provisional");

  // Push通知トグル
  const handlePushToggle = useCallback(
    async (newValue: boolean) => {
      if (!isLoggedIn) return;

      if (newValue) {
        // ONにする場合
        if (authStatus === "authorized" || authStatus === "provisional") {
          // 既に許可済み
          setIsPushEnabled(true);
          await savePushEnabled(true);
          const token = await getFcmToken();
          if (token && account) {
            setFcmToken(token);
            await saveFcmToken(token);
            await registerTokenToBackend(token, account.credential.accessToken);
          }
        } else if (authStatus === "denied") {
          // 拒否済み → 設定画面へ誘導
          showPermissionDeniedAlert();
        } else {
          // 未決定 → 許可リクエスト
          const granted = await requestAuthorization();
          const newStatus = await getAuthorizationStatus();
          setAuthStatus(newStatus);

          if (granted) {
            setIsPushEnabled(true);
            await savePushEnabled(true);
            const token = await getFcmToken();
            if (token && account) {
              setFcmToken(token);
              await saveFcmToken(token);
              await registerTokenToBackend(
                token,
                account.credential.accessToken,
              );
            }
          }
        }
      } else {
        // OFFにする場合
        setIsPushEnabled(false);
        await savePushEnabled(false);
        const savedToken = await loadSavedFcmToken();
        if (savedToken && account) {
          await unregisterTokenFromBackend(
            savedToken,
            account.credential.accessToken,
          );
        }
      }
    },
    [isLoggedIn, authStatus, account],
  );

  // 通知タイプのトグル
  const handleTypeToggle = useCallback(
    async (key: string, newValue: boolean) => {
      const newTypes = new Set(enabledTypes);
      if (newValue) {
        newTypes.add(key);
      } else {
        newTypes.delete(key);
      }
      setEnabledTypes(newTypes);
      await saveEnabledTypes(newTypes);
    },
    [enabledTypes],
  );

  const handleStreamingToggle = useCallback(
    async (newValue: boolean) => {
      if (!isLoggedIn) return;

      setIsStreamingEnabled(newValue);
      await saveStreamingEnabled(newValue);
    },
    [isLoggedIn, setIsStreamingEnabled],
  );

  const handleWeeklyThemeSubscriptionToggle = useCallback(
    async (key: keyof WeeklyThemeSubscription, value: boolean) => {
      if (!account || !weeklyThemeSubscription || isWeeklyThemeSubscriptionUpdating) return;
      const weeklyThemes = account.credential.client.catalyst.v1.weeklyThemes;
      if (!weeklyThemes) return;

      const previous = weeklyThemeSubscription;
      const next = { ...previous, [key]: value };
      setWeeklyThemeSubscription(next);
      setIsWeeklyThemeSubscriptionUpdating(true);
      try {
        const { data } = await weeklyThemes.subscription.patch({
          body: next,
          throwOnError: true,
        });
        setWeeklyThemeSubscription(data);
      } catch {
        setWeeklyThemeSubscription(previous);
      } finally {
        setIsWeeklyThemeSubscriptionUpdating(false);
      }
    },
    [account, isWeeklyThemeSubscriptionUpdating, weeklyThemeSubscription],
  );

  const footerText = (() => {
    if (!isLoggedIn) return "ログインするとPush通知を受け取ることができます。";
    if (authStatus === "denied") return null; // 「設定を開く」ボタンを表示
    if (isPushEnabled && !fcmToken) return "通知の設定中です...";
    if (isPushEnabled) return "通知を受け取る準備ができました。";
    return "通知をオンにすると、重要な情報をすぐに確認できます。";
  })();

  if (isLoading) {
    return (
      <View className="flex-1 bg-light-surface-muted dark:bg-dark-background" />
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-light-surface-muted dark:bg-dark-background"
      contentContainerClassName="pb-8"
    >
      {/* セクション1: 全体設定 */}
      <View className="pt-2">
        <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
          通知設定
        </CatalystText>
        <View className="bg-light-background dark:bg-dark-surface">
          <View className="min-h-16 flex-row items-center px-5 py-3">
            <CatalystListItemContent className="mr-3">
              <CatalystText
                variant="subtitle"
                className="text-[15px] font-semibold"
              >
                Push通知
              </CatalystText>
              {
                <CatalystText variant="caption" tone="muted">
                  {isPushEnabled
                    ? "通知を受け取ります"
                    : "通知を受け取りません"}
                </CatalystText>
              }
            </CatalystListItemContent>
            <CatalystSwitch
              value={isPushEnabled}
              onValueChange={handlePushToggle}
              disabled={!isLoggedIn}
            />
          </View>
        </View>

        {/* フッター */}
        {authStatus === "denied" && isLoggedIn ? (
          <View className="px-5 pt-2">
            <Pressable onPress={openSystemSettings}>
              <CatalystText variant="label" tone="tint">
                設定を開く
              </CatalystText>
            </Pressable>
            <CatalystText
              variant="caption"
              tone="danger"
              className="mt-1 leading-4"
            >
              通知がオフになっています。端末の設定から通知を有効にしてください。
            </CatalystText>
          </View>
        ) : footerText ? (
          <CatalystText
            variant="caption"
            tone="subtle"
            className="px-5 pt-2 leading-4"
          >
            {footerText}
          </CatalystText>
        ) : null}
      </View>

      {/* セクション2: 通知タイプ別設定 */}
      {
        <View className="mt-6">
          <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
            通知の種類
          </CatalystText>
          <View className="bg-light-background dark:bg-dark-surface">
            {PUSH_NOTIFICATION_TYPES.map((type, index) => (
              <View key={type.key}>
                <View className="min-h-16 flex-row items-center px-5 py-3">
                  <CatalystListItemContent className="mr-3">
                    <CatalystText
                      variant="subtitle"
                      className="text-[15px] font-semibold"
                    >
                      {type.displayName}
                    </CatalystText>
                    <CatalystText variant="caption" tone="muted">
                      {type.description}
                    </CatalystText>
                  </CatalystListItemContent>
                  <CatalystSwitch
                    value={enabledTypes.has(type.key)}
                    onValueChange={(v) => handleTypeToggle(type.key, v)}
                    disabled={!isEffectivelyEnabled}
                  />
                </View>
                {index < PUSH_NOTIFICATION_TYPES.length - 1 && (
                  <CatalystDivider className="ml-5 w-auto" />
                )}
              </View>
            ))}
          </View>
          <CatalystText
            variant="caption"
            tone="subtle"
            className="px-5 pt-2 leading-4"
          >
            受け取りたい通知の種類を選択してください。
          </CatalystText>
        </View>
      }

      <View className="mt-6">
        <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
          お題
        </CatalystText>
        <View className="bg-light-background dark:bg-dark-surface">
          <View className="min-h-16 flex-row items-center px-5 py-3">
            <CatalystListItemContent className="mr-3">
              <CatalystText variant="subtitle" className="text-[15px] font-semibold">新しいお題</CatalystText>
              <CatalystText variant="caption" tone="muted">毎週月曜日に開催されるお題をお知らせします</CatalystText>
            </CatalystListItemContent>
            <CatalystSwitch
              value={weeklyThemeSubscription?.notifyOnOpen ?? false}
              onValueChange={(value) => handleWeeklyThemeSubscriptionToggle("notifyOnOpen", value)}
              disabled={!isLoggedIn || !weeklyThemeSubscription || isWeeklyThemeSubscriptionUpdating}
            />
          </View>
          <CatalystDivider className="ml-5 w-auto" />
          <View className="min-h-16 flex-row items-center px-5 py-3">
            <CatalystListItemContent className="mr-3">
              <CatalystText variant="subtitle" className="text-[15px] font-semibold">連続参加ボーナス</CatalystText>
              <CatalystText variant="caption" tone="muted">連続参加のボーナス獲得時にお知らせします</CatalystText>
            </CatalystListItemContent>
            <CatalystSwitch
              value={weeklyThemeSubscription?.notifyOnStreak ?? false}
              onValueChange={(value) => handleWeeklyThemeSubscriptionToggle("notifyOnStreak", value)}
              disabled={!isLoggedIn || !weeklyThemeSubscription || isWeeklyThemeSubscriptionUpdating}
            />
          </View>
          <CatalystDivider className="ml-5 w-auto" />
          <View className="min-h-16 flex-row items-center px-5 py-3">
            <CatalystListItemContent className="mr-3">
              <CatalystText variant="subtitle" className="text-[15px] font-semibold">終了前のお知らせ</CatalystText>
              <CatalystText variant="caption" tone="muted">お題の終了前にお知らせします</CatalystText>
            </CatalystListItemContent>
            <CatalystSwitch
              value={weeklyThemeSubscription?.notifyBeforeClose ?? false}
              onValueChange={(value) => handleWeeklyThemeSubscriptionToggle("notifyBeforeClose", value)}
              disabled={!isLoggedIn || !weeklyThemeSubscription || isWeeklyThemeSubscriptionUpdating}
            />
          </View>
        </View>
        <CatalystText variant="caption" tone="subtle" className="px-5 pt-2 leading-4">
          お題の通知は、初期設定ではオフです。
        </CatalystText>
      </View>

      <View className="mt-6">
        <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
          リアルタイム更新
        </CatalystText>
        <View className="bg-light-background dark:bg-dark-surface">
          <View className="min-h-16 flex-row items-center px-5 py-3">
            <CatalystListItemContent className="mr-3">
              <CatalystText
                variant="subtitle"
                className="text-[15px] font-semibold"
              >
                ストリーミング接続
              </CatalystText>
              <CatalystText variant="caption" tone="muted">
                投稿のリアクションを開いている間に自動更新します
              </CatalystText>
            </CatalystListItemContent>
            <CatalystSwitch
              value={isStreamingEnabled}
              onValueChange={handleStreamingToggle}
              disabled={!isLoggedIn}
            />
          </View>
        </View>
        <CatalystText
          variant="caption"
          tone="subtle"
          className="px-5 pt-2 leading-4"
        >
          streaming.natsuneko.com への WebSocket 接続を使用します。
        </CatalystText>
      </View>

      {/* デバッグ情報 */}
      {__DEV__ && (
        <View className="mt-6">
          <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
            デバッグ情報
          </CatalystText>
          <View className="bg-light-background dark:bg-dark-surface">
            <View className="flex-row items-center justify-between px-5 py-3">
              <CatalystText tone="muted">システム許可状態</CatalystText>
              <CatalystText tone="muted">
                {authStatus === "notDetermined"
                  ? "未決定"
                  : authStatus === "denied"
                    ? "拒否"
                    : authStatus === "authorized"
                      ? "許可"
                      : "暫定許可"}
              </CatalystText>
            </View>
            <CatalystDivider className="ml-5 w-auto" />
            <View className="px-5 py-3">
              {fcmToken ? (
                <View>
                  <CatalystText variant="caption" tone="muted" className="mb-1">
                    FCMトークン
                  </CatalystText>
                  <CatalystText variant="mono" tone="muted" selectable>
                    {fcmToken}
                  </CatalystText>
                </View>
              ) : (
                <CatalystText variant="caption" tone="muted">
                  FCMトークン: 未取得
                </CatalystText>
              )}
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
