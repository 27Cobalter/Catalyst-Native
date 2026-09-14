import { useEffect, useLayoutEffect, useRef } from "react";
import { Gesture } from "react-native-gesture-handler";
import { cancelAnimation, ReduceMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { spring as defaultSpring } from "./animation";
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
  onLongPress?: (index: number) => void;
  doubleTapScale?: number;
  longPressDuration?: number;
  spring?: typeof defaultSpring;
  imageIdentity?: string;
};

const TAP_SLOP = 8;
const TAP_MAX_DURATION = 400;
// Measured from the first tap's release to the second tap's press.
const DOUBLE_TAP_DELAY = 300;
const DOUBLE_TAP_DISTANCE = 48;
// Fraction of the width a slow drag needs to change pages; flicks page by velocity.
const PAGING_DISTANCE = 0.1;

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
    onLongPress,
    doubleTapScale = 2.5,
    longPressDuration = 500,
    spring = defaultSpring,
    imageIdentity,
  } = o;
  const scale = useSharedValue(1),
    x = useSharedValue(0),
    y = useSharedValue(0);
  // Page the pager is at or springing to. Worklets read this instead of `index`, which lags behind until re-render.
  const page = useSharedValue(index),
    pagerStart = useSharedValue(0);
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
  const downTime = useSharedValue(0),
    moved = useSharedValue(false),
    longPressed = useSharedValue(false),
    pressRevision = useSharedValue(0),
    pressTimer = useSharedValue(0);
  const lastTapTime = useSharedValue(0),
    lastTapX = useSharedValue(0),
    lastTapY = useSharedValue(0),
    doubleTapCandidate = useSharedValue(false);
  // A touch that started during an interruptible settle; the settle keeps animating until the touch moves or pinches.
  const takeover = useSharedValue(false);

  useEffect(
    () => () => {
      for (const value of [scale, x, y, pager, dismiss, pressTimer]) cancelAnimation(value);
    },
    [scale, x, y, pager, dismiss, pressTimer],
  );

  const pending = useSharedValue(0);
  const interruptible = useSharedValue(false);
  const settleRevision = useSharedValue(0);
  const previous = useRef({ index, width, height });
  // Reset transforms without remounting the pager or its preloaded images.
  useLayoutEffect(() => {
    const from = previous.current;
    previous.current = { index, width, height };
    // A swipe already reported this page: its spring (and any touch that took over from it) keeps running.
    // Paging only starts unzoomed, so there is no zoom state to reset.
    if (from.index !== index && from.width === width && from.height === height && page.value === index) return;
    page.value = index;
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
    pressRevision.value += 1;
    lastTapTime.value = 0;
    takeover.value = false;
  }, [
    index,
    width,
    height,
    imageIdentity,
    page,
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
    pressRevision,
    lastTapTime,
    takeover,
  ]);
  const settleDone = (revision: number) => {
    "worklet";
    return (finished?: boolean) => {
      "worklet";
      if (finished && settleRevision.value === revision) {
        pending.value -= 1;
        if (pending.value === 0) {
          interruptible.value = false;
          // A touch that took over the settle owns the mode; it resumes or ends the settle itself.
          if (mode.value === "settling") mode.value = "idle";
        }
      }
    };
  };
  // Stops a settle that a touch took over, freezing transforms at their current visual position.
  const takeOver = () => {
    "worklet";
    if (!takeover.value) return;
    takeover.value = false;
    settleRevision.value += 1;
    for (const value of [scale, x, y, pager, dismiss]) cancelAnimation(value);
    pending.value = 0;
    interruptible.value = false;
    savedX.value = x.value;
    savedY.value = y.value;
    pagerStart.value = pager.value;
  };
  // Without targets, recovers the current transform into bounds; with targets, animates a zoom (double tap).
  const settle = (targetScale?: number, targetX?: number, targetY?: number) => {
    "worklet";
    interruptible.value =
      targetScale !== undefined || mode.value === "pinching" || mode.value === "panning" || mode.value === "undecided";
    mode.value = "settling";
    const revision = ++settleRevision.value;
    const target = clamp(targetScale ?? scale.value, minScale, maxScale);
    const bounds = getPanBounds(width, height, baseWidth, baseHeight, target);
    const corrections = [
      [scale, target],
      [x, clamp(targetX ?? x.value, -bounds.x, bounds.x)],
      [y, clamp(targetY ?? y.value, -bounds.y, bounds.y)],
      [pager, -page.value * width],
      [dismiss, 0],
    ] as const;
    // In-bounds releases need no recovery animation or input lock.
    pending.value = corrections.filter(([value, destination]) => value.value !== destination).length;
    if (pending.value === 0) {
      mode.value = "idle";
      interruptible.value = false;
      return;
    }
    const done = settleDone(revision);
    for (const [value, destination] of corrections) {
      if (value.value !== destination) value.value = withSpring(destination, spring, done);
    }
  };

  // Ends a touch that did not take ownership: let a taken-over settle keep running, otherwise settle.
  const resume = () => {
    "worklet";
    if (takeover.value) {
      takeover.value = false;
      if (pending.value > 0) {
        mode.value = "settling";
        return;
      }
    }
    settle();
  };
  const gesture = Gesture.Manual()
    .shouldCancelWhenOutside(false)
    .onTouchesDown((e, manager) => {
      // Any additional finger cancels a pending long press.
      pressRevision.value += 1;
      if (closing.value || blocked.value) {
        blocked.value = true;
        return;
      }
      if (mode.value === "settling") {
        if (!interruptible.value) {
          blocked.value = true;
          return;
        }
        // Keep animating so a tap (e.g. the first half of a double tap) does not freeze the settle.
        takeover.value = true;
        mode.value = "idle";
      }
      if (e.numberOfTouches > 2) {
        takeOver();
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
        takeOver();
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
        pagerStart.value = pager.value;
        downTime.value = lastTime.value;
        moved.value = longPressed.value = false;
        doubleTapCandidate.value =
          downTime.value - lastTapTime.value <= DOUBLE_TAP_DELAY &&
          Math.hypot(a.x - lastTapX.value, a.y - lastTapY.value) <= DOUBLE_TAP_DISTANCE;
        if (onLongPress) {
          const revision = pressRevision.value;
          // A UI-thread timer: the timing animation only exists to call back after the duration.
          pressTimer.value = 0;
          pressTimer.value = withTiming(
            1,
            { duration: longPressDuration, reduceMotion: ReduceMotion.Never },
            (finished) => {
              if (finished && pressRevision.value === revision && mode.value === "undecided" && !moved.value) {
                longPressed.value = true;
                scheduleOnRN(onLongPress, page.value);
              }
            },
          );
        }
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

      if (Math.max(Math.abs(dx), Math.abs(dy)) >= TAP_SLOP) moved.value = true;
      if (mode.value === "undecided") {
        if (longPressed.value) return;
        if (scale.value > pagingScaleThreshold) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) >= 8) mode.value = "panning";
        } else {
          const direction = lockDirection(dx, dy);
          if (direction === "paging" && scale.value <= pagingScaleThreshold) mode.value = direction;
          if (direction === "dismissing" && scale.value <= dismissScaleThreshold) mode.value = direction;
        }
        // The drag now owns the transforms; continue from where the settle currently is.
        if (mode.value !== "undecided") takeOver();
      }

      if (mode.value === "panning") {
        const bounds = getPanBounds(width, height, baseWidth, baseHeight, scale.value);
        // Re-grabbing during recovery must not apply resistance to the baseline twice.
        x.value = rubberBand(
          savedX.value + dx,
          Math.min(-bounds.x, savedX.value),
          Math.max(bounds.x, savedX.value),
          width,
        );
        y.value = rubberBand(
          savedY.value + dy,
          Math.min(-bounds.y, savedY.value),
          Math.max(bounds.y, savedY.value),
          height,
        );
      } else if (mode.value === "paging") {
        // Continue from where the pager was grabbed (possibly mid-spring); only neighbours of `page` are mounted.
        pager.value = rubberBand(
          pagerStart.value + dx,
          -Math.min(page.value + 1, count - 1) * width,
          -Math.max(page.value - 1, 0) * width,
          width,
        );
      } else if (mode.value === "dismissing") {
        dismiss.value = dy;
      }
    })
    .onTouchesUp((e, manager) => {
      pressRevision.value += 1;
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
        const from = page.value;
        const target = getPagingTarget(from, count, pager.value + from * width, vx, width, PAGING_DISTANCE);
        page.value = target;
        // A new touch may grab the pager while it springs, so consecutive swipes are never dropped.
        mode.value = "settling";
        interruptible.value = true;
        pending.value = 1;
        const revision = ++settleRevision.value;
        pager.value = withSpring(-target * width, { ...spring, velocity: vx }, settleDone(revision));
        // Report immediately so the next swipe and the indicator do not wait for the spring to rest.
        if (target !== from) scheduleOnRN(onIndexChange, target);
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
      } else if (
        mode.value === "undecided" &&
        !moved.value &&
        !longPressed.value &&
        Date.now() - downTime.value <= TAP_MAX_DURATION
      ) {
        if (doubleTapScale > 1 && doubleTapCandidate.value) {
          lastTapTime.value = 0;
          // Zoom from the current (possibly mid-animation) transform.
          takeOver();
          if (scale.value > pagingScaleThreshold) settle(1, 0, 0);
          else {
            const target = clamp(doubleTapScale, minScale, maxScale);
            const focusX = lastX.value - width / 2,
              focusY = lastY.value - height / 2;
            settle(
              target,
              getZoomTranslationForFocalPoint(focusX, focusX, x.value, scale.value, target),
              getZoomTranslationForFocalPoint(focusY, focusY, y.value, scale.value, target),
            );
          }
        } else {
          lastTapTime.value = Date.now();
          lastTapX.value = lastX.value;
          lastTapY.value = lastY.value;
          resume();
        }
      } else resume();
      manager.end();
    })
    .onTouchesCancelled((_e, manager) => {
      pressRevision.value += 1;
      restartPinch.value = false;
      blocked.value = false;
      takeOver();
      settle();
      manager.fail();
    });

  return { gesture, mode, scale, x, y, pager, dismiss, closing };
}
