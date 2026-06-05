import { EmojiPickerSheet, type EmojiPickerSheetRef } from "@/components/emoji-verse";
import { ReactionBar } from "@/components/reaction-bar";
import { StatusText } from "@/components/status/text";
import { MediaCarousel } from "@/components/ui/media-carousel";
import { rel } from "@/lib/dayjs";
import { getCdnUrl } from "@/lib/media";
import { accountAtom } from "@/models/atoms/account";
import type { CatalystReaction, CatalystStatus } from "@natsuneko-laboratory/catalyst-sdk";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import React, { memo, useCallback, useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { withUniwind } from "uniwind";

export type StatusRenderingMode = "twtr" | "plain";

type StatusWithReactions = CatalystStatus & {
  reactions?: Record<string, CatalystReaction>;
  visitor?: {
    favorite?: boolean;
    reactions?: string[];
  };
};

type Props = {
  status: CatalystStatus;
  renderingMode?: StatusRenderingMode;
};

const UniImage = withUniwind(Image);

export const TimelineStatus = memo(({ status, renderingMode = "twtr" }: Props) => {
  const router = useRouter();
  const account = useAtomValue(accountAtom);
  const emojiPickerRef = useRef<EmojiPickerSheetRef>(null);

  const user = status.user!;
  const medias = status.medias;
  const isLoggedIn = account !== null;

  const statusRuntime = status as StatusWithReactions;
  const visitorReactions = statusRuntime.visitor?.reactions ?? [];
  const [reactions, setReactions] = useState<Record<string, CatalystReaction>>(() =>
    Object.fromEntries(
      Object.entries(statusRuntime.reactions ?? {}).map(([key, reaction]) => [
        key,
        { ...reaction, hasSelfReaction: visitorReactions.includes(reaction.symbol) },
      ]),
    ),
  );

  const hasReactions = Object.values(reactions).some((r) => r.count >= 1);

  const navigateToStatus = () => router.push(`/status/${status.id}`);
  const navigateToUser = () => user && router.push(`/user/${user.screenName}`);

  const handleReact = useCallback(
    async (symbol: string) => {
      if (!account?.credential.client) return;
      try {
        await account.credential.client.catalyst.react(status.id, symbol);
        setReactions((prev) => ({
          ...prev,
          [symbol]: { ...prev[symbol], symbol, count: (prev[symbol]?.count ?? 0) + 1, hasSelfReaction: true },
        }));
      } catch {
        Alert.alert("エラー", "リアクションに失敗しました");
      }
    },
    [account, status.id],
  );

  const handleUnreact = useCallback(
    async (symbol: string) => {
      if (!account?.credential.client) return;
      try {
        await account.credential.client.catalyst.unreact(status.id, symbol);
        setReactions((prev) => ({
          ...prev,
          [symbol]: { ...prev[symbol], count: (prev[symbol]?.count ?? 0) - 1, hasSelfReaction: false },
        }));
      } catch {
        Alert.alert("エラー", "リアクションの取り消しに失敗しました");
      }
    },
    [account, status.id],
  );

  return (
    <View className="py-2">
      {/* Header */}
      <Pressable onPress={navigateToStatus}>
        <View className="flex-row items-center px-4 mb-1">
          <Pressable onPress={navigateToUser}>
            {user?.profile?.iconUrl ? (
              <UniImage
                source={{
                  uri: getCdnUrl({
                    src: user.profile.iconUrl,
                    variant: "icon",
                    width: 64,
                  }),
                }}
                className="w-8 h-8 rounded-full"
                contentFit="cover"
              />
            ) : (
              <View className="w-8 h-8 rounded-full bg-[#888] opacity-25" />
            )}
          </Pressable>

          <View className="flex-row items-center flex-1 ml-2 overflow-hidden">
            <Pressable className="flex flex-row items-center shrink overflow-hidden" onPress={navigateToUser}>
              <Text className="font-bold text-sm text-black dark:text-white" numberOfLines={1}>
                {user.displayName}
              </Text>
              <Text className="font-sm ml-1 text-neutral-500" numberOfLines={1}>
                @{user.screenName}
              </Text>
            </Pressable>
            <Text className="text-neutral-500 text-sm shrink-0">・{rel(status.createdAt)}</Text>
          </View>
        </View>
      </Pressable>

      {/* Media carousel */}
      {medias.length > 0 && <MediaCarousel key={status.id} medias={medias} />}

      {/* Body */}
      {status.body.length > 0 && (
        <Pressable onPress={navigateToStatus}>
          {renderingMode === "twtr" ? (
            <View className="px-4 py-2">
              <StatusText status={status.body} />
            </View>
          ) : (
            <Text className="px-4 py-2 text-sm">{status.body}</Text>
          )}
        </Pressable>
      )}

      {/* Reactions */}
      {(hasReactions || isLoggedIn) && (
        <View className="px-4 pb-1">
          <ReactionBar
            reactions={reactions}
            onReact={handleReact}
            onUnreact={handleUnreact}
            onAddReaction={isLoggedIn ? () => emojiPickerRef.current?.open() : undefined}
          />
        </View>
      )}

      <EmojiPickerSheet ref={emojiPickerRef} onReact={handleReact} />
    </View>
  );
});
TimelineStatus.displayName = "TimelineStatus";
