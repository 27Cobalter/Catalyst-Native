import { getCdnUrl } from "@/lib/media";
import type { CatalystStatus } from "@natsuneko-laboratory/catalyst-sdk";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { MediaCarousel } from "./MediaCarousel";
import { StatusText } from "./StatusText";

export type StatusRenderingMode = "twtr" | "plain";

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h`;
  return `${Math.floor(diffHour / 24)}d`;
}

type Props = {
  status: CatalystStatus;
  renderingMode?: StatusRenderingMode;
};

export const TimelineStatus = ({ status, renderingMode = "twtr" }: Props) => {
  const router = useRouter();

  const user = status.user;
  const medias = status.medias;

  const navigateToStatus = () => router.push(`/status/${status.id}`);
  const navigateToUser = () => user && router.push(`/user/${user.screenName}`);

  return (
    <View style={{ paddingVertical: 8 }}>
      {/* Header */}
      <TouchableOpacity onPress={navigateToStatus} activeOpacity={1}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 4 }}>
          <TouchableOpacity onPress={navigateToUser} activeOpacity={1}>
            {user?.profile?.iconUrl ? (
              <Image
                source={{ uri: getCdnUrl({ src: user.profile.iconUrl, variant: "icon", width: 64 }) }}
                style={{ width: 32, height: 32, borderRadius: 16 }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "rgba(128,128,128,0.25)",
                }}
              />
            )}
          </TouchableOpacity>

          <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginLeft: 8, overflow: "hidden" }}>
            <TouchableOpacity
              onPress={navigateToUser}
              activeOpacity={1}
              style={{ flexDirection: "row", alignItems: "center", flexShrink: 1, overflow: "hidden" }}
            >
              <Text style={{ fontWeight: "bold", fontSize: 13 }} numberOfLines={1}>
                {user?.displayName ?? "Unknown"}
              </Text>
              <Text style={{ fontSize: 13, color: "gray", marginLeft: 4 }} numberOfLines={1}>
                @{user?.screenName ?? "unknown"}
              </Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 13, color: "gray", flexShrink: 0 }}>・{formatRelativeTime(status.createdAt)}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Media carousel */}
      {medias.length > 0 && <MediaCarousel medias={medias} />}

      {/* Body */}
      {status.body.length > 0 && (
        <TouchableOpacity onPress={navigateToStatus} activeOpacity={1}>
          {renderingMode === "twtr" ? (
            <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
              <StatusText status={status.body} />
            </View>
          ) : (
            <Text style={{ paddingHorizontal: 16, paddingVertical: 8, fontSize: 13 }}>{status.body}</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};
