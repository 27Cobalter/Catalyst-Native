import { getCdnUrl, getIdenticonUrl } from "@/lib/media";
import { CatalystFleetRing } from "@natsuneko-laboratory/catalyst-sdk";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

type Props = {
  ring: CatalystFleetRing;
  onPress: () => void;
};

export const FleetRingItem = ({ ring, onPress }: Props) => {
  const iconUrl = ring.user.profile?.iconUrl
    ? getCdnUrl({ src: ring.user.profile.iconUrl, variant: "icon", width: 64 })
    : getIdenticonUrl(ring.user.id);

  const ringColor = ring.hasUnread ? "#e879a0" : "#9ca3af";

  return (
    <Pressable onPress={onPress} className="items-center mx-2">
      <View
        style={{
          padding: 2,
          borderRadius: 999,
          borderWidth: 2.5,
          borderColor: ringColor,
        }}
      >
        <Image
          source={{ uri: iconUrl }}
          style={{ width: 52, height: 52, borderRadius: 26 }}
          contentFit="cover"
        />
      </View>
      <Text
        className="text-xs text-light-text dark:text-dark-text mt-1 w-16 text-center"
        numberOfLines={1}
      >
        {ring.user.displayName || ring.user.screenName}
      </Text>
    </Pressable>
  );
};
