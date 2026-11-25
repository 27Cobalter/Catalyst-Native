import { CatalystAvatar, CatalystText } from "@/components/design-system";
import { EmojiPickerSheet, type EmojiPickerSheetRef } from "@/components/emoji-verse";
import { ReactionBar } from "@/components/reaction-bar";
import { LockedStatusCard } from "@/components/status/locked-status-card";
import { StatusText } from "@/components/status/text";
import { StatusVisibilityBadge } from "@/components/status/visibility-badge";
import { MediaCarousel } from "@/components/ui/media-carousel";
import { ProfileEmoji } from "@/components/user/profile-emoji";
import { rel } from "@/lib/dayjs";
import { getCdnUrl } from "@/lib/media";
import { getStatusReactions } from "@/lib/reactions";
import { useStatusReactions } from "@/hooks/use-status-reactions";
import { accountAtom } from "@/models/atoms/account";
import type { CatalystStatus, CatalystStatusPrivacy, CatalystStatusV1_1 } from "@/models/sdk-types";
import { useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { Repeat2, Sparkles } from "lucide-react-native";
import { memo, useMemo, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import { withUniwind } from "uniwind";

export type StatusRenderingMode = "twtr" | "plain";

type StatusWithPrivacy = {
  privacy?: CatalystStatusPrivacy;
};

type StatusWithLock = {
  locked?: boolean;
};

type Props = {
  status: CatalystStatus | CatalystStatusV1_1;
  renderingMode?: StatusRenderingMode;
};

type StatusWithRepost = {
  repost?: {
    id: string;
    createdAt: string;
  };
};

type StatusWithRecommendation = {
  isRecommended?: boolean;
};

const UniRepeat2 = withUniwind(Repeat2);
const UniSparkles = withUniwind(Sparkles);

export const TimelineStatus = memo(({ status, renderingMode = "twtr" }: Props) => {
  // 合言葉付きでまだ解除していない投稿は、本文と画像が抜かれて届く
  if ((status as StatusWithLock).locked) {
    return (
      <LockedStatusCard
        status={status}
        renderUnlocked={(unlocked) => <UnlockedStatus status={unlocked} renderingMode={renderingMode} />}
      />
    );
  }

  return <UnlockedStatus status={status} renderingMode={renderingMode} />;
});
TimelineStatus.displayName = "TimelineStatus";

const UnlockedStatus = ({ status, renderingMode = "twtr" }: Props) => {
  const router = useRouter();
  const account = useAtomValue(accountAtom);
  const emojiPickerRef = useRef<EmojiPickerSheetRef>(null);

  const user = status.user!;
  const medias = status.medias;
  const isLoggedIn = account !== null;
  const privacy = (status as StatusWithPrivacy).privacy;
  const repost = (status as StatusWithRepost).repost;
  const isRecommended = (status as StatusWithRecommendation).isRecommended === true;

  const baseReactions = useMemo(() => getStatusReactions(status), [status]);
  const { reactions, react: handleReact, unreact: handleUnreact } = useStatusReactions(status.id, baseReactions);

  const hasReactions = Object.values(reactions).some((r) => r.count >= 1);

  const navigateToStatus = () => router.push(`/status/${status.id}`);
  const navigateToUser = () => user && router.push(`/user/${user.screenName}`);

  return (
    <View className="bg-light-background pt-3 dark:bg-dark-background">
      {isRecommended ? (
        <View className="mb-1 flex-row items-center gap-1 px-4">
          <UniSparkles size={14} className="text-light-tint dark:text-dark-tint" />
          <CatalystText variant="caption" tone="muted" numberOfLines={1}>
            おすすめ
          </CatalystText>
        </View>
      ) : null}

      {repost ? (
        <View className="mb-1 flex-row items-center gap-1 px-4">
          <UniRepeat2 size={14} className="text-light-tint dark:text-dark-tint" />
          <CatalystText variant="caption" tone="muted" numberOfLines={1}>
            {user.displayName}さんがリポストしました
          </CatalystText>
        </View>
      ) : null}

      <View className="flex-row items-center gap-3 px-4">
        <Pressable accessibilityRole="button" className="active:opacity-75" onPress={navigateToUser}>
          <CatalystAvatar
            source={
              user?.profile?.iconUrl
                ? getCdnUrl({
                    src: user.profile.iconUrl,
                    variant: "icon",
                    width: 80,
                  })
                : null
            }
            fallback={user.displayName}
            size="md"
          />
        </Pressable>

        <Pressable accessibilityRole="button" className="min-w-0 flex-1 active:opacity-90" onPress={navigateToStatus}>
          <View className="flex-row items-center gap-1">
            <Pressable
              accessibilityRole="button"
              className="min-w-0 flex-row items-center gap-1 active:opacity-75"
              onPress={navigateToUser}
            >
              <CatalystText variant="label" className="min-w-0 shrink" numberOfLines={1}>
                {user.displayName}
              </CatalystText>
              <ProfileEmoji emoji={user.profileEmoji} size={14} />
            </Pressable>
          </View>

          <View className="mt-0.5 flex-row items-center">
            <CatalystText variant="caption" tone="muted" numberOfLines={1}>
              @{user.screenName}
            </CatalystText>
            <CatalystText variant="caption" tone="muted">
              {" · "}
              {rel(status.createdAt)}
            </CatalystText>
          </View>
        </Pressable>

        <StatusVisibilityBadge className="ml-2 self-center" privacy={privacy} />
      </View>

      {medias.length > 0 ? (
        <View className="mt-3">
          <MediaCarousel key={status.id} medias={medias} createdAt={status.createdAt} />
        </View>
      ) : null}

      {status.body.length > 0 ? (
        <Pressable accessibilityRole="button" className="px-4 pt-3 active:opacity-90" onPress={navigateToStatus}>
          {renderingMode === "twtr" ? (
            <StatusText status={status.body} />
          ) : (
            <Text className="text-[15px] leading-5 text-light-text dark:text-dark-text">{status.body}</Text>
          )}
        </Pressable>
      ) : null}

      {hasReactions || isLoggedIn ? (
        <Pressable accessibilityRole="button" className="px-4 pt-2 active:opacity-90" onPress={navigateToStatus}>
          <ReactionBar
            reactions={reactions}
            onReact={handleReact}
            onUnreact={handleUnreact}
            onAddReaction={isLoggedIn ? () => emojiPickerRef.current?.open() : undefined}
          />
        </Pressable>
      ) : null}

      <Pressable accessibilityRole="button" className="h-3" onPress={navigateToStatus} />

      <EmojiPickerSheet ref={emojiPickerRef} onReact={handleReact} searchContextId={status.id} />
    </View>
  );
};
