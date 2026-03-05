import { getCdnUrl } from "@/lib/media";
import type { Media } from "@/natsuneko-laboratory/catalyst-sdk/packages/nodejs/dist";
import { Image } from "expo-image";
import { EyeOff } from "lucide-react-native";
import React, { useState } from "react";
import { Dimensions, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAX_HEIGHT = SCREEN_HEIGHT / 2;

const SPRING_CONFIG = {
  mass: 0.5,
  stiffness: 150,
  damping: 80,
  initialVelocity: 0.1,
};

type Props = {
  medias: Media[];
};

export const MediaCarousel = ({ medias }: Props) => {
  const [presentedMediaIndex, setPresentedMediaIndex] = useState<number | null>(null);
  const [isBlurRemoved, setIsBlurRemoved] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const len = medias.length;
  const translateX = useSharedValue(0);
  // Settled integer index, readable from worklet
  const currentIndexSV = useSharedValue(0);

  const hasSensitiveContent = medias.some((m) => m.metadata?.isSensitive || m.metadata?.isSpoiler);
  const isSensitive = medias.some((m) => m.metadata?.isSensitive);
  const isSpoiler = medias.some((m) => m.metadata?.isSpoiler);

  const firstMedia = medias[0];
  const aspectRatio =
    firstMedia?.metadata?.width && firstMedia?.metadata?.height
      ? firstMedia.metadata.width / firstMedia.metadata.height
      : null;
  const actualHeight = aspectRatio ? Math.min(SCREEN_WIDTH / aspectRatio, MAX_HEIGHT) : MAX_HEIGHT;
  const carouselHeight = actualHeight + (len > 1 ? 32 : 0);

  const handleMediaPress = (index: number) => {
    if (hasSensitiveContent && !isBlurRemoved) return;
    setPresentedMediaIndex(index);
  };

  const panGesture = Gesture.Pan()
    // Only activate for horizontal movement (≥10px), fail if vertical dominates
    // tan(60°) ≈ 1.7 → same tolerance as Swift HorizontalPanGestureRecognizer
    .activeOffsetX([-10, 10])
    .failOffsetY([-6, 6])
    .onUpdate((event) => {
      const translation = event.translationX;
      let applied: number;
      // Apply resistance at edges (divide by 5)
      if (currentIndexSV.value === 0 && translation > 0) {
        applied = translation / 5;
      } else if (currentIndexSV.value === len - 1 && translation < 0) {
        applied = translation / 5;
      } else {
        applied = translation;
      }
      translateX.value = -currentIndexSV.value * SCREEN_WIDTH + applied;
    })
    .onEnd((event) => {
      const translation = event.translationX;
      const velocity = event.velocityX;
      let newIndex = currentIndexSV.value;

      const threshold = SCREEN_WIDTH * 0.1;
      if (Math.abs(translation) > threshold || Math.abs(velocity) > 500) {
        newIndex = translation > 0 ? currentIndexSV.value - 1 : currentIndexSV.value + 1;
      }

      newIndex = Math.max(0, Math.min(newIndex, len - 1));
      currentIndexSV.value = newIndex;
      translateX.value = withSpring(-newIndex * SCREEN_WIDTH, SPRING_CONFIG);
      runOnJS(setCurrentIndex)(newIndex);
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(handleMediaPress)(currentIndexSV.value);
  });

  // Pan takes priority; tap fires only when no horizontal pan is detected
  const gesture = Gesture.Exclusive(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const navigateToIndex = (index: number) => {
    currentIndexSV.value = index;
    translateX.value = withSpring(-index * SCREEN_WIDTH, SPRING_CONFIG);
    setCurrentIndex(index);
  };

  return (
    <>
      <View style={{ height: carouselHeight, overflow: "hidden" }}>
        <GestureDetector gesture={gesture}>
          <Animated.View
            style={[
              {
                flexDirection: "row",
                height: actualHeight,
                width: SCREEN_WIDTH * len,
              },
              animatedStyle,
            ]}
          >
            {medias.map((media) => (
              <View
                key={media.id}
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
              </View>
            ))}
          </Animated.View>
        </GestureDetector>

        {/* Sensitive content overlay */}
        {hasSensitiveContent && !isBlurRemoved && (
          <Pressable
            onPress={() => setIsBlurRemoved(true)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: actualHeight,
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
          </Pressable>
        )}

        {/* Indicator dots */}
        {len > 1 && (
          <View
            style={{
              width: SCREEN_WIDTH,
              height: 32,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {medias.map((_, index) => (
              <Pressable
                key={index}
                onPress={() => navigateToIndex(index)}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  margin: 2,
                  backgroundColor: index === currentIndex ? "#007AFF" : "#8E8E93",
                }}
              />
            ))}
          </View>
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
