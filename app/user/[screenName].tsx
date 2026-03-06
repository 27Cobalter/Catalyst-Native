import { TimelineStatus } from "@/components/TimelineStatus";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getCdnUrl } from "@/lib/media";
import { accountAtom } from "@/models/atoms/account";
import type { CatalystRelationships, CatalystStatus, EgeriaUser } from "@natsuneko-laboratory/catalyst-sdk";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { ArrowLeft, Link as LinkIcon } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Linking, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BANNER_HEIGHT = SCREEN_WIDTH / 3;
const AVATAR_SIZE = 96;
const NAV_BAR_OPACITY_THRESHOLD = 32;

const TABS_BASE = [
  { key: "posts", label: "投稿" },
  { key: "gallery", label: "ギャラリー" },
];

export default function UserProfilePage() {
  const { screenName } = useLocalSearchParams<{ screenName: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const account = useAtomValue(accountAtom);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "unspecified" ? "light" : colorScheme];

  const [user, setUser] = useState<EgeriaUser | null>(null);
  const [relationships, setRelationships] = useState<CatalystRelationships | null>(null);
  const [statuses, setStatuses] = useState<CatalystStatus[]>([]);
  const [galleryStatuses, setGalleryStatuses] = useState<CatalystStatus[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(0);

  const isMyself = account?.user?.id === user?.id;
  const isLoggedIn = account !== null;

  const tabs = isMyself ? [...TABS_BASE, { key: "likes", label: "いいね" }] : TABS_BASE;

  const TAB_WIDTH = SCREEN_WIDTH / tabs.length;
  const INDICATOR_WIDTH = TAB_WIDTH * 0.3;
  const NAV_BAR_HEIGHT = insets.top + 45;

  const navBarOpacity = scrollY.interpolate({
    inputRange: [0, NAV_BAR_OPACITY_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const navTitleOpacity = scrollY.interpolate({
    inputRange: [0, NAV_BAR_OPACITY_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

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

        const [timelineRes, galleryRes, relRes] = await Promise.all([
          client.catalyst.userTimeline(screenName).catch(() => null),
          client.catalyst.userGalleryTimeline(screenName).catch(() => null),
          client.catalyst.relationships(screenName).catch(() => null),
        ]);

        if (timelineRes?.statuses) {
          setStatuses(timelineRes.statuses);
        }
        if (galleryRes?.statuses) {
          setGalleryStatuses(galleryRes.statuses);
        }
        if (relRes) {
          setRelationships(relRes);
        }
      } catch (e) {
        console.error("Failed to fetch user profile:", e);
      }
    };

    fetchData();
  }, [screenName, account]);

  const handleFollow = useCallback(async () => {
    if (!user || !account?.credential.client || isFollowLoading) return;
    setIsFollowLoading(true);
    try {
      if (relationships?.isFollowing) {
        await account.credential.client.catalyst.remove({ userId: user.id });
      } else {
        await account.credential.client.catalyst.follow({ userId: user.id });
      }
      const relRes = await account.credential.client.catalyst.relationships(user.screenName);
      setRelationships(relRes);
    } catch (e) {
      console.error("Follow/unfollow failed:", e);
    } finally {
      setIsFollowLoading(false);
    }
  }, [user, account, relationships, isFollowLoading]);

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
  const textColor = colors.text;
  const bgColor = colors.background;
  const grayColor = isDark ? "#8E8E93" : "#6E6E73";

  const stickyTabBarOpacity =
    headerHeight > 0
      ? scrollY.interpolate({
          inputRange: [headerHeight - 1, headerHeight],
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
            style={[
              styles.tabLabel,
              {
                color: index === activeTab ? textColor : grayColor,
                fontWeight: index === activeTab ? "700" : "400",
              },
            ]}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
      <Animated.View
        style={[
          styles.tabIndicator,
          { width: INDICATOR_WIDTH, backgroundColor: colors.tint, transform: [{ translateX: indicatorAnim }] },
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
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
      >
        {/* Profile Header */}
        <View style={{ backgroundColor: bgColor }} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
          {/* Banner (extends under status bar) */}
          <View style={{ paddingTop: insets.top }}>
            {user?.profile?.bannerUrl ? (
              <Image
                source={{ uri: getCdnUrl({ src: user.profile.bannerUrl, variant: "header", width: SCREEN_WIDTH }) }}
                style={{ width: SCREEN_WIDTH, height: BANNER_HEIGHT }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{ width: SCREEN_WIDTH, height: BANNER_HEIGHT, backgroundColor: isDark ? "#333" : "#e0e0e0" }}
              />
            )}
          </View>

          {/* Avatar + Action Row */}
          <View style={styles.avatarRow}>
            <View style={[styles.avatarWrapper, { borderColor: bgColor }]}>
              {user?.profile?.iconUrl ? (
                <Image
                  source={{ uri: getCdnUrl({ src: user.profile.iconUrl, variant: "icon", width: 128 }) }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]} />
              )}
            </View>

            <View style={{ flex: 1 }} />

            {isLoggedIn &&
              user &&
              (isMyself || relationships?.isMyself ? (
                <TouchableOpacity style={[styles.outlineButton, { borderColor: grayColor }]}>
                  <Text style={[styles.outlineButtonText, { color: textColor }]}>編集</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.followRow}>
                  {relationships?.isFollowed && (
                    <View style={styles.followedBadge}>
                      <Text style={styles.followedBadgeText}>フォローされています</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.followButton,
                      relationships?.isFollowing
                        ? { backgroundColor: "transparent", borderColor: grayColor }
                        : { backgroundColor: textColor, borderColor: textColor },
                    ]}
                    onPress={handleFollow}
                    disabled={isFollowLoading || relationships === null}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[styles.followButtonText, { color: relationships?.isFollowing ? textColor : bgColor }]}
                    >
                      {relationships === null ? "読み込み中" : relationships.isFollowing ? "フォロー中" : "フォロー"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
          </View>

          {/* Profile Info */}
          <View style={styles.profileInfo}>
            <Text style={[styles.displayName, { color: textColor }]}>{user?.displayName ?? ""}</Text>
            <Text style={[styles.screenNameText, { color: grayColor }]}>@{user?.screenName ?? screenName}</Text>

            {user?.profile?.bio ? <Text style={[styles.bio, { color: textColor }]}>{user.profile.bio}</Text> : null}

            {user?.profile?.website ? (
              <TouchableOpacity
                style={styles.websiteRow}
                onPress={() => user.profile?.website && Linking.openURL(user.profile.website)}
              >
                <LinkIcon size={14} color={grayColor} />
                <Text style={[styles.websiteText, { color: grayColor }]} numberOfLines={1}>
                  {user.profile.website}
                </Text>
              </TouchableOpacity>
            ) : null}

            {user?.profile?.additionalWebsites
              ?.filter((w) => !!w.trim())
              .map((website, i) => (
                <TouchableOpacity key={i} style={styles.websiteRow} onPress={() => Linking.openURL(website)}>
                  <LinkIcon size={14} color={grayColor} />
                  <Text style={[styles.websiteText, { color: grayColor }]} numberOfLines={1}>
                    {website}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        </View>

        {/* Tab Bar (scrolls with content) */}
        <View
          className="flex-row"
          style={{
            width: SCREEN_WIDTH,
            backgroundColor: bgColor,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: grayColor + "33",
          }}
        >
          {renderTabBar()}
        </View>

        {/* Tab Content (child 2) */}
        <View style={{ minHeight: 400 }}>{activeTabContent()}</View>
      </Animated.ScrollView>

      {/* Overlay Navigation Bar */}
      <View
        style={[styles.navBarContainer, { height: NAV_BAR_HEIGHT, paddingTop: insets.top }]}
        pointerEvents="box-none"
      >
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor, opacity: navBarOpacity }]} />
        <View style={styles.navBarContent} pointerEvents="box-none">
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <View style={styles.backButtonCircle}>
              <ArrowLeft size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <Animated.Text style={[styles.navTitle, { color: textColor, opacity: navTitleOpacity }]} numberOfLines={1}>
            {user?.displayName ?? ""}
          </Animated.Text>

          <View style={{ width: 52 }} />
        </View>
      </View>

      {/* Sticky Tab Bar Overlay */}
      <Animated.View
        className="flex-row"
        style={{
          position: "absolute",
          top: NAV_BAR_HEIGHT,
          left: 0,
          width: SCREEN_WIDTH,
          backgroundColor: bgColor,
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
  container: {
    flex: 1,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    marginTop: -32,
  },
  avatarWrapper: {
    borderRadius: 52,
    borderWidth: 4,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    backgroundColor: "rgba(128,128,128,0.25)",
  },
  outlineButton: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
    marginRight: 16,
  },
  outlineButtonText: {
    fontWeight: "700",
    fontSize: 14,
  },
  followRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    marginRight: 16,
    gap: 8,
  },
  followedBadge: {
    backgroundColor: "rgba(128,128,128,0.2)",
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  followedBadgeText: {
    fontSize: 11,
    color: "gray",
  },
  followButton: {
    width: 120,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  followButtonText: {
    fontWeight: "700",
    fontSize: 14,
  },
  profileInfo: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginTop: 8,
    gap: 6,
  },
  displayName: {
    fontSize: 20,
    fontWeight: "700",
  },
  screenNameText: {
    fontSize: 14,
  },
  bio: {
    fontSize: 15,
    lineHeight: 20,
  },
  websiteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  websiteText: {
    fontSize: 14,
    textDecorationLine: "underline",
    flexShrink: 1,
  },
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
  navBarContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  navBarContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    padding: 8,
    marginLeft: 8,
  },
  backButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
