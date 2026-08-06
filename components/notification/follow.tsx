import { isActivityPubRemoteActor } from "@/lib/notification-actor";
import type { Notification } from "@/models/sdk-types";
import { memo } from "react";
import { Text, View } from "react-native";
import { NotificationActorAvatar } from "./actor-avatar";

type Props = {
  notification: Notification;
};

export const FollowNotification = memo(({ notification }: Props) => {
  const { entities } = notification;
  const occurredBy = entities[0]?.occurredBy;
  const isGrouped = entities.length > 1 && !entities.every((e) => e.occurredBy.id === entities[0].occurredBy.id);
  const isRemote = occurredBy ? isActivityPubRemoteActor(occurredBy) : false;

  return (
    <View className="flex-row items-start px-4 py-3 gap-4">
      {isGrouped ? (
        <View className="w-12 h-12 rounded-full bg-light-surface dark:bg-dark-surface items-center justify-center">
          <Text className="text-2xl">👤</Text>
        </View>
      ) : occurredBy ? (
        <NotificationActorAvatar actor={occurredBy} />
      ) : (
        <View className="w-12 h-12 rounded-full bg-[#888] opacity-25" />
      )}

      <View className="flex-1 gap-2">
        <Text className="text-sm text-light-text dark:text-dark-text">
          {isGrouped
            ? `${entities.length}人にフォローされました`
            : isRemote
              ? `${occurredBy?.displayName ?? ""}さんにフォローされました`
              : `${occurredBy?.displayName ?? ""}さんにフォローされました`}
        </Text>

        {occurredBy && isActivityPubRemoteActor(occurredBy) ? (
          <Text className="text-xs font-mono text-light-text-muted dark:text-dark-text-muted" numberOfLines={1}>
            {(occurredBy as any).handle}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

FollowNotification.displayName = "FollowNotification";
