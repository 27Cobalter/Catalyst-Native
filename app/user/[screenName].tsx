import { ProfileHeader } from "@/components/profile/header";
import { ProfileOverlay } from "@/components/profile/overlay";
import { TimelineStatus } from "@/components/timeline/status";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { cn } from "@/lib/utils";
import { accountAtom } from "@/models/atoms/account";
import type { CatalystStatus, EgeriaUser } from "@natsuneko-laboratory/catalyst-sdk";
import { useLocalSearchParams } from "expo-router";
import { useAtomValue } from "jotai";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const TABS_BASE = [
  { key: "posts", label: "投稿" },
  { key: "gallery", label: "ギャラリー" },
];

export default function UserProfilePage() {
  const { screenName } = useLocalSearchParams<{ screenName: string }>();
  const insets = useSafeAreaInsets();
  const account = useAtomValue(accountAtom);
  const colorScheme = useColorScheme();

  const [user, setUser] = useState<EgeriaUser | null>(null);
  const [statuses, setStatuses] = useState<CatalystStatus[]>([]);
  const [galleryStatuses, setGalleryStatuses] = useState<CatalystStatus[]>([]);
  const [activeTab, setActiveTab] = useState(0);

  const scrollY = useRef(new Animated.Value(0)).current;
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(0);

  const isMyself = account?.user?.id === user?.id;

  const tabs = isMyself ? [...TABS_BASE, { key: "likes", label: "いいね" }] : TABS_BASE;

  const TAB_WIDTH = SCREEN_WIDTH / tabs.length;
  const INDICATOR_WIDTH = TAB_WIDTH * 0.3;
  const NAV_BAR_HEIGHT = insets.top + 44;

  useEffect(() => {
    indicatorAnim.setValue((TAB_WIDTH - INDICATOR_WIDTH) / 2);
  }, [tabs.length, TAB_WIDTH, INDICATOR_WIDTH, indicatorAnim]);

  useEffect(() => {
    if (!screenName || !account?.credential.client) return;
    const client = account.credential.client;

    const fetchData = async () => {
      try {
        const userRes = await client.egeria.userByUsername(screenName);
        if (userRes?.user) {
          setUser(userRes.user);
        }

        const [timelineRes, galleryRes] = await Promise.all([
          client.catalyst.userTimeline(screenName).catch(() => null),
          client.catalyst.userGalleryTimeline(screenName).catch(() => null),
        ]);

        if (timelineRes?.statuses) {
          setStatuses(timelineRes.statuses);
        }
        if (galleryRes?.statuses) {
          setGalleryStatuses(galleryRes.statuses);
        }
      } catch (e) {
        console.error("Failed to fetch user profile:", e);
      }
    };

    fetchData();
  }, [screenName, account]);

  const handleTabPress = useCallback(
    (index: number) => {
      setActiveTab(index);
      Animated.timing(indicatorAnim, {
        toValue: index * TAB_WIDTH + (TAB_WIDTH - INDICATOR_WIDTH) / 2,
        duration: 200,
        useNativeDriver: false,
      }).start();
    },
    [TAB_WIDTH, INDICATOR_WIDTH, indicatorAnim],
  );

  const isDark = colorScheme === "dark";
  const grayColor = isDark ? "#8E8E93" : "#6E6E73";

  const stickyTabBarOpacity =
    headerHeight > 0
      ? scrollY.interpolate({
          inputRange: [headerHeight - 104, headerHeight - 103],
          outputRange: [0, 1],
          extrapolate: "clamp",
        })
      : 0;

  const renderTabBar = () => (
    <>
      {tabs.map((tab, index) => (
        <Pressable
          key={tab.key}
          style={{ width: TAB_WIDTH, alignItems: "center", paddingVertical: 14 }}
          onPress={() => handleTabPress(index)}
        >
          <Text
            className={cn(index === activeTab ? "text-light-text dark:text-dark-text" : "")}
            style={[
              styles.tabLabel,
              {
                fontWeight: index === activeTab ? "700" : "400",
              },
            ]}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
      <Animated.View
        className="text-light-tint dark:text-dark-tint"
        style={[
          styles.tabIndicator,
          {
            width: INDICATOR_WIDTH,
            transform: [{ translateX: indicatorAnim }],
          },
        ]}
      />
    </>
  );

  const activeTabContent = () => {
    const currentStatuses = activeTab === 1 ? galleryStatuses : statuses;
    if (activeTab === 2 && isMyself) {
      return (
        <View style={styles.emptyTab}>
          <Text style={{ color: grayColor }}>いいねは準備中です</Text>
        </View>
      );
    }
    if (currentStatuses.length === 0) {
      return (
        <View style={styles.emptyTab}>
          <Text style={{ color: grayColor }}>投稿がありません</Text>
        </View>
      );
    }
    return currentStatuses.map((status) => (
      <React.Fragment key={status.id}>
        <TimelineStatus status={status} />
        <View style={styles.separator} />
      </React.Fragment>
    ));
  };

  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
      >
        <ProfileHeader user={user} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)} />

        {/* Tab Bar (scrolls with content) */}
        <View
          className="flex-row bg-light-background dark:bg-dark-background"
          style={{
            width: SCREEN_WIDTH,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: grayColor + "33",
          }}
        >
          {renderTabBar()}
        </View>

        {/* Tab Content (child 2) */}
        <View style={{ minHeight: 400 }}>{activeTabContent()}</View>
      </Animated.ScrollView>

      <ProfileOverlay user={user} scrollY={scrollY} />

      {/* Sticky Tab Bar Overlay */}
      <Animated.View
        className="flex-row bg-light-background dark:bg-dark-background"
        style={{
          position: "absolute",
          top: NAV_BAR_HEIGHT,
          left: 0,
          width: SCREEN_WIDTH,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: grayColor + "33",
          opacity: stickyTabBarOpacity,
        }}
        pointerEvents={headerHeight > 0 ? "auto" : "none"}
      >
        {renderTabBar()}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    display: "flex",
    flexDirection: "row",
    width: SCREEN_WIDTH,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
  },
  tabLabel: {
    fontSize: 15,
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    height: 2,
    borderRadius: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e0e0e0",
  },
  emptyTab: {
    alignItems: "center",
    paddingVertical: 48,
  },
});
