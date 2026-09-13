import { getCdnUrl } from "@/lib/media";
import type { CatalystFleet, Notification, NotificationGroup } from "@/models/sdk-types";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { memo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { NotificationActorAvatar } from "./actor-avatar";

const UniImage = withUniwind(Image);

function getReactionImageUrl(entity: NotificationGroup): string {
  if (entity.additionalContexts?.type === "custom-reaction") {
    return entity.additionalContexts.url;
  }
  return `https://static.natsuneko.com/images/reactions/${entity.body}.png`;
}

type Props = {
  notification: Notification;
};

export const FleetReactionNotification = memo(({ notification }: Props) => {
  const router = useRouter();
  const { entities } = notification;
  const belongsTo = notification.belongsTo as unknown as CatalystFleet | null;

  const navigateToReactions = () => {
    if (belongsTo?.id) {
      router.push(`/fleet/${belongsTo.id}/reactions`);
    }
  };

  return (
    <View className="flex-row items-start px-4 py-3 gap-4">
      {belongsTo?.renderedImageUrl ? (
        <Pressable onPress={navigateToReactions}>
          <UniImage
            source={{
              uri: getCdnUrl({ src: belongsTo.renderedImageUrl, variant: "thumbnail", width: 96 }),
            }}
            className="w-12 h-12 rounded-lg"
            contentFit="cover"
          />
        </Pressable>
      ) : (
        <View className="w-12 h-12 rounded-lg bg-[#888] opacity-25" />
      )}

      <View className="flex-1 gap-1">
        <Pressable onPress={navigateToReactions}>
          <Text className="text-sm text-light-text dark:text-dark-text">
            {entities.length > 1
              ? `あなたの Fleet に ${entities.length} 件のリアクションが付きました`
              : "あなたの Fleet にリアクションが付きました"}
          </Text>
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2 h-8">
            {entities.map((entity) => {
              const user = entity.occurredBy;
              return (
                <View key={entity.id} className="relative">
                  <NotificationActorAvatar actor={user} size="sm" />
                  <UniImage
                    source={{ uri: getReactionImageUrl(entity) }}
                    className="w-4 h-4 absolute -bottom-0.5 -right-0.5"
                    contentFit="contain"
                  />
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
});

FleetReactionNotification.displayName = "FleetReactionNotification";
