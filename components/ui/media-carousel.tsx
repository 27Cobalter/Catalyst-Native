import { getCdnUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { Zoomable } from "@likashefqet/react-native-image-zoom";
import type { Media } from "@natsuneko-laboratory/catalyst-sdk";
import { Image } from "expo-image";
import { EyeOff } from "lucide-react-native";
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const SPRING_CONFIG = {
  mass: 0.5,
  stiffness: 150,
  damping: 80,
  initialVelocity: 0.1,
};

type Props = {
  medias: Media[];
  onIndexChange?: (index: number) => void;
};

export const MediaCarousel = memo(({ medias, onIndexChange }: Props) => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const MAX_HEIGHT = SCREEN_HEIGHT / 2;
  const [presentedMediaIndex, setPresentedMediaIndex] = useState<number | null>(null);
  const [isBlurRemoved, setIsBlurRemoved] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  const [activeTouches, setActiveTouches] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const mediaIdentity = useMemo(() => medias.map((media) => media.id).join(":"), [medias]);

  const len = medias.length;
  const translateX = useSharedValue(0);
  // Settled integer index, readable from worklet
  const currentIndexSV = useSharedValue(0);

  // Modal dismiss gesture
  const modalTranslateY = useSharedValue(0);
  const zoomScale = useSharedValue(1);

  const dismissModal = () => setPresentedMediaIndex(null);

  useEffect(() => {
    // FlashList can recycle timeline cells, so reset carousel state when a different post's media set is mounted.
    setPresentedMediaIndex(null);
    setIsBlurRemoved(false);
    setCurrentIndex(0);
    setIsZoomed(false);
    setModalIndex(0);
    setActiveTouches(0);
    translateX.value = 0;
    currentIndexSV.value = 0;
    modalTranslateY.value = 0;
    zoomScale.value = 1;
    scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: false });
  }, [mediaIdentity, currentIndexSV, modalTranslateY, translateX, zoomScale]);

  const dismissPanGesture = Gesture.Pan()
    .activeOffsetY([-12, 12])
    .failOffsetX([-6, 6])
    .onUpdate((event) => {
      if (zoomScale.value > 1.01) return;
      modalTranslateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (zoomScale.value > 1.01) {
        modalTranslateY.value = withSpring(0, SPRING_CONFIG);
        return;
      }
      const shouldDismiss = Math.abs(event.translationY) > SCREEN_HEIGHT * 0.15 || Math.abs(event.velocityY) > 800;
      if (shouldDismiss) {
        const direction = event.translationY > 0 ? 1 : -1;
        modalTranslateY.value = withTiming(direction * SCREEN_HEIGHT, { duration: 200 }, () => {
          runOnJS(dismissModal)();
        });
      } else {
        modalTranslateY.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const modalContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalTranslateY.value }],
  }));

  const modalBgStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(0,0,0,${interpolate(Math.abs(modalTranslateY.value), [0, SCREEN_HEIGHT * 0.4], [1, 0.2], "clamp")})`,
  }));

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
    modalTranslateY.value = 0;
    setPresentedMediaIndex(index);
    setModalIndex(index);
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
      if (onIndexChange) runOnJS(onIndexChange)(newIndex);
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
    onIndexChange?.(index);
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
                  recyclingKey={`${mediaIdentity}:${media.id}:timeline`}
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
            className="absolute inset-0 bg-light-skeleton dark:bg-dark-skeleton items-center justify-center gap-2"
            onPress={() => setIsBlurRemoved(true)}
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
          <View className="h-8 flex-row justify-center items-center" style={{ width: SCREEN_WIDTH }}>
            {medias.map((_, index) => (
              <Pressable
                key={index}
                onPress={() => navigateToIndex(index)}
                hitSlop={8}
                className={cn(
                  "w-2 h-2 rounded-full p-1 mx-2",
                  index === currentIndex ? "bg-light-tint dark:bg-dark-tint" : "bg-light-icon dark:bg-dark-icon",
                )}
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
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Animated.View style={[{ flex: 1 }, modalBgStyle]}>
            <Pressable
              onPress={() => setPresentedMediaIndex(null)}
              style={{ position: "absolute", top: 48, right: 16, zIndex: 10, padding: 8 }}
            >
              <Text style={{ color: "white", fontSize: 20 }}>✕</Text>
            </Pressable>
            <GestureDetector gesture={dismissPanGesture}>
              <Animated.View style={[{ flex: 1 }, modalContentStyle]}>
                {presentedMediaIndex !== null && (
                  <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    pagingEnabled
                    scrollEnabled={!isZoomed && activeTouches < 2}
                    showsHorizontalScrollIndicator={false}
                    contentOffset={{ x: (presentedMediaIndex ?? 0) * SCREEN_WIDTH, y: 0 }}
                    onMomentumScrollEnd={(e) => {
                      const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                      setModalIndex(index);
                    }}
                    onTouchStart={(e) => setActiveTouches(e.nativeEvent.touches.length)}
                    onTouchMove={(e) => setActiveTouches(e.nativeEvent.touches.length)}
                    onTouchEnd={() => setActiveTouches(0)}
                  >
                    {medias.map((media, index) => (
                      <View
                        key={media.id}
                        style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: "center" }}
                      >
                        {index === modalIndex ? (
                          <Zoomable
                            minScale={1}
                            maxScale={5}
                            scale={zoomScale}
                            doubleTapScale={3}
                            isDoubleTapEnabled
                            isPinchEnabled
                            isPanEnabled={isZoomed}
                            onResetAnimationEnd={() => setIsZoomed(false)}
                            onPinchEnd={(event) => {
                              if (event.scale > 1) {
                                setIsZoomed(true);
                              } else {
                                setIsZoomed(false);
                              }
                            }}
                            style={{
                              width: SCREEN_WIDTH,
                              height: SCREEN_HEIGHT,
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <Image
                              recyclingKey={`${mediaIdentity}:${media.id}:modal`}
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
                          </Zoomable>
                        ) : (
                          <Image
                            recyclingKey={`${mediaIdentity}:${media.id}:modal`}
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
                        )}
                      </View>
                    ))}
                  </ScrollView>
                )}
              </Animated.View>
            </GestureDetector>
          </Animated.View>
        </GestureHandlerRootView>
      </Modal>
    </>
  );
});
MediaCarousel.displayName = "MediaCarousel";
