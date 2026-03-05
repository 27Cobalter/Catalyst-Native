import { useAsyncOneTimeEffect } from "@/hooks/useAsyncOneTimeEffect";
import { accountAtom } from "@/models/atoms/account";
import { CatalystStatus } from "@/natsuneko-laboratory/catalyst-sdk/packages/nodejs/dist";
import { FlashList } from "@shopify/flash-list";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { View } from "react-native";
import { TimelineStatus } from "../TimelineStatus";

export const FirehoseTimeline = () => {
  const account = useAtomValue(accountAtom);
  const [items, setItems] = useState<CatalystStatus[]>([]);

  useAsyncOneTimeEffect(async () => {
    if (items.length === 0) {
      const res = await account?.credential.client.catalyst.firehoseTimeline();
      if (res) {
        setItems(res);
      }
    }
  });

  return (
    <FlashList
      data={items}
      renderItem={({ item }) => {
        return <TimelineStatus status={item} />;
      }}
      ItemSeparatorComponent={() => (
        <View style={{ height: 1, backgroundColor: "#e0e0e0" }} />
      )}
    />
  );
};
