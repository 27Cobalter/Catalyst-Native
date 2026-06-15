import {
  getDismissedContestSpotlightIds,
  resetDismissedContestSpotlightIds,
} from "@/models/contest-spotlight";
import { RotateCcw } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { withUniwind } from "uniwind";

const ResetIcon = withUniwind(RotateCcw);

export default function DebugSettingsPage() {
  const [dismissedContestCount, setDismissedContestCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  const loadDismissedContestCount = useCallback(async () => {
    const ids = await getDismissedContestSpotlightIds();
    setDismissedContestCount(ids.size);
  }, []);

  useEffect(() => {
    // AsyncStorage の現在値を初回表示に同期するため、この画面だけ effect 内で state を更新する。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDismissedContestCount()
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [loadDismissedContestCount]);

  const handleResetContestSpotlight = useCallback(async () => {
    setIsResetting(true);
    try {
      await resetDismissedContestSpotlightIds();
      setDismissedContestCount(0);
      Alert.alert("リセットしました", "非表示にしたコンテスト情報を再表示できるようにしました。");
    } finally {
      setIsResetting(false);
    }
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-light-background dark:bg-dark-background">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      <View className="mt-4 mx-4">
        <Text className="px-4 pb-1.5 text-xs text-light-gray dark:text-dark-gray uppercase">
          タイムライン
        </Text>
        <View className="overflow-hidden rounded-xl bg-light-surface dark:bg-dark-surface">
          <View className="border-b border-light-border px-4 py-3 dark:border-dark-border">
            <Text className="text-base text-light-text dark:text-dark-text">非表示にしたコンテスト情報</Text>
            <Text className="mt-0.5 text-xs text-light-text-muted dark:text-dark-text-muted">
              {dismissedContestCount}件のコンテストがタイムラインのスポットライトから非表示になっています。
            </Text>
          </View>

          <Pressable
            className="flex-row items-center gap-3 px-4 py-3 active:bg-light-surface-muted dark:active:bg-dark-surface-muted disabled:opacity-50"
            disabled={isResetting}
            onPress={handleResetContestSpotlight}
          >
            {isResetting ? (
              <ActivityIndicator size="small" />
            ) : (
              <ResetIcon size={20} className="text-light-tint dark:text-dark-tint" />
            )}
            <Text className="text-base font-semibold text-light-tint dark:text-dark-tint">
              コンテスト情報の非表示をリセット
            </Text>
          </Pressable>
        </View>
        <Text className="px-4 pt-1.5 text-xs text-light-gray dark:text-dark-gray">
          リセット後、条件に合うコンテスト情報がタイムライン上部に再表示されます。
        </Text>
      </View>
    </View>
  );
}
