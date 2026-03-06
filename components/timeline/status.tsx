import { rel } from "@/lib/dayjs";
import { getCdnUrl } from "@/lib/media";
import type { CatalystStatus } from "@natsuneko-laboratory/catalyst-sdk";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MediaCarousel } from "../MediaCarousel";
import { StatusText } from "../status/text";

export type StatusRenderingMode = "twtr" | "plain";

type Props = {
  status: CatalystStatus;
  renderingMode?: StatusRenderingMode;
};

export const TimelineStatus = memo(({ status, renderingMode = "twtr" }: Props) => {
  const router = useRouter();

  const user = status.user;
  const medias = status.medias;

  const navigateToStatus = () => router.push(`/status/${status.id}`);
  const navigateToUser = () => user && router.push(`/user/${user.screenName}`);

  return (
    <View style={styles.container}>
      {/* Header */}
      <Pressable onPress={navigateToStatus}>
        <View style={styles.headerRow}>
          <Pressable onPress={navigateToUser}>
            {user?.profile?.iconUrl ? (
              <Image
                source={{ uri: getCdnUrl({ src: user.profile.iconUrl, variant: "icon", width: 64 }) }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
          </Pressable>

          <View style={styles.userInfoRow}>
            <Pressable onPress={navigateToUser} style={styles.userNameRow}>
              <Text style={styles.displayName} numberOfLines={1}>
                {user?.displayName ?? "Unknown"}
              </Text>
              <Text style={styles.screenName} numberOfLines={1}>
                @{user?.screenName ?? "unknown"}
              </Text>
            </Pressable>
            <Text style={styles.timestamp}>・{rel(status.createdAt)}</Text>
          </View>
        </View>
      </Pressable>

      {/* Media carousel */}
      {medias.length > 0 && <MediaCarousel medias={medias} />}

      {/* Body */}
      {status.body.length > 0 && (
        <Pressable onPress={navigateToStatus}>
          {renderingMode === "twtr" ? (
            <View style={styles.bodyContainer}>
              <StatusText status={status.body} />
            </View>
          ) : (
            <Text style={styles.bodyText}>{status.body}</Text>
          )}
        </Pressable>
      )}
    </View>
  );
});
TimelineStatus.displayName = "TimelineStatus";

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(128,128,128,0.25)",
  },
  userInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginLeft: 8,
    overflow: "hidden",
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    overflow: "hidden",
  },
  displayName: {
    fontWeight: "bold",
    fontSize: 13,
  },
  screenName: {
    fontSize: 13,
    color: "gray",
    marginLeft: 4,
  },
  timestamp: {
    fontSize: 13,
    color: "gray",
    flexShrink: 0,
  },
  bodyContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bodyText: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 13,
  },
});
