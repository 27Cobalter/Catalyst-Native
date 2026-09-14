import { useEffect, useLayoutEffect } from "react";
import { Gesture } from "react-native-gesture-handler";
import { cancelAnimation, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { spring } from "./animation";
import {
  clamp,
  getPagingTarget,
  getPanBounds,
  getZoomTranslationForFocalPoint,
  lockDirection,
  rubberBand,
  shouldDismiss,
} from "./math";
import type { ViewerGestureState } from "./types";

type Options = {
  width: number;
  height: number;
  baseWidth: number;
  baseHeight: number;
  index: number;
  count: number;
  minScale: number;
  maxScale: number;
  pagingScaleThreshold: number;
  dismissScaleThreshold: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  imageIdentity?: string;
};

export function useDetailGesture(o: Options) {
  const {
    width,
    height,
    baseWidth,
    baseHeight,
    index,
    count,
    minScale,
    maxScale,
    pagingScaleThreshold,
    dismissScaleThreshold,
    onIndexChange,
    onClose,
    imageIdentity,
  } = o;
  const scale = useSharedValue(1),
    x = useSharedValue(0),
    y = useSharedValue(0);
  const pager = useSharedValue(-index * width),
    dismiss = useSharedValue(0),
    closing = useSharedValue(false);
  const mode = useSharedValue<ViewerGestureState>("idle"),
    blocked = useSharedValue(false);
  const startX = useSharedValue(0),
    startY = useSharedValue(0);
  const savedX = useSharedValue(0),
    savedY = useSharedValue(0),
    savedScale = useSharedValue(1);
  const focalX = useSharedValue(0),
    focalY = useSharedValue(0),
    distance = useSharedValue(1);
  const lastX = useSharedValue(0),
    lastY = useSharedValue(0),
    lastTime = useSharedValue(0);
  const velocityX = useSharedValue(0),
    velocityY = useSharedValue(0);
  const restartPinch = useSharedValue(false);
  const pointerA = useSharedValue(-1),
    pointerB = useSharedValue(-1);

  useEffect(
    () => () => {
      for (const value of [scale, x, y, pager, dismiss]) cancelAnimation(value);
    },
    [scale, x, y, pager, dismiss],
  );

  const pending = useSharedValue(0);
  const interruptible = useSharedValue(false);
  const settleRevision = useSharedValue(0);
  // Reset transforms without remounting the pager or its preloaded images.
  useLayoutEffect(() => {
    for (const value of [scale, x, y, pager, dismiss]) cancelAnimation(value);
    scale.value = 1;
    x.value = y.value = dismiss.value = 0;
    pager.value = -index * width;
    mode.value = "idle";
    blocked.value = closing.value = restartPinch.value = false;
    pending.value = 0;
    interruptible.value = false;
    settleRevision.value += 1;
    pointerA.value = pointerB.value = -1;
  }, [
    index,
    width,
    height,
    imageIdentity,
    scale,
    x,
    y,
    pager,
    dismiss,
    mode,
    blocked,
    closing,
    restartPinch,
    pending,
    interruptible,
    settleRevision,
    pointerA,
    pointerB,
  ]);
  const settle = () => {
    "worklet";
    interruptible.value = mode.value === "pinching" || mode.value === "panning";
    mode.value = "settling";
    const revision = ++settleRevision.value;
    const target = clamp(scale.value, minScale, maxScale);
    const bounds = getPanBounds(width, height, baseWidth, baseHeight, target);
    const corrections = [
      [scale, target],
      [x, clamp(x.value, -bounds.x, bounds.x)],
      [y, clamp(y.value, -bounds.y, bounds.y)],
      [pager, -index * width],
      [dismiss, 0],
    ] as const;
    // In-bounds releases need no recovery animation or input lock.
    pending.value = corrections.filter(([value, destination]) => value.value !== destination).length;
    if (pending.value === 0) {
      mode.value = "idle";
      interruptible.value = false;
      return;
    }
    const done = (finished?: boolean) => {
      "worklet";
      if (finished && settleRevision.value === revision) {
        pending.value -= 1;
        if (pending.value === 0) {
          mode.value = "idle";
          interruptible.value = false;
        }
      }
    };
    for (const [value, destination] of corrections) {
      if (value.value !== destination) value.value = withSpring(destination, spring, done);
    }
  };

  const gesture = Gesture.Manual()
    .shouldCancelWhenOutside(false)
    .onTouchesDown((e, manager) => {
      if (closing.value || blocked.value) {
        blocked.value = true;
        return;
      }
      if (mode.value === "settling") {
        if (!interruptible.value) {
          blocked.value = true;
          return;
        }
        // A fresh touch takes over zoom recovery at its current visual position.
        settleRevision.value += 1;
        for (const value of [scale, x, y, pager, dismiss]) cancelAnimation(value);
        pending.value = 0;
        interruptible.value = false;
        mode.value = "idle";
      }
      if (e.numberOfTouches > 2) {
        blocked.value = true;
        settle();
        return;
      }
      if (e.numberOfTouches === 2) {
        if (mode.value !== "idle" && mode.value !== "undecided") {
          // Settle the old owner before establishing a fresh pinch baseline.
          restartPinch.value = true;
          blocked.value = true;
          settle();
          return;
        }
        const a = e.allTouches[0],
          b = e.allTouches[1];
        pointerA.value = a.id;
        pointerB.value = b.id;
        distance.value = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
        focalX.value = (a.x + b.x) / 2 - width / 2;
        focalY.value = (a.y + b.y) / 2 - height / 2;
        savedScale.value = scale.value;
        savedX.value = x.value;
        savedY.value = y.value;
        mode.value = "pinching";
        manager.activate();
      } else if (e.numberOfTouches === 1 && mode.value === "idle") {
        const a = e.allTouches[0];
        pointerA.value = a.id;
        startX.value = lastX.value = a.x;
        startY.value = lastY.value = a.y;
        lastTime.value = Date.now();
        velocityX.value = velocityY.value = 0;
        savedX.value = x.value;
        savedY.value = y.value;
        // A second finger can start pinch immediately until a drag actually begins.
        mode.value = "undecided";
        manager.activate();
      }
    })
    .onTouchesMove((e) => {
      if (restartPinch.value && mode.value === "idle" && e.numberOfTouches === 2) {
        const a = e.allTouches[0],
          b = e.allTouches[1];
        pointerA.value = a.id;
        pointerB.value = b.id;
        distance.value = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
        focalX.value = (a.x + b.x) / 2 - width / 2;
        focalY.value = (a.y + b.y) / 2 - height / 2;
        savedScale.value = scale.value;
        savedX.value = x.value;
        savedY.value = y.value;
        restartPinch.value = false;
        blocked.value = false;
        mode.value = "pinching";
      }
      if (blocked.value || mode.value === "settling") return;
      const a = e.allTouches.find((t) => t.id === pointerA.value);
      if (!a) return;
      if (mode.value === "pinching") {
        const b = e.allTouches.find((t) => t.id === pointerB.value);
        if (!b) return;
        const proposed = (savedScale.value * Math.hypot(b.x - a.x, b.y - a.y)) / distance.value;
        scale.value = rubberBand(
          proposed,
          Math.min(minScale, savedScale.value),
          Math.max(maxScale, savedScale.value),
          minScale * 0.15,
          0.2,
        );
        x.value = getZoomTranslationForFocalPoint(
          focalX.value,
          (a.x + b.x) / 2 - width / 2,
          savedX.value,
          savedScale.value,
          scale.value,
        );
        y.value = getZoomTranslationForFocalPoint(
          focalY.value,
          (a.y + b.y) / 2 - height / 2,
          savedY.value,
          savedScale.value,
          scale.value,
        );
        return;
      }
      const dx = a.x - startX.value,
        dy = a.y - startY.value;
      const now = Date.now(),
        elapsed = Math.max(1, now - lastTime.value);
      velocityX.value = ((a.x - lastX.value) * 1000) / elapsed;
      velocityY.value = ((a.y - lastY.value) * 1000) / elapsed;
      lastX.value = a.x;
      lastY.value = a.y;
      lastTime.value = now;

      if (mode.value === "undecided") {
        if (scale.value > pagingScaleThreshold) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) >= 8) mode.value = "panning";
        } else {
          const direction = lockDirection(dx, dy);
          if (direction === "paging" && scale.value <= pagingScaleThreshold) mode.value = direction;
          if (direction === "dismissing" && scale.value <= dismissScaleThreshold) mode.value = direction;
        }
      }

      if (mode.value === "panning") {
        const bounds = getPanBounds(width, height, baseWidth, baseHeight, scale.value);
        // Re-grabbing during recovery must not apply resistance to the baseline twice.
        x.value = rubberBand(savedX.value + dx, Math.min(-bounds.x, savedX.value), Math.max(bounds.x, savedX.value), width);
        y.value = rubberBand(savedY.value + dy, Math.min(-bounds.y, savedY.value), Math.max(bounds.y, savedY.value), height);
      } else if (mode.value === "paging") {
        pager.value = -index * width + rubberBand(dx, index === count - 1 ? 0 : -width, index === 0 ? 0 : width, width);
      } else if (mode.value === "dismissing") {
        dismiss.value = dy;
      }
    })
    .onTouchesUp((e, manager) => {
      if (e.numberOfTouches < 2) restartPinch.value = false;
      if (blocked.value) {
        if (e.numberOfTouches === 0) {
          blocked.value = false;
          manager.end();
        }
        return;
      }
      if (mode.value === "pinching") {
        // Lifting either finger ends pinch; the remaining finger cannot take over.
        blocked.value = e.numberOfTouches > 0;
        settle();
        if (e.numberOfTouches === 0) manager.end();
        return;
      }
      if (e.numberOfTouches !== 0) return;
      const vx = Date.now() - lastTime.value > 100 ? 0 : velocityX.value;
      const vy = Date.now() - lastTime.value > 100 ? 0 : velocityY.value;
      if (mode.value === "paging") {
        const target = getPagingTarget(index, count, lastX.value - startX.value, vx, width);
        mode.value = "settling";
        pager.value = withSpring(-target * width, { ...spring, velocity: vx }, (finished) => {
          if (finished) {
            if (target !== index) scheduleOnRN(onIndexChange, target);
            else mode.value = "idle";
          }
        });
      } else if (mode.value === "dismissing" && shouldDismiss(dismiss.value, vy, height)) {
        mode.value = "settling";
        closing.value = true;
        const direction = Math.sign(Math.abs(vy) > 800 ? vy : dismiss.value) || 1;
        dismiss.value = withTiming(
          direction * height,
          { duration: 220, reduceMotion: spring.reduceMotion },
          (finished) => {
            if (finished) scheduleOnRN(onClose);
          },
        );
      } else settle();
      manager.end();
    })
    .onTouchesCancelled((_e, manager) => {
      restartPinch.value = false;
      blocked.value = false;
      settle();
      manager.fail();
    });

  return { gesture, mode, scale, x, y, pager, dismiss, closing };
}
