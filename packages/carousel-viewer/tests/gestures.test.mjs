import assert from "node:assert/strict";
import { test } from "node:test";
import { registerHooks } from "node:module";

// Exercise the real worklet callbacks with deterministic native/animation adapters.
const completions = [];
const animate = (target, _config, done) => {
  if (done) completions.push(done);
  return target;
};
const mock = {
  useEffect: () => {},
  useLayoutEffect: () => {},
  cancelAnimation: () => {},
  Gesture: {
    Manual() {
      const callbacks = {};
      const builder = {
        callbacks,
        shouldCancelWhenOutside() {
          return this;
        },
      };
      for (const name of ["onTouchesDown", "onTouchesMove", "onTouchesUp", "onTouchesCancelled"]) {
        builder[name] = (callback) => {
          callbacks[name] = callback;
          return builder;
        };
      }
      return builder;
    },
  },
  useSharedValue: (value) => ({ value }),
  withSpring: animate,
  withTiming: animate,
  ReduceMotion: { System: "system" },
  scheduleOnRN: (fn, ...args) => fn(...args),
};
globalThis.__carouselTest = mock;
registerHooks({
  resolve(specifier, context, next) {
    if (
      ["react", "react-native-gesture-handler", "react-native-reanimated", "react-native-worklets"].includes(specifier)
    )
      return { url: "carousel-mock:" + specifier, shortCircuit: true };
    if (specifier.startsWith("./") && context.parentURL?.endsWith(".ts") && !specifier.endsWith(".ts"))
      return next(specifier + ".ts", context);
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith("carousel-mock:"))
      return {
        format: "module",
        shortCircuit: true,
        source:
          "export const { Gesture, useEffect, useLayoutEffect, cancelAnimation, useSharedValue, withSpring, withTiming, ReduceMotion, scheduleOnRN } = globalThis.__carouselTest;",
      };
    return next(url, context);
  },
});
const { useDetailGesture } = await import("../src/useDetailGesture.ts");
const point = (id, x, y) => ({ id, x, y });
function setup() {
  completions.length = 0;
  const changes = [],
    closed = [];
  const g = useDetailGesture({
    width: 400,
    height: 800,
    baseWidth: 400,
    baseHeight: 400,
    index: 1,
    count: 3,
    minScale: 1,
    maxScale: 4,
    pagingScaleThreshold: 1.02,
    dismissScaleThreshold: 1.02,
    onIndexChange: (i) => changes.push(i),
    onClose: () => closed.push(true),
  });
  const event = (name, touches) =>
    g.gesture.callbacks[name](
      { allTouches: touches, numberOfTouches: touches.length },
      { activate() {}, end() {}, fail() {} },
    );
  const flush = () => {
    while (completions.length) completions.shift()(true);
  };
  return { g, changes, closed, event, flush };
}
test("horizontal ownership remains paging when the drag becomes vertical", () => {
  const { g, event, flush, changes, closed } = setup();
  event("onTouchesDown", [point(1, 200, 400)]);
  event("onTouchesMove", [point(1, 100, 400)]);
  event("onTouchesMove", [point(1, 90, 700)]);
  assert.equal(g.mode.value, "paging");
  assert.equal(g.dismiss.value, 0);
  event("onTouchesUp", []);
  flush();
  assert.deepEqual(changes, [2]);
  assert.deepEqual(closed, []);
});
test("vertical ownership never becomes paging", () => {
  const { g, event, flush, changes, closed } = setup();
  event("onTouchesDown", [point(1, 200, 400)]);
  event("onTouchesMove", [point(1, 200, 550)]);
  event("onTouchesMove", [point(1, 390, 600)]);
  assert.equal(g.mode.value, "dismissing");
  assert.equal(g.pager.value, -400);
  event("onTouchesUp", []);
  flush();
  assert.deepEqual(changes, []);
  assert.deepEqual(closed, [true]);
});
test("pinch preserves focal position, then lifting one finger settles without pan", () => {
  const { g, event, flush } = setup();
  event("onTouchesDown", [point(1, 200, 400), point(2, 300, 400)]);
  event("onTouchesMove", [point(1, 200, 400), point(2, 400, 400)]);
  assert.equal(g.scale.value, 2);
  assert.equal(g.x.value, 0);
  event("onTouchesMove", [point(1, 230, 440), point(2, 430, 440)]);
  assert.equal(g.x.value, 30);
  assert.equal(g.y.value, 40);
  event("onTouchesUp", [point(1, 230, 440)]);
  flush();
  const x = g.x.value;
  event("onTouchesMove", [point(1, 0, 0)]);
  assert.equal(g.x.value, x);
  assert.equal(g.pager.value, -400);
  event("onTouchesUp", []);
});
test("zoomed edge drag remains pan and returns within bounds", () => {
  const { g, event, flush, changes, closed } = setup();
  g.scale.value = 2;
  event("onTouchesDown", [point(1, 200, 400)]);
  event("onTouchesMove", [point(1, 1200, 1400)]);
  assert.equal(g.mode.value, "panning");
  assert.ok(g.x.value > 200 && g.x.value < 600);
  assert.equal(g.pager.value, -400);
  assert.equal(g.dismiss.value, 0);
  event("onTouchesUp", []);
  flush();
  assert.equal(g.x.value, 200);
  assert.equal(g.y.value, 0);
  assert.deepEqual(changes, []);
  assert.deepEqual(closed, []);
});
test("second finger first settles paging and starts a fresh pinch baseline", () => {
  const { g, event, flush, changes } = setup();
  event("onTouchesDown", [point(1, 200, 400)]);
  event("onTouchesMove", [point(1, 100, 400)]);
  event("onTouchesDown", [point(1, 100, 400), point(2, 200, 400)]);
  assert.equal(g.mode.value, "settling");
  assert.equal(g.scale.value, 1);
  flush();
  event("onTouchesMove", [point(1, 100, 400), point(2, 200, 400)]);
  assert.equal(g.mode.value, "pinching");
  assert.equal(g.pager.value, -400);
  event("onTouchesMove", [point(1, 50, 400), point(2, 250, 400)]);
  assert.equal(g.scale.value, 2);
  assert.deepEqual(changes, []);
});
test("cancellation settles every transform and releases ownership", () => {
  const { g, event, flush } = setup();
  event("onTouchesDown", [point(1, 100, 400), point(2, 300, 400)]);
  event("onTouchesMove", [point(1, 190, 400), point(2, 210, 400)]);
  assert.ok(g.scale.value < 1 && g.scale.value > 0.85);
  event("onTouchesCancelled", []);
  flush();
  assert.equal(g.scale.value, 1);
  assert.equal(g.x.value, 0);
  assert.equal(g.y.value, 0);
  assert.equal(g.mode.value, "idle");
});
