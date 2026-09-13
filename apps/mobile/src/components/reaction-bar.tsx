import { emojis } from "@/lib/generated/emojis";
import { getCustomReactionId, getReactionClipboardValue } from "@/lib/reactions";
import { cn } from "@/lib/utils";
import { accountAtom } from "@/models/atoms/account";
import type { CatalystReaction } from "@/models/sdk-types";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { useAtomValue } from "jotai";
import { Plus } from "lucide-react-native";
import { useCallback, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { withUniwind } from "uniwind";

const UniPlus = withUniwind(Plus);
const UniImage = withUniwind(Image);

const isUnicodeCodepoint = (symbol: string): boolean => {
  return /^[0-9a-f]+$/i.test(symbol) && symbol in emojis;
};

type Props = {
  reactions: Record<string, CatalystReaction>;
  onReact?: (symbol: string, url?: string, customReactionId?: string) => void;
  onUnreact?: (symbol: string, customReactionId?: string) => void;
  onAddReaction?: () => void;
};

export const ReactionBar = ({ reactions, onReact, onUnreact, onAddReaction }: Props) => {
  const account = useAtomValue(accountAtom);
  const didLongPressRef = useRef(false);
  const entries = Object.entries(reactions);

  const handleCopyReaction = useCallback(
    async (key: string, reaction: CatalystReaction) => {
      const customReactionId = getCustomReactionId(key, reaction);
      let ownCustomReactionIds: ReadonlySet<string> = new Set();

      if (customReactionId && account) {
        ownCustomReactionIds = await account.credential.client.catalyst.v1.customReactions
          .get({ throwOnError: true })
          .then(({ data }) => new Set(data.items.map((item) => item.id)))
          .catch(() => new Set<string>());
      }

      const value = getReactionClipboardValue({
        symbol: reaction.symbol,
        customReactionId,
        ownCustomReactionIds,
      });

      try {
        await Clipboard.setStringAsync(value);
        Toast.show({ type: "success", text1: "リアクションIDをコピーしました" });
      } catch {
        Toast.show({ type: "error", text1: "リアクションIDのコピーに失敗しました" });
      }
    },
    [account],
  );

  return (
    <View className="flex-row flex-wrap items-center gap-1.5 py-1">
      {entries
        .filter(([, reaction]) => reaction.count >= 1)
        .map(([key, reaction]) => {
          const customReactionId = getCustomReactionId(key, reaction);
          const canToggle = !reaction.isRemoteOnly && Boolean(onReact || onUnreact);

          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`${reaction.symbol} ${reaction.count}件のリアクション`}
              accessibilityHint={
                reaction.isRemoteOnly
                  ? "長押しでリアクションIDをコピーできます。外部サービス由来のため、リアクションの追加や削除はできません"
                  : "長押しでリアクションIDをコピーできます"
              }
              onPressIn={() => {
                didLongPressRef.current = false;
              }}
              onLongPress={(event) => {
                event.stopPropagation();
                didLongPressRef.current = true;
                void handleCopyReaction(key, reaction);
              }}
              onPress={(event) => {
                event.stopPropagation();
                if (didLongPressRef.current) return;
                if (!canToggle) return;
                if (reaction.hasSelfReaction) {
                  onUnreact?.(reaction.symbol, customReactionId);
                } else {
                  onReact?.(reaction.symbol, reaction.url, customReactionId);
                }
              }}
              className={cn(
                "min-h-8 flex-row items-center gap-1 rounded-full border px-2 py-1 active:opacity-75",
                reaction.isRemoteOnly && "opacity-60",
                reaction.hasSelfReaction
                  ? "border-light-toggle-border bg-light-toggle dark:border-dark-toggle-border dark:bg-dark-toggle"
                  : "border-light-divider bg-light-surface dark:border-dark-divider dark:bg-dark-surface-muted",
              )}
            >
              {reaction.emoji ? (
                <Text className="text-lg leading-none">{reaction.emoji}</Text>
              ) : isUnicodeCodepoint(reaction.symbol) ? (
                <UniImage
                  source={emojis[reaction.symbol as keyof typeof emojis]}
                  className="size-5"
                  contentFit="contain"
                />
              ) : (
                <UniImage source={{ uri: reaction.url }} className="size-5" contentFit="contain" />
              )}
              <Text
                className={cn(
                  "text-[13px] font-semibold leading-none",
                  reaction.hasSelfReaction
                    ? "text-light-toggle-foreground dark:text-dark-toggle-foreground"
                    : "text-light-text-muted dark:text-dark-text-muted",
                )}
              >
                {reaction.count}
              </Text>
            </Pressable>
          );
        })}
      {onAddReaction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="リアクションを追加"
          onPress={onAddReaction}
          className="min-h-8 min-w-8 items-center justify-center rounded-full border border-light-divider bg-light-surface px-2 active:opacity-75 dark:border-dark-divider dark:bg-dark-surface-muted"
        >
          <UniPlus size={17} className="text-light-icon dark:text-dark-icon" />
        </Pressable>
      ) : null}
    </View>
  );
};
