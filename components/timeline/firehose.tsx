import { useAsyncOneTimeEffect } from "@/hooks/useAsyncOneTimeEffect";
import { accountAtom } from "@/models/atoms/account";
import { CatalystStatus } from "@natsuneko-laboratory/catalyst-sdk";
import { FlashList, ListRenderItem } from "@shopify/flash-list";
import { useAtomValue } from "jotai";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { TimelineStatus } from "../TimelineStatus";

const ItemSeparator = () => <View style={styles.separator} />;

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

  const renderItem = useCallback<ListRenderItem<CatalystStatus>>(({ item }) => {
    return <TimelineStatus status={item} />;
  }, []);

  return <FlashList data={items} renderItem={renderItem} ItemSeparatorComponent={ItemSeparator} />;
};

const styles = StyleSheet.create({
  separator: {
    height: 1,
    backgroundColor: "#e0e0e0",
  },
});
