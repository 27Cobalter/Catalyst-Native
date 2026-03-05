import { getCdnUrl } from "@/lib/media";
import type { CatalystMedia } from "@natsuneko-laboratory/catalyst-sdk";
import { Image } from "expo-image";
import { EyeOff } from "lucide-react-native";
import React, { useState } from "react";
import { Dimensions, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAX_HEIGHT = SCREEN_HEIGHT / 2;

type Props = {
  medias: CatalystMedia[];
};

export const MediaCarousel = ({ medias }: Props) => {
  const [presentedMediaIndex, setPresentedMediaIndex] = useState<number | null>(null);
  const [isBlurRemoved, setIsBlurRemoved] = useState(false);

  const hasSensitiveContent = medias.some((m) => m.metadata?.isSensitive || m.metadata?.isSpoiler);
  const isSensitive = medias.some((m) => m.metadata?.isSensitive);
  const isSpoiler = medias.some((m) => m.metadata?.isSpoiler);

  const firstMedia = medias[0];
  const aspectRatio =
    firstMedia?.metadata?.width && firstMedia?.metadata?.height
      ? firstMedia.metadata.width / firstMedia.metadata.height
      : null;
  const actualHeight = aspectRatio ? Math.min(SCREEN_WIDTH / aspectRatio, MAX_HEIGHT) : MAX_HEIGHT;
  const carouselHeight = actualHeight + (medias.length > 1 ? 32 : 0);

  const handleMediaPress = (index: number) => {
    if (hasSensitiveContent && !isBlurRemoved) return;
    setPresentedMediaIndex(index);
  };

  return (
    <>
      <View style={{ height: carouselHeight }}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ height: actualHeight }}>
          {medias.map((media, index) => (
            <TouchableOpacity
              key={media.id}
              onPress={() => handleMediaPress(index)}
              activeOpacity={0.9}
              style={{
                width: SCREEN_WIDTH,
                height: actualHeight,
                backgroundColor: "rgba(128,128,128,0.25)",
              }}
            >
              <Image
                source={{
                  uri: getCdnUrl({
                    src: media.url,
                    width: SCREEN_WIDTH,
                    variant: "timeline",
                    aspect: { w: media.metadata?.width ?? 1, h: media.metadata?.height ?? 1 },
                  }),
                }}
                style={{ width: SCREEN_WIDTH, height: actualHeight }}
                contentFit="contain"
              />
              {hasSensitiveContent && !isBlurRemoved && (
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(255,255,255,0.6)",
                  }}
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sensitive content overlay */}
        {hasSensitiveContent && !isBlurRemoved && (
          <TouchableOpacity
            onPress={() => setIsBlurRemoved(true)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: carouselHeight,
              backgroundColor: "rgba(0,0,0,0.4)",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <EyeOff size={28} color="white" />
            <Text style={{ color: "white", fontWeight: "bold", fontSize: 17 }}>Tap to view</Text>
            {isSensitive && (
              <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>センシティブコンテンツです</Text>
            )}
            {isSpoiler && (
              <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>ネタバレ注意コンテンツです</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Fullscreen image modal */}
      <Modal
        visible={presentedMediaIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPresentedMediaIndex(null)}
      >
        <View style={{ flex: 1, backgroundColor: "black" }}>
          <Pressable
            onPress={() => setPresentedMediaIndex(null)}
            style={{ position: "absolute", top: 48, right: 16, zIndex: 10, padding: 8 }}
          >
            <Text style={{ color: "white", fontSize: 20 }}>✕</Text>
          </Pressable>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: (presentedMediaIndex ?? 0) * SCREEN_WIDTH, y: 0 }}
          >
            {medias.map((media) => (
              <Image
                key={media.id}
                source={{
                  uri: getCdnUrl({
                    src: media.url,
                    variant: "medium",
                    width: SCREEN_WIDTH,
                    aspect: { w: media.metadata?.width ?? 1, h: media.metadata?.height ?? 1 },
                  }),
                }}
                style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                contentFit="contain"
              />
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};
