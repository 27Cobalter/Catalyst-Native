import { ProfileHeader } from "@/components/profile/header";
import { ProfileOverlay } from "@/components/profile/overlay";
import { TabContent } from "@/components/profile/tab-content";
import { ProfileTabs } from "@/components/profile/tabs";
import { useAsyncEffect } from "@/hooks/use-async-effect";
import { accountAtom } from "@/models/atoms/account";
import type { EgeriaUser } from "@natsuneko-laboratory/catalyst-sdk";
import { useLocalSearchParams } from "expo-router";
import { useAtomValue } from "jotai";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import "../../global.css";

type Tab = {
  route: string;
  label: string;
};

const DEFAULT_TABS: Tab[] = [
  { route: "posts", label: "投稿" },
  { route: "gallery", label: "ギャラリー" },
];

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function UserProfilePage() {
  const { screenName } = useLocalSearchParams<{ screenName: string }>();
  const insets = useSafeAreaInsets();
  const account = useAtomValue(accountAtom);
  const [user, setUser] = useState<EgeriaUser | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(0);
  const NAV_BAR_HEIGHT = insets.top + 44;
  const isMyself = user?.id === account?.user.id;
  const tabs: Tab[] = useMemo(
    () =>
      [...DEFAULT_TABS, isMyself && { route: "likes", label: "いいね" }]
        .filter(Boolean)
        .map((w) => w as unknown as Tab),
    [isMyself],
  );
  const stickyTabBarOpacity =
    headerHeight > 0
      ? scrollY.interpolate({
          inputRange: [headerHeight - 104, headerHeight - 103],
          outputRange: [0, 1],
          extrapolate: "clamp",
        })
      : 0;

  useAsyncEffect(async () => {
    if (!screenName || !account?.credential.client) {
      return;
    }

    try {
      const client = account.credential.client;
      const user = await client.egeria.userByUsername(screenName);
      if (user) {
        setUser(user?.user);
      }
    } catch (e) {
      console.error(`failed to fetch user: @${screenName}, ${e}`);
    }
  }, [account, screenName]);

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: false,
      }),
    [scrollY],
  );

  const listHeader = useCallback(
    () => (
      <View>
        <ProfileHeader user={user} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)} />
        <View
          className="flex-row border-b border-neutral-500 bg-light-background dark:bg-dark-background"
          style={{ width: SCREEN_WIDTH }}
        >
          <ProfileTabs activeIndex={activeTab} tabs={tabs} onClickTab={setActiveTab} />
        </View>
      </View>
    ),
    [user, activeTab, tabs],
  );

  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      <TabContent tab={tabs[activeTab]} user={user} ListHeaderComponent={listHeader} onScroll={onScroll} />

      <ProfileOverlay user={user} scrollY={scrollY} />

      {/* Sticky Tab Bar Overlay */}
      <Animated.View
        className="flex-row border-b border-neutral-500 bg-light-background dark:bg-dark-background"
        style={{
          position: "absolute",
          top: NAV_BAR_HEIGHT,
          left: 0,
          width: SCREEN_WIDTH,
          opacity: stickyTabBarOpacity,
        }}
        pointerEvents={headerHeight > 0 ? "auto" : "none"}
      >
        <ProfileTabs activeIndex={activeTab} tabs={tabs} onClickTab={setActiveTab} />
      </Animated.View>
    </View>
  );
}
