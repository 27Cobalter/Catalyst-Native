import {
  CatalystBadge,
  CatalystBadgeText,
  CatalystButton,
  CatalystButtonText,
  CatalystDivider,
  CatalystEmptyState,
  CatalystListItemContent,
  CatalystText,
} from "@/components/design-system";
import { accountAtom } from "@/models/atoms/account";
import { openUrlWithBrowser } from "@/models/browser-settings";
import type { CatalystActivityPubSettings } from "@/models/sdk-types";
import { useAtomValue } from "jotai";
import { ExternalLink, Globe2 } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import { withUniwind } from "uniwind";

const UniExternalLink = withUniwind(ExternalLink);
const UniGlobe2 = withUniwind(Globe2);

const statePresentation: Record<
  CatalystActivityPubSettings["state"],
  { label: string; tone: "neutral" | "success" | "warning" | "danger" }
> = {
  unavailable: { label: "有効化条件を満たしていません", tone: "warning" },
  eligible: { label: "有効化できます", tone: "neutral" },
  active: { label: "連合中", tone: "success" },
  retired: { label: "連合終了済み", tone: "danger" },
};

const eligibilityMessage: Record<CatalystActivityPubSettings["eligibilityReason"], string> = {
  "screen-name-required": "先にアカウント設定でユーザー名を変更し、確定してください。",
  suspended: "凍結中のアカウントでは ActivityPub を有効化できません。",
  "account-deleted": "このアカウントでは ActivityPub を有効化できません。",
};

export default function ActivityPubSettingsPage() {
  const account = useAtomValue(accountAtom);
  const [settings, setSettings] = useState<CatalystActivityPubSettings | null>(null);
  const [isLoading, setIsLoading] = useState(() => account !== null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!account) {
      return;
    }
    account.credential.client.catalyst.v1.activitypub.settings
      .get({ throwOnError: true })
      .then(({ data }) => setSettings(data))
      .catch(() => setSettings(null))
      .finally(() => setIsLoading(false));
  }, [account]);

  const updateFederation = useCallback(
    async (action: "enable" | "retire") => {
      if (!account || isSaving) return;
      setIsSaving(true);
      try {
        const response =
          action === "enable"
            ? await account.credential.client.catalyst.v1.activitypub.settings.create({ throwOnError: true })
            : await account.credential.client.catalyst.v1.activitypub.settings.delete({ throwOnError: true });
        setSettings(response.data);
        Alert.alert(action === "enable" ? "ActivityPub 連合を開始しました" : "ActivityPub 連合を終了しました");
      } catch {
        Alert.alert("エラー", "ActivityPub 設定を更新できませんでした。時間をおいて再度お試しください。");
      } finally {
        setIsSaving(false);
      }
    },
    [account, isSaving],
  );

  const confirmEnable = () => {
    Alert.alert(
      "ActivityPub 連合を開始しますか？",
      "プロフィールと投稿の複製が外部サーバーへ保存される可能性があります。有効化後は未公開状態へ戻せません。",
      [
        { text: "キャンセル", style: "cancel" },
        { text: "連合を開始", onPress: () => updateFederation("enable") },
      ],
    );
  };

  const confirmRetire = () => {
    Alert.alert(
      "ActivityPub 連合を完全に終了しますか？",
      "この操作は取り消せず、同じ Actor を再有効化できません。外部サーバー上の複製が確実に削除される保証はありません。",
      [
        { text: "キャンセル", style: "cancel" },
        { text: "連合を終了", style: "destructive", onPress: () => updateFederation("retire") },
      ],
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-light-surface-muted dark:bg-dark-background">
        <ActivityIndicator />
      </View>
    );
  }

  if (!account) {
    return (
      <View className="flex-1 bg-light-surface-muted dark:bg-dark-background">
        <CatalystEmptyState title="ログインが必要です" description="ログインすると連合設定を確認できます。" />
      </View>
    );
  }

  if (!settings) {
    return (
      <View className="flex-1 bg-light-surface-muted dark:bg-dark-background">
        <CatalystEmptyState title="連合設定を取得できませんでした" description="時間をおいて再度お試しください。" />
      </View>
    );
  }

  if (!settings.rolloutEligible && (settings.state === "eligible" || settings.state === "unavailable")) {
    return (
      <View className="flex-1 bg-light-surface-muted dark:bg-dark-background">
        <CatalystEmptyState
          title="ActivityPub はまだ利用できません"
          description="この機能は段階的に提供されています。利用可能になるまでお待ちください。"
          icon={<UniGlobe2 />}
        />
      </View>
    );
  }

  const state = statePresentation[settings.state];
  const handle = `@${account.user.screenName}@catalyst.natsuneko.com`;

  return (
    <ScrollView className="flex-1 bg-light-surface-muted dark:bg-dark-background" contentContainerClassName="pb-8">
      <View className="items-center gap-3 px-6 py-6">
        <View className="size-16 items-center justify-center rounded-full bg-light-info-background dark:bg-dark-info-background">
          <UniGlobe2 size={32} className="text-light-info dark:text-dark-info" />
        </View>
        <CatalystText variant="title" className="text-center">
          ActivityPub 連合
        </CatalystText>
        <CatalystText tone="muted" className="text-center">
          Mastodon や Misskey など、外部の対応サービスからプロフィールと公開投稿を参照できるようにします。
        </CatalystText>
        <CatalystBadge tone={state.tone}>
          <CatalystBadgeText>{state.label}</CatalystBadgeText>
        </CatalystBadge>
      </View>

      <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
        連合上の識別情報
      </CatalystText>
      <View className="bg-light-background dark:bg-dark-surface">
        <View className="min-h-16 flex-row items-center px-5 py-3">
          <CatalystListItemContent>
            <CatalystText variant="subtitle">ActivityPub ハンドル</CatalystText>
            <CatalystText variant="caption" tone="muted" className="font-mono" selectable>
              {handle}
            </CatalystText>
          </CatalystListItemContent>
        </View>
        {settings.actorUri ? (
          <>
            <CatalystDivider className="ml-5 w-auto" />
            <Pressable
              accessibilityRole="link"
              className="min-h-16 flex-row items-center gap-3 px-5 py-3 active:opacity-75"
              onPress={() => openUrlWithBrowser(settings.actorUri!)}
            >
              <CatalystListItemContent>
                <CatalystText variant="subtitle">Actor URI</CatalystText>
                <CatalystText variant="caption" tone="link" numberOfLines={1}>
                  {settings.actorUri}
                </CatalystText>
              </CatalystListItemContent>
              <UniExternalLink size={16} className="text-light-icon dark:text-dark-icon" />
            </Pressable>
          </>
        ) : null}
      </View>

      <CatalystText variant="caption" tone="subtle" className="px-5 pb-2 pt-6">
        連合ライフサイクル
      </CatalystText>
      <View className="gap-4 bg-light-background px-5 py-4 dark:bg-dark-surface">
        {settings.state === "eligible" ? (
          <>
            <CatalystText tone="muted">
              プロフィールと今後の公開投稿を外部サーバーから参照可能にします。過去の公開投稿も URL または Outbox
              から取得可能になります。
            </CatalystText>
            <CatalystButton onPress={confirmEnable} disabled={isSaving}>
              {isSaving ? <ActivityIndicator size="small" /> : null}
              <CatalystButtonText>連合を開始</CatalystButtonText>
            </CatalystButton>
          </>
        ) : null}
        {settings.state === "active" ? (
          <>
            <CatalystText tone="muted">既知の外部サーバーへ削除を通知し、新しい配送を停止します。</CatalystText>
            <CatalystButton tone="danger" onPress={confirmRetire} disabled={isSaving}>
              {isSaving ? <ActivityIndicator size="small" /> : null}
              <CatalystButtonText>連合を終了</CatalystButtonText>
            </CatalystButton>
          </>
        ) : null}
        {settings.state === "unavailable" ? (
          <CatalystText tone="muted">
            {eligibilityMessage[settings.eligibilityReason] ?? "このアカウントでは現在有効化できません。"}
          </CatalystText>
        ) : null}
        {settings.state === "retired" ? (
          <CatalystText tone="muted">Actor URI は削除済み Actor として保持され、再有効化できません。</CatalystText>
        ) : null}
      </View>

      <CatalystText variant="caption" tone="subtle" className="px-5 pt-3 leading-4">
        一度外部サーバーへ配送されたプロフィールや投稿は、削除通知後も相手側に残る可能性があります。
      </CatalystText>
    </ScrollView>
  );
}
