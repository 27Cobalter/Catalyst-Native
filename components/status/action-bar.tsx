import { cn } from "@/lib/utils";
import { accountAtom } from "@/models/atoms/account";
import { clientAtom } from "@/models/atoms/credential";
import type { CatalystStatus, CatalystStatusV1_1 } from "@/models/sdk-types";
import { useAtomValue } from "jotai";
import { Heart, Repeat2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import Toast from "react-native-toast-message";
import { withUniwind } from "uniwind";

const UniHeart = withUniwind(Heart);
const UniRepeat2 = withUniwind(Repeat2);

type Props = {
  isDefaultFavorited: boolean;
  isDefaultReposted: boolean;
  status: CatalystStatus | CatalystStatusV1_1;
};

type StatusRepostState = {
  visitor?: {
    repostable?: boolean;
  };
};

export const ActionBar = ({ isDefaultFavorited, isDefaultReposted, status }: Props) => {
  const account = useAtomValue(accountAtom);
  const client = useAtomValue(clientAtom);
  const isLoggedIn = !!account?.user;
  const [isFavorited, setIsFavorited] = useState(isDefaultFavorited);
  const [isReposted, setIsReposted] = useState(isDefaultReposted);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [isTogglingRepost, setIsTogglingRepost] = useState(false);
  const isRepostable = (status as StatusRepostState).visitor?.repostable ?? true;

  const resetKey = `${status.id}:${isDefaultFavorited}:${isDefaultReposted}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setIsFavorited(isDefaultFavorited);
    setIsReposted(isDefaultReposted);
  }

  const toggleFavorite = useCallback(async () => {
    if (!account?.credential.client || !status.id || isTogglingFavorite) return;
    setIsTogglingFavorite(true);

    try {
      if (isFavorited) {
        await client.catalyst.v1.status.id.favorite.delete({ path: { id: status.id }, throwOnError: true });
        setIsFavorited(false);
      } else {
        await client.catalyst.v1.status.id.favorite.create({ path: { id: status.id }, throwOnError: true });
        setIsFavorited(true);
      }
    } catch (e) {
      Toast.show({ type: "error", text1: "エラー", text2: "お気に入りの操作に失敗しました" });
      console.error(e);
    } finally {
      setIsTogglingFavorite(false);
    }
  }, [account, client, status.id, isFavorited, isTogglingFavorite]);

  const toggleRepost = useCallback(async () => {
    if (!account?.credential.client || !status.id || isTogglingRepost || !isRepostable) return;
    setIsTogglingRepost(true);

    try {
      if (isReposted) {
        await client.catalyst.v1.status.id.repost.delete({ path: { id: status.id }, throwOnError: true });
        setIsReposted(false);
      } else {
        await client.catalyst.v1.status.id.repost.create({ path: { id: status.id }, throwOnError: true });
        setIsReposted(true);
      }
    } catch (e) {
      Toast.show({ type: "error", text1: "エラー", text2: "リポストの操作に失敗しました" });
      console.error(e);
    } finally {
      setIsTogglingRepost(false);
    }
  }, [account, client, status.id, isReposted, isRepostable, isTogglingRepost]);

  return (
    <View className="flex-row items-center">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isFavorited ? "お気に入りを解除" : "お気に入りに追加"}
        onPress={toggleFavorite}
        disabled={isTogglingFavorite || !isLoggedIn}
        className={cn(
          "h-9 min-w-9 items-center justify-center rounded-full border border-light-border bg-light-surface px-2 active:opacity-75 dark:border-dark-border dark:bg-dark-surface-muted",
          isFavorited && "border-light-error bg-light-error-background dark:border-dark-error dark:bg-dark-error-background",
          (!isLoggedIn || isTogglingFavorite) && "opacity-30",
        )}
      >
        <UniHeart
          size={20}
          className={cn(isFavorited ? "text-light-error dark:text-dark-error" : "text-light-icon dark:text-dark-icon")}
          fill={isFavorited ? "#FF3B30" : "none"}
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isReposted ? "リポストを取り消す" : "リポストする"}
        onPress={toggleRepost}
        disabled={isTogglingRepost || !isLoggedIn || !isRepostable}
        className={cn(
          "ml-2 h-9 min-w-9 items-center justify-center rounded-full border border-light-border bg-light-surface px-2 active:opacity-75 dark:border-dark-border dark:bg-dark-surface-muted",
          isReposted && "border-light-tint bg-light-info-background dark:border-dark-tint dark:bg-dark-info-background",
          (!isLoggedIn || !isRepostable || isTogglingRepost) && "opacity-30",
        )}
      >
        <UniRepeat2
          size={20}
          className={cn(isReposted ? "text-light-tint dark:text-dark-tint" : "text-light-icon dark:text-dark-icon")}
        />
      </Pressable>
    </View>
  );
};
