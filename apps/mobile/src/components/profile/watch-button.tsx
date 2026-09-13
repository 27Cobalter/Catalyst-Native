import {
  CatalystActionSheetItem,
  CatalystButton,
  CatalystButtonIcon,
  CatalystDivider,
  CatalystText,
} from "@/components/design-system";
import { useHaptics } from "@/hooks/use-haptics";
import { clientAtom } from "@/models/atoms/credential";
import type { CatalystUserWatchMode } from "@/models/sdk-types";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useAtomValue } from "jotai";
import { Bell, BellOff, BellRing, Check, Users } from "lucide-react-native";
import { type ComponentType, useCallback, useEffect, useRef, useState } from "react";
import { useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { withUniwind } from "uniwind";

const UniBell = withUniwind(Bell);
const UniBellOff = withUniwind(BellOff);
const UniBellRing = withUniwind(BellRing);
const UniCheck = withUniwind(Check);
const UniUsers = withUniwind(Users);

type ActiveWatchMode = Exclude<CatalystUserWatchMode, "none">;
type WatchOption = {
  mode: ActiveWatchMode;
  title: string;
  icon: ComponentType<{ size?: number; className?: string }>;
};

const WATCH_OPTIONS: WatchOption[] = [
  { mode: "all", title: "すべての投稿", icon: UniBellRing },
  { mode: "fleet", title: "Fleet", icon: UniBell },
  { mode: "followers_only", title: "フォロワー限定公開", icon: UniUsers },
];

type Props = {
  userId: string;
};

export const ProfileWatchButton = ({ userId }: Props) => {
  const client = useAtomValue(clientAtom);
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? "light";
  const sheet = useRef<BottomSheetModal>(null);
  const requestId = useRef(0);
  const [mode, setMode] = useState<CatalystUserWatchMode | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMode = useCallback(
    async (showError: boolean) => {
      const currentRequestId = ++requestId.current;
      try {
        const { data } = await client.catalyst.v1.user.id.watch.get({
          path: { id: userId },
          throwOnError: true,
        });
        if (requestId.current === currentRequestId) setMode(data.mode);
      } catch (error) {
        console.error("failed to fetch user notification settings", error);
        if (showError && requestId.current === currentRequestId) {
          Toast.show({ type: "error", text1: "エラー", text2: "投稿通知の取得に失敗しました" });
        }
      } finally {
        if (requestId.current === currentRequestId) setIsLoading(false);
      }
    },
    [client, userId],
  );

  const [prevUserId, setPrevUserId] = useState(userId);
  if (prevUserId !== userId) {
    setPrevUserId(userId);
    setMode(null);
    setIsLoading(true);
  }

  useEffect(() => {
    // loadMode fetches data and calls setState in a race-guarded callback (requestId ref); this is
    // the standard "fetch in an effect" pattern and not the derived-state anti-pattern this rule targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMode(false);

    return () => {
      requestId.current += 1;
    };
  }, [loadMode]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    [],
  );
  const handleUpdate = useCallback(
    async (nextMode: ActiveWatchMode) => {
      if (mode === null || isLoading) return;

      setIsLoading(true);
      try {
        if (mode === "none") {
          await client.catalyst.v1.user.id.watch.create({
            path: { id: userId },
            body: { mode: nextMode },
            throwOnError: true,
          });
        } else {
          await client.catalyst.v1.user.id.watch.patch({
            path: { id: userId },
            body: { mode: nextMode },
            throwOnError: true,
          });
        }

        setMode(nextMode);
        sheet.current?.dismiss();
        haptics.notification();
        Toast.show({ type: "success", text1: "投稿通知を設定しました" });
      } catch (error) {
        console.error("failed to update user notification settings", error);
        Toast.show({ type: "error", text1: "エラー", text2: "投稿通知の設定に失敗しました" });
      } finally {
        setIsLoading(false);
      }
    },
    [client, haptics, isLoading, mode, userId],
  );
  const handleRemove = useCallback(async () => {
    if (mode === null || mode === "none" || isLoading) return;

    setIsLoading(true);
    try {
      await client.catalyst.v1.user.id.watch.delete({
        path: { id: userId },
        throwOnError: true,
      });
      setMode("none");
      sheet.current?.dismiss();
      haptics.notification();
      Toast.show({ type: "success", text1: "投稿通知を解除しました" });
    } catch (error) {
      console.error("failed to remove user notification settings", error);
      Toast.show({ type: "error", text1: "エラー", text2: "投稿通知の解除に失敗しました" });
    } finally {
      setIsLoading(false);
    }
  }, [client, haptics, isLoading, mode, userId]);

  const isWatching = mode !== null && mode !== "none";
  const accessibilityLabel = mode === null ? "投稿通知を再読み込み" : isWatching ? "投稿通知を変更" : "投稿通知を設定";

  return (
    <>
      <CatalystButton
        size="sm"
        tone={isWatching ? "primary" : "secondary"}
        className="size-8 px-0"
        accessibilityLabel={accessibilityLabel}
        onPress={() => (mode === null ? void loadMode(true) : sheet.current?.present())}
        disabled={isLoading}
      >
        <CatalystButtonIcon>{isWatching ? <UniBellRing /> : <UniBell />}</CatalystButtonIcon>
      </CatalystButton>

      <BottomSheetModal
        ref={sheet}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme === "dark" ? "#1C1C1E" : "#FFFFFF" }}
        handleIndicatorStyle={{ backgroundColor: theme === "dark" ? "#48484A" : "#C7C7CC" }}
      >
        <BottomSheetView style={{ paddingBottom: insets.bottom * 2 }}>
          <View className="px-5 pb-2 pt-1">
            <CatalystText variant="title">投稿通知</CatalystText>
            <CatalystText variant="caption" tone="muted" className="mt-1">
              通知を受け取る投稿を選択してください
            </CatalystText>
          </View>
          {WATCH_OPTIONS.map((option, index) => (
            <View key={option.mode}>
              {index > 0 && <CatalystDivider className="ml-14 w-auto" />}
              <CatalystActionSheetItem
                icon={option.icon}
                title={
                  <View className="flex-row items-center justify-between gap-3">
                    <CatalystText variant="subtitle" className="text-[15px] font-semibold">
                      {option.title}
                    </CatalystText>
                    {mode === option.mode && <UniCheck size={20} className="text-light-tint dark:text-dark-tint" />}
                  </View>
                }
                onPress={() => handleUpdate(option.mode)}
                disabled={isLoading}
              />
            </View>
          ))}
          {isWatching && (
            <>
              <CatalystDivider className="my-2" />
              <CatalystActionSheetItem
                icon={UniBellOff}
                title="通知を解除"
                tone="destructive"
                onPress={handleRemove}
                disabled={isLoading}
              />
            </>
          )}
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
};
