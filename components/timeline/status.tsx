import { rel } from "@/lib/dayjs";
import { getCdnUrl } from "@/lib/media";
import type { CatalystStatus } from "@natsuneko-laboratory/catalyst-sdk";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { memo } from "react";
import { Pressable, Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { MediaCarousel } from "../MediaCarousel";
import { StatusText } from "../status/text";

export type StatusRenderingMode = "twtr" | "plain";

type Props = {
  status: CatalystStatus;
  renderingMode?: StatusRenderingMode;
};

const UniImage = withUniwind(Image);

export const TimelineStatus = memo(
  ({ status, renderingMode = "twtr" }: Props) => {
    const router = useRouter();

    const user = status.user!;
    const medias = status.medias;

    const navigateToStatus = () => router.push(`/status/${status.id}`);
    const navigateToUser = () =>
      user && router.push(`/user/${user.screenName}`);

    return (
      <View className="py-2">
        {/* Header */}
        <Pressable onPress={navigateToStatus}>
          <View className="flex-row items-center px-4 mb-1">
            <Pressable onPress={navigateToUser}>
              {user?.profile?.iconUrl ? (
                <UniImage
                  source={{
                    uri: getCdnUrl({
                      src: user.profile.iconUrl,
                      variant: "icon",
                      width: 64,
                    }),
                  }}
                  className="w-8 h-8 rounded-full"
                  contentFit="cover"
                />
              ) : (
                <View className="w-8 h-8 rounded-full bg-[#888] opacity-25" />
              )}
            </Pressable>

            <View className="flex-row items-center flex-1 ml-2 overflow-hidden">
              <Pressable
                className="flex flex-row items-center shrink overflow-hidden"
                onPress={navigateToUser}
              >
                <Text
                  className="font-bold text-sm text-black dark:text-white"
                  numberOfLines={1}
                >
                  {user.displayName }
                </Text>
                <Text
                  className="font-sm ml-1 text-neutral-500"
                  numberOfLines={1}
                >
                  @{user.screenName}
                </Text>
              </Pressable>
              <Text className="text-neutral-500 text-sm shrink-0">
                ・{rel(status.createdAt)}
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Media carousel */}
        {medias.length > 0 && <MediaCarousel medias={medias} />}

        {/* Body */}
        {status.body.length > 0 && (
          <Pressable onPress={navigateToStatus}>
            {renderingMode === "twtr" ? (
              <View className="px-4 py-2">
                <StatusText status={status.body} />
              </View>
            ) : (
              <Text className="px-4 py-2 text-sm">{status.body}</Text>
            )}
          </Pressable>
        )}
      </View>
    );
  },
);
TimelineStatus.displayName = "TimelineStatus";
