import { clientAtom } from "@/models/atoms/credential";
import { CatalystFleetRing } from "@natsuneko-laboratory/catalyst-sdk";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { FleetRingItem } from "./ring-item";

type Props = {
  onRingPress: (username: string) => void;
  refreshKey?: number;
};

export const FleetRing = ({ onRingPress, refreshKey }: Props) => {
  const client = useAtomValue(clientAtom);
  const [rings, setRings] = useState<CatalystFleetRing[]>([]);

  useEffect(() => {
    if (!client) return;
    client.catalyst.fleets().then(setRings).catch(() => {});
  }, [client, refreshKey]);

  if (rings.length === 0) return null;

  return (
    <View className="border-b border-light-divider dark:border-dark-divider">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 8 }}
      >
        {rings.map((ring) => (
          <FleetRingItem
            key={ring.user.id}
            ring={ring}
            onPress={() => onRingPress(ring.user.screenName)}
          />
        ))}
      </ScrollView>
    </View>
  );
};
