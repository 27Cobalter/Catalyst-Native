import { ContentTypeSelectorSheet, type ContentTypeSelectorSheetRef } from "@/components/content-type-selector-sheet";
import { Tab, Tabs } from "@/components/tabs";
import { FirehoseTimeline } from "@/components/timeline/firehose";
import { FollowingTimeline } from "@/components/timeline/following";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { credentialAtom } from "@/models/atoms/credential";
import { useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import React, { useCallback, useRef } from "react";
import { View } from "react-native";

const TABS: Tab[] = [
  { key: "following", label: "フォロー中" },
  { key: "firehose", label: "グローバル" },
];

export default function HomeScreen() {
  const credential = useAtomValue(credentialAtom);
  const router = useRouter();
  const selectorSheetRef = useRef<ContentTypeSelectorSheetRef>(null);

  const handleFabPress = useCallback(() => {
    selectorSheetRef.current?.open();
  }, []);

  const handleContentTypeSelect = useCallback(
    (contentType: string) => {
      switch (contentType) {
        case "post":
          router.push("/compose/post");
          break;
        case "album":
          // TODO: Navigate to album composer
          break;
        case "smartAlbum":
          // TODO: Navigate to smart album composer
          break;
      }
    },
    [router],
  );

  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      {credential ? (
        <Tabs
          tabs={TABS}
          renderScene={(tab) => {
            if (tab.key === "firehose") return <FirehoseTimeline />;
            return <FollowingTimeline />;
          }}
        />
      ) : (
        <FirehoseTimeline />
      )}
      {credential && <FloatingActionButton onPress={handleFabPress} />}
      {credential && <ContentTypeSelectorSheet ref={selectorSheetRef} onSelect={handleContentTypeSelect} />}
    </View>
  );
}
