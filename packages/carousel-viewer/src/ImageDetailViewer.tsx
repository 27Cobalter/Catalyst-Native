import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, findNodeHandle, Modal, Pressable, Text, View } from "react-native";
import { GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useDerivedValue, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useMotion } from "./animation";
import { ImageContent, useImageSize } from "./ImageContent";
import { clamp, getContainSize } from "./math";
import { PageIndicator } from "./PageIndicator";
import { styles } from "./styles";
import type { GalleryImage, PagerProps } from "./types";
import { useDetailGesture } from "./useDetailGesture";

type Props = PagerProps & { onClose: () => void };

function DetailPage({
  image,
  page,
  active,
  width,
  height,
  renderImage,
  reduceMotion,
  zoomValues,
}: {
  image: GalleryImage;
  page: number;
  active: boolean;
  width: number;
  height: number;
  renderImage: PagerProps["renderImage"];
  reduceMotion?: boolean;
  zoomValues: Pick<ReturnType<typeof useDetailGesture>, "x" | "y" | "scale" | "dismiss">;
}) {
  const metadata = useImageSize(image, width, height);
  const base = getContainSize(width, height, metadata.width, metadata.height);
  const { x, y, scale, dismiss } = zoomValues;
  const { reduced } = useMotion(reduceMotion);
  const zoom = useAnimatedStyle(() => ({
    transform: [
      { translateX: active ? x.value : 0 },
      { translateY: active ? y.value + dismiss.value : 0 },
      {
        scale: active
          ? scale.value * (reduced ? 1 : 1 - 0.08 * Math.min(Math.abs(dismiss.value) / (height * 0.5), 1))
          : 1,
      },
    ],
  }));
  return (
    <View style={[styles.page, { width, height, left: page * width }]}>
      <Animated.View style={[{ width: base.width, height: base.height }, zoom]}>
        <ImageContent image={image} index={page} mode="detail" renderImage={renderImage} />
      </Animated.View>
    </View>
  );
}

function DetailPager({ width, height, ...props }: Props & { width: number; height: number }) {
  const { images, index, renderImage, onClose, onIndexChange } = props;
  const metadata = useImageSize(images[index], width, height);
  const base = getContainSize(width, height, metadata.width, metadata.height);
  const { spring } = useMotion(props.reduceMotion);
  // Worklets may capture shared values, but not the ManualGesture instance.
  const { gesture, closing, dismiss, pager, x, y, scale } = useDetailGesture({
    width,
    height,
    baseWidth: base.width,
    baseHeight: base.height,
    index,
    count: images.length,
    minScale: props.minScale ?? 1,
    maxScale: props.maxScale ?? 4,
    pagingScaleThreshold: props.pagingScaleThreshold ?? 1.02,
    dismissScaleThreshold: props.dismissScaleThreshold ?? 1.02,
    onIndexChange,
    onClose,
    onLongPress: props.onLongPress,
    doubleTapScale: props.doubleTapScale,
    longPressDuration: props.longPressDuration,
    spring,
    imageIdentity: JSON.stringify([images[index].id, images[index].uri]),
  });
  const insets = useSafeAreaInsets();
  const count = images.length;
  const progress = useDerivedValue(() => clamp(-pager.value / width, 0, count - 1));
  const background = useAnimatedStyle(() => ({
    opacity: closing.value
      ? Math.max(0, 1 - Math.abs(dismiss.value) / height)
      : 1 - 0.7 * Math.min(Math.abs(dismiss.value) / (height * 0.5), 1),
  }));
  const track = useAnimatedStyle(() => ({ transform: [{ translateX: pager.value }] }));
  const chrome = useAnimatedStyle(() => ({ opacity: 1 - Math.min(Math.abs(dismiss.value) / (height * 0.3), 1) }));
  const closeRef = useRef<View>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const handle = findNodeHandle(closeRef.current);
      if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
    });
    return () => cancelAnimationFrame(frame);
  }, [index]);

  return (
    <View style={styles.fill} accessibilityViewIsModal onAccessibilityEscape={onClose}>
      <Animated.View style={[styles.black, background]} />
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={styles.viewport}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`${images[index].alt ?? "画像"}、画像 ${index + 1} / ${images.length}`}
          accessibilityActions={[
            { name: "increment", label: "次の画像" },
            { name: "decrement", label: "前の画像" },
            { name: "escape", label: "閉じる" },
          ]}
          onAccessibilityAction={(e) => {
            const action = e.nativeEvent.actionName;
            if (action === "escape") onClose();
            else if (action === "increment" || action === "decrement")
              onIndexChange(clamp(index + (action === "increment" ? 1 : -1), 0, images.length - 1));
          }}
        >
          <Animated.View style={[styles.absolute, track]}>
            {images.slice(Math.max(0, index - 1), index + 2).map((image, i) => {
              const page = Math.max(0, index - 1) + i;
              return (
                <DetailPage
                  key={image.id}
                  image={image}
                  page={page}
                  active={page === index}
                  width={width}
                  height={height}
                  renderImage={renderImage}
                  reduceMotion={props.reduceMotion}
                  zoomValues={{ x, y, scale, dismiss }}
                />
              );
            })}
          </Animated.View>
        </Animated.View>
      </GestureDetector>
      <Animated.View style={[styles.chrome, chrome]} pointerEvents="box-none">
        <SafeAreaView style={styles.fill} pointerEvents="box-none">
          <Pressable
            ref={closeRef}
            accessibilityRole="button"
            accessibilityLabel="画像を閉じる"
            onPress={onClose}
            style={styles.close}
          >
            <Text style={styles.closeIcon}>&times;</Text>
          </Pressable>
          {props.renderOverlay?.({ index, close: onClose })}
          <PageIndicator count={count} index={index} bottom={insets.bottom + 12} progress={progress} />
        </SafeAreaView>
      </Animated.View>
      {props.renderDetailForeground && (
        <View style={styles.absolute} pointerEvents="box-none">
          {props.renderDetailForeground({ index, close: onClose })}
        </View>
      )}
    </View>
  );
}

function DetailSurface(props: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const opening = useSharedValue(0);
  const { reduced } = useMotion(props.reduceMotion);

  useEffect(() => {
    opening.value = withTiming(1, { duration: reduced ? 0 : 180 });
  }, [opening, reduced]);

  const entrance = useAnimatedStyle(() => ({
    opacity: opening.value,
    transform: [{ scale: reduced ? 1 : 0.97 + opening.value * 0.03 }],
  }));

  return (
    <Animated.View style={[styles.fill, entrance]} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      {size.width > 0 && size.height > 0 && props.images.length > 0 && <DetailPager {...props} {...size} />}
    </Animated.View>
  );
}

export function ImageDetailViewer(props: Props) {
  return (
    <Modal
      visible
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      supportedOrientations={["portrait", "portrait-upside-down", "landscape-left", "landscape-right"]}
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={props.onClose}
    >
      <GestureHandlerRootView style={styles.fill}>
        <SafeAreaProvider>
          <DetailSurface {...props} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Modal>
  );
}
