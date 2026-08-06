import { CatalystAvatar } from "@/components/design-system";
import { getCdnUrl } from "@/lib/media";
import { getNotificationActorIconUrl, isActivityPubRemoteActor } from "@/lib/notification-actor";
import type { NotificationActor } from "@/models/sdk-types";
import { openUrlWithBrowser } from "@/models/browser-settings";
import { useRouter } from "expo-router";
import { Pressable } from "react-native";

type Props = {
  actor: NotificationActor;
  size?: "sm" | "md" | "lg" | "xl";
};

export const NotificationActorAvatar = ({ actor, size = "lg" }: Props) => {
  const router = useRouter();
  const isRemote = isActivityPubRemoteActor(actor);
  const iconUrl = getNotificationActorIconUrl(actor);
  const source = isRemote
    ? iconUrl
    : iconUrl
      ? getCdnUrl({ src: iconUrl, variant: "icon", width: size === "sm" ? 64 : 96 })
      : null;

  const openActor = () => {
    if (isRemote) {
      openUrlWithBrowser(actor.profileUri);
      return;
    }
    router.push(`/user/${actor.screenName}`);
  };

  return (
    <Pressable
      accessibilityRole={isRemote ? "link" : "button"}
      accessibilityLabel={`${actor.displayName}のプロフィールを開く`}
      className="active:opacity-75"
      onPress={openActor}
    >
      <CatalystAvatar
        alt={actor.displayName}
        fallback={isRemote ? actor.preferredUsername : actor.displayName}
        size={size}
        source={source}
      />
    </Pressable>
  );
};
