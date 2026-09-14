import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useMotion } from "./animation";
import { ImageContent } from "./ImageContent";
import { clamp, getPagingTarget, rubberBand } from "./math";
import { PageIndicator } from "./PageIndicator";
import { styles } from "./styles";
import type { PagerProps } from "./types";

type Props = PagerProps & { onOpenDetail: (index: number) => void };

function CarouselPages({
  width,
  height,
  offset,
  ...props
}: Props & { width: number; height: number; offset: SharedValue<number> }) {
  const { images, index, onIndexChange, onOpenDetail, renderImage, detailEnabled = true } = props;
  const { reduced, spring } = useMotion(props.reduceMotion);
  const settling = useSharedValue(false);
  const previous = useRef({ index, width });
  // Page the animation starts from, so pages in between stay mounted while jumping several pages.
  const [jumpFrom, setJumpFrom] = useState<number | null>(null);
  useEffect(() => () => cancelAnimation(offset), [offset]);
  useLayoutEffect(() => {
    const target = -index * width;
    // Swipes already ended at the target; external index changes (e.g. indicator taps) spring there.
    const animate =
      !reduced && previous.current.width === width && previous.current.index !== index && offset.value !== target;
    const from = previous.current.index;
    previous.current = { index, width };
    cancelAnimation(offset);
    if (!animate) {
      offset.value = target;
      settling.value = false;
      setJumpFrom(null);
      return;
    }
    setJumpFrom(Math.abs(from - index) > 1 ? from : null);
    settling.value = true;
    offset.value = withSpring(target, spring, (finished) => {
      if (finished) {
        settling.value = false;
        scheduleOnRN(setJumpFrom, null);
      }
    });
    // `spring` is rebuilt every render; it only depends on the reduce-motion values listed here.
  }, [index, width, offset, settling, reduced, props.reduceMotion]);
  const firstPage = Math.max(0, Math.min(index, jumpFrom ?? index) - 1);
  const lastPage = Math.max(index, jumpFrom ?? index) + 1;

  const pan = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetX([-8, 8])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      if (settling.value) return;
      offset.value =
        -index * width +
        rubberBand(e.translationX, index === images.length - 1 ? 0 : -width, index === 0 ? 0 : width, width);
    })
    .onEnd((e) => {
      if (settling.value) return;
      settling.value = true;
      const target = getPagingTarget(index, images.length, e.translationX, e.velocityX, width);
      offset.value = withSpring(-target * width, { ...spring, velocity: e.velocityX }, (finished) => {
        if (finished) {
          if (target !== index) scheduleOnRN(onIndexChange, target);
          else settling.value = false;
        }
      });
    })
    .onFinalize((_e, success) => {
      if (!success && !settling.value) offset.value = withSpring(-index * width, spring);
    });

  const tap = Gesture.Tap().onEnd((_e, success) => {
    if (success && detailEnabled && !settling.value) scheduleOnRN(onOpenDetail, index);
  });

  const animated = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <Animated.View
        style={styles.viewport}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`${images[index].alt ?? "画像"}、画像 ${index + 1} / ${images.length}`}
        accessibilityActions={[
          ...(detailEnabled ? [{ name: "activate", label: "画像を開く" }] : []),
          { name: "increment", label: "次の画像" },
          { name: "decrement", label: "前の画像" },
        ]}
        onAccessibilityAction={(e) => {
          const action = e.nativeEvent.actionName;
          if (action === "activate") {
            if (detailEnabled) onOpenDetail(index);
          } else if (action === "increment" || action === "decrement")
            onIndexChange(clamp(index + (action === "increment" ? 1 : -1), 0, images.length - 1));
        }}
      >
        <Animated.View style={[styles.absolute, animated]}>
          {images.slice(firstPage, lastPage + 1).map((image, i) => {
            const page = firstPage + i;
            return (
              <View key={image.id} style={[styles.page, { width, height, left: page * width }]}>
                <ImageContent image={image} index={page} mode="carousel" renderImage={renderImage} />
              </View>
            );
          })}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

export function ImageCarousel(props: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const offset = useSharedValue(0);
  const { index, images } = props;
  const { width } = size;
  const count = images.length;
  const progress = useDerivedValue(() => (width > 0 ? clamp(-offset.value / width, 0, count - 1) : index));

  return (
    <View>
      <View style={[styles.gallery, props.style]} onLayout={(e) => setSize(e.nativeEvent.layout)}>
        {size.width > 0 && size.height > 0 && props.images.length > 0 && (
          <>
            <CarouselPages {...props} {...size} offset={offset} />
            {/* Sibling of the gesture view so overlay touches never reach carousel gestures. */}
            {props.renderCarouselOverlay && (
              <View style={styles.absolute} pointerEvents="box-none">
                {props.renderCarouselOverlay({ index, width: size.width, height: size.height })}
              </View>
            )}
          </>
        )}
      </View>
      {props.renderCarouselIndicator ? (
        props.renderCarouselIndicator({ count, index, progress, setIndex: props.onIndexChange })
      ) : (
        <PageIndicator count={count} index={index} placement="below" progress={progress} />
      )}
    </View>
  );
}
