import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, findNodeHandle, Modal, Pressable, Text, View } from "react-native";
import { GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ImageContent, useImageSize } from "./ImageContent";
import { PageIndicator } from "./PageIndicator";
import { clamp, getContainSize } from "./math";
import { styles } from "./styles";
import type { PagerProps } from "./types";
import { useDetailGesture } from "./useDetailGesture";

type Props = PagerProps & { onClose: () => void };
function DetailPager({ width, height, ...props }: Props & { width: number; height: number }) {
  const { images, index, renderImage, onClose, onIndexChange } = props;
  const metadata = useImageSize(images[index], width, height);
  const base = getContainSize(width, height, metadata.width, metadata.height);
  const g = useDetailGesture({
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
  });
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const background = useAnimatedStyle(() => ({
    opacity: g.closing.value
      ? Math.max(0, 1 - Math.abs(g.dismiss.value) / height)
      : 1 - 0.7 * Math.min(Math.abs(g.dismiss.value) / (height * 0.5), 1),
  }));
  const track = useAnimatedStyle(() => ({ transform: [{ translateX: g.pager.value }] }));
  const zoom = useAnimatedStyle(() => ({
    transform: [
      { translateX: g.x.value },
      { translateY: g.y.value + g.dismiss.value },
      { scale: g.scale.value * (reduced ? 1 : 1 - 0.08 * Math.min(Math.abs(g.dismiss.value) / (height * 0.5), 1)) },
    ],
  }));
  const chrome = useAnimatedStyle(() => ({ opacity: 1 - Math.min(Math.abs(g.dismiss.value) / (height * 0.3), 1) }));
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
      <GestureDetector gesture={g.gesture}>
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
                <View key={image.id} style={[styles.page, { width, height, left: (page - index) * width }]}>
                  {page === index ? (
                    <Animated.View style={[{ width: base.width, height: base.height }, zoom]}>
                      <ImageContent image={image} index={page} mode="detail" renderImage={renderImage} />
                    </Animated.View>
                  ) : (
                    <ImageContent image={image} index={page} mode="detail" renderImage={renderImage} />
                  )}
                </View>
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
            <Text style={styles.white}>閉じる</Text>
          </Pressable>
          {props.renderOverlay?.({ index, close: onClose })}
          <PageIndicator count={images.length} index={index} bottom={insets.bottom + 12} />
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

function DetailSurface(props: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const opening = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    opening.value = withTiming(1, { duration: reduced ? 0 : 180 });
  }, [opening, reduced]);

  const entrance = useAnimatedStyle(() => ({
    opacity: opening.value,
    transform: [{ scale: reduced ? 1 : 0.97 + opening.value * 0.03 }],
  }));

  return (
    <Animated.View style={[styles.fill, entrance]} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      {size.width > 0 && size.height > 0 && props.images.length > 0 && (
        <DetailPager
          key={`${props.index}:${props.images[props.index].id}:${props.images[props.index].uri}:${size.width}:${size.height}`}
          {...props}
          {...size}
        />
      )}
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
