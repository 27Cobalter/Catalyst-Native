import { CatalystAvatar, CatalystBadge, CatalystBadgeText, CatalystText } from "@/components/design-system";
import { Image } from "@/components/ui/image";
import { getCdnUrl } from "@/lib/media";
import { openUrlWithBrowser } from "@/models/browser-settings";
import type { CatalystStatusV1_2 } from "@/models/sdk-types";
import { ExternalLink } from "lucide-react-native";
import { memo, useCallback } from "react";
import { Alert, Pressable, View } from "react-native";
import { withUniwind } from "uniwind";

const UniExternalLink = withUniwind(ExternalLink);

type Props = {
  status: CatalystStatusV1_2;
};

export const TimelineAdvertisement = memo(({ status }: Props) => {
  const advertisement = status.advertisement;
  const media = status.medias[0];

  const handlePress = useCallback(() => {
    if (!advertisement) return;

    Alert.alert(
      "外部サイトへ移動しますか？",
      `Catalystを離れて、${advertisement.redirectHost} を開きます。`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "外部サイトへ移動",
          onPress: () => {
            void openUrlWithBrowser(advertisement.url);
          },
        },
      ],
    );
  }, [advertisement]);

  if (!advertisement || !media) return null;

  const user = status.user;

  return (
    <Pressable
      accessibilityLabel={`${user?.displayName ?? "広告主"}の広告を開く`}
      accessibilityRole="link"
      className="bg-light-background pt-3 active:opacity-90 dark:bg-dark-background"
      onPress={handlePress}
    >
      <View className="flex-row items-center gap-3 px-4 pb-3">
        <CatalystAvatar
          source={
            user?.profile?.iconUrl
              ? getCdnUrl({ src: user.profile.iconUrl, variant: "icon", width: 80 })
              : null
          }
          fallback={user?.displayName ?? "広告主"}
          size="md"
        />
        <View className="min-w-0 flex-1">
          <CatalystText variant="label" numberOfLines={1}>
            {user?.displayName ?? "広告主"}
          </CatalystText>
          {user ? (
            <CatalystText variant="caption" tone="muted" numberOfLines={1}>
              @{user.screenName}
            </CatalystText>
          ) : null}
        </View>
        <CatalystBadge tone="accent">
          <CatalystBadgeText>広告</CatalystBadgeText>
        </CatalystBadge>
        <UniExternalLink size={16} className="text-light-text-muted dark:text-dark-text-muted" />
      </View>

      <View className="mb-4 aspect-video w-full overflow-hidden border-y border-light-border dark:border-dark-border">
        <Image
          source={{ uri: getCdnUrl({ src: media.url, variant: "medium", width: 1920 }) }}
          className="size-full"
          contentFit="cover"
        />
      </View>
    </Pressable>
  );
});

TimelineAdvertisement.displayName = "TimelineAdvertisement";
