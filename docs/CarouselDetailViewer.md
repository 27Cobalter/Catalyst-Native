# React Native Image Carousel & Detail Viewer Specification

## 1. Goal

React Native 上で、少し前の Twitter for iPhone や iOS Photos に近い操作感を持つ Image Carousel / Fullscreen Detail Viewer を実装する。

特に以下を重視する。

- スワイプ・ピンチ操作が滑らかであること
- Gesture の途中で UI が不自然に停止しないこと
- Carousel / Paging / Zoom / Pan / Dismiss が互いに誤作動しないこと
- 指と画像の動きが自然に連動すること
- 境界では hard clamp せず、rubber-band 的な抵抗を与えること
- Gesture 終了後は常に妥当な位置・拡大率へ自然に収束すること
- JS thread の負荷に極力依存せず、Gesture / Animation は UI thread 側で処理すること

想定技術:

```txt
React Native
react-native-gesture-handler
react-native-reanimated
TypeScript
```

Expo / Bare React Native のどちらでも利用可能な構造とする。

---

# 2. Component Structure

基本構造:

```txt
<ImageGallery>
 ├─ <ImageCarousel>
 │   ├─ <CarouselPage>
 │   └─ <PageIndicator>
 │
 └─ <ImageDetailViewer>
     ├─ <DetailPager>
     │   └─ <ZoomableImage>
     └─ optional overlay
```

責務を明確に分離する。

## ImageGallery

Carousel と Detail Viewer の状態管理を担当する。

```ts
type GalleryState =
  | {
      mode: "carousel";
      index: number;
    }
  | {
      mode: "detail";
      index: number;
    };
```

## ImageCarousel

通常表示時の horizontal paging を担当する。

Zoom / Pinch は担当しない。

## ImageDetailViewer

Fullscreen viewer。

以下を担当する。

```txt
Pinch Zoom
Zoomed Pan
Horizontal Paging
Vertical Dismiss
```

## DetailPager

Detail Viewer 内で前後画像の paging を担当する。

ただし paging が有効なのは画像が非拡大状態に近い場合のみ。

---

# 3. Public API

```ts
export type GalleryImage = {
  id: string;
  uri: string;

  width?: number;
  height?: number;

  alt?: string;
};

export type ImageGalleryProps = {
  images: GalleryImage[];

  initialIndex?: number;

  minScale?: number;
  maxScale?: number;

  pagingScaleThreshold?: number;
  dismissScaleThreshold?: number;

  onIndexChange?: (index: number) => void;

  onOpenDetail?: (index: number) => void;
  onCloseDetail?: (index: number) => void;

  renderImage?: (
    image: GalleryImage,
    context: {
      mode: "carousel" | "detail";
      index: number;
    },
  ) => React.ReactNode;
};
```

Default:

```ts
initialIndex = 0;

minScale = 1;
maxScale = 4;

pagingScaleThreshold = 1.02;
dismissScaleThreshold = 1.02;
```

`scale = 1` は画像本来の pixel size ではない。

**現在の viewport 内へ contain された状態**を `scale = 1` とする。

---

# 4. Image Base Layout

Detail Viewer では画像を viewport 内へ `contain` する。

```ts
viewportWidth;
viewportHeight;

imageWidth;
imageHeight;
```

base scale:

```ts
const baseScale = Math.min(viewportWidth / imageWidth, viewportHeight / imageHeight);
```

表示上の基準サイズ:

```ts
const baseWidth = imageWidth * baseScale;
const baseHeight = imageHeight * baseScale;
```

Viewer 内部の `scale` はこの base size に対する倍率。

```txt
scale = 1
```

の場合、必ず画像全体が viewport に収まる。

---

# 5. Carousel View

Carousel では左右スワイプで画像を切り替える。

```txt
previous ← current → next
```

指を動かしている間は current page と adjacent page が連続的に追従する。

Gesture release 後は、

```txt
previous
current
next
```

のいずれかへ animation 付きで snap する。

中途半端な位置では停止しない。

---

# 6. Carousel Swipe Decision

Gesture 終了時に以下を考慮する。

```ts
translationX;
velocityX;
viewportWidth;
```

Default:

```ts
distanceThreshold = viewportWidth * 0.2;
velocityThreshold = 500;
```

以下のどちらかで page transition。

```ts
Math.abs(translationX) > distanceThreshold || Math.abs(velocityX) > velocityThreshold;
```

十分な速度の flick なら、移動距離が短くても page transition する。

---

# 7. Carousel Edge Behavior

最初の画像より前、最後の画像より後には移動しない。

ただし Gesture 中に hard stop させない。

例:

```ts
effectiveTranslation = boundaryExceeded ? boundary + overshoot * 0.25 : translation;
```

release 後は spring animation で current page へ戻す。

---

# 8. Page Indicator

Carousel の画像領域の外側、下部中央へ dot indicator を表示する。
画像のサイズ・aspect ratio は画像領域に適用し、indicator の高さは別に確保する。
Fullscreen Detail Viewer の indicator は従来通り Safe Area 内に重ねて表示する。

```txt
○ ○ ● ○ ○
```

推奨:

```txt
inactive diameter: 6
active diameter:   6
gap:               5–7
```

背景画像に埋もれないよう、

```txt
white + subtle shadow
```

または半透明 backing 等で contrast を確保する。

---

# 9. Opening Detail Viewer

Carousel の画像を tap すると Detail Viewer を開く。

```txt
Carousel Image
      ↓ tap
Fullscreen Detail
```

同一 `index` を維持する。

初期 transition は、

```txt
fade
+
slight scale
```

程度を基本とする。

将来的な shared-element style transition に対応できる設計にはするが、v1 必須ではない。

---

# 10. Detail Viewer Initial State

Detail Viewer の画像は初期状態で:

```ts
scale = 1;
translateX = 0;
translateY = 0;
```

背景は基本:

```txt
black
```

Detail Viewer 内でも current index を持ち、左右 paging によって更新可能。

---

# 11. Detail Viewer Gesture Model

Detail Viewer には以下の操作が存在する。

```txt
Pinch
  → Zoom

scale > pagingScaleThreshold
  → Pan

scale <= pagingScaleThreshold
  + horizontal drag
  → Paging

scale <= dismissScaleThreshold
  + vertical drag
  → Dismiss
```

ユーザーから見た mental model:

```txt
Pinch = 写真そのものを拡大する

Zoom 中の drag
      = 写真の中を見る

非拡大時の左右 swipe
      = 前後の写真を見る

非拡大時の上下 swipe
      = Viewer を閉じる
```

---

# 12. Pinch Zoom

2本指 pinch により zoom する。

Pinch-out:

```txt
scale increases
```

Pinch-in:

```txt
scale decreases
```

Zoom 中心は画面中央固定ではない。

**Gesture focal point を中心に拡大する。**

利用する情報:

```ts
event.focalX;
event.focalY;
```

例えば画像右上をつまんだ場合、その画像上の point が極力指の下に残るよう translation を補正する。

---

# 13. Scale Range

通常の有効範囲:

```ts
minScale <= scale && scale <= maxScale;
```

Default:

```ts
minScale = 1;
maxScale = 4;
```

ただし Gesture 中は若干の overshoot を許可する。

例:

```txt
minimum visual scale ≈ 0.85
maximum visual scale ≈ maxScale + elastic overshoot
```

overshoot 部分には resistance を加える。

概念:

```ts
if (scale > maxScale) {
  displayedScale = maxScale + (scale - maxScale) * 0.2;
}
```

release 後:

```txt
scale < 1
  → spring → 1

scale > maxScale
  → spring → maxScale
```

Gesture update 中に hard clamp しない。

---

# 14. Pinch Focal Point Preservation

以下のみの実装は禁止。

```ts
scale.value = savedScale.value * event.scale;
```

scale の変更だけでは、zoom center が画像中央となり focal point とずれる。

Pinch 開始時点で、

```txt
focal point
current scale
current translation
```

を保存する。

scale 更新時は focal point に対応する画像上の座標が同じ screen position へ残るよう、

```txt
translateX
translateY
```

も同時に補正する。

---

# 15. Simultaneous Pinch + Two-Finger Translation

Pinch 中に2本指の中心位置が移動した場合、

```txt
zoom
+
translation
```

を同時に反映する。

つまり、

```txt
つまむ
↓
拡大
↓
そのまま2本指を移動
```

という操作を自然に行えること。

---

# 16. Zoomed Pan

```ts
scale > pagingScaleThreshold;
```

の場合、1本指 drag は画像 pan。

上下左右へ移動可能。

```txt
← → ↑ ↓
```

この状態では paging / dismiss は発生しない。

---

# 17. Pan Bounds

scaled image size:

```ts
const scaledWidth = baseWidth * scale;
const scaledHeight = baseHeight * scale;
```

移動可能範囲:

```ts
const maxTranslateX = Math.max(0, (scaledWidth - viewportWidth) / 2);

const maxTranslateY = Math.max(0, (scaledHeight - viewportHeight) / 2);
```

通常の有効範囲:

```ts
-maxTranslateX <= translateX && translateX <= maxTranslateX;

-maxTranslateY <= translateY && translateY <= maxTranslateY;
```

これによって画像左端を最大まで表示した場合、

```txt
画像左端 = viewport 左端
```

となる。

---

# 18. Pan Rubber Band

画像端へ到達しても、Gesture 中に完全停止させない。

さらに drag された場合は抵抗を与えながら少しだけ移動する。

概念:

```ts
function rubberBand(value: number, min: number, max: number, resistance = 0.25) {
  if (value < min) {
    return min + (value - min) * resistance;
  }

  if (value > max) {
    return max + (value - max) * resistance;
  }

  return value;
}
```

挙動:

```txt
valid range
    ↓
edge
    ↓
さらに drag
    ↓
抵抗付きで少し移動
    ↓
release
    ↓
spring
    ↓
valid range
```

---

# 19. Pan Bounds Recalculation

scale が変化すると pan bounds も変化する。

したがって、

```ts
maxTranslateX;
maxTranslateY;
```

は固定値として保持しない。

現在 scale から随時計算する。

Zoom-out によって現在 translation が新しい bounds 外になった場合、release 時に nearest valid position へ spring する。

画像が viewport より小さい axis は原則中央へ戻す。

```ts
translateX = 0;
```

または

```ts
translateY = 0;
```

---

# 20. Detail Viewer Horizontal Paging

画像がほぼ非拡大状態の場合、Detail Viewer 内でも左右 swipe で画像を切り替える。

条件:

```ts
scale <= pagingScaleThreshold;
```

Default:

```ts
pagingScaleThreshold = 1.02;
```

表示概念:

```txt
[ previous ][ current ][ next ]
                  ↑
              viewport
```

左方向へ drag:

```txt
current → left
next    → viewport
```

右方向へ drag:

```txt
current  → right
previous → viewport
```

Detail Viewer 自体は閉じない。

current index のみ変更する。

---

# 21. Detail Paging Gesture

Detail Viewer paging も Carousel と同様、指に連続して追従する。

Gesture release 後にのみ、

```txt
previous
current
next
```

のいずれかへ snap する。

Detail Viewer を一度閉じてから別 index で再度開くような実装は禁止。

---

# 22. Detail Paging Decision

Gesture release 時:

```ts
translationX;
velocityX;
viewportWidth;
```

を利用する。

Default:

```ts
pagingDistanceThreshold = viewportWidth * 0.2;

pagingVelocityThreshold = 500;
```

以下のいずれかで page transition:

```ts
Math.abs(translationX) > pagingDistanceThreshold || Math.abs(velocityX) > pagingVelocityThreshold;
```

条件を満たさなければ current page へ戻す。

---

# 23. Detail Paging Edge Behavior

先頭画像で右方向、末尾画像で左方向へ swipe しても page transition しない。

ただし hard clamp はしない。

Carousel と同様の rubber-band resistance を利用する。

```txt
drag
↓
edge resistance
↓
release
↓
spring back
```

---

# 24. Image State After Page Change

Detail Viewer で別画像へ移動した場合、新しい画像は初期状態から開始する。

```ts
scale = 1;
translateX = 0;
translateY = 0;
```

v1 では画像ごとの zoom / pan state を保存しない。

例:

```txt
Image A
scale = 1
↓ swipe

Image B
scale = 1
↓ pinch

Image B
scale = 2.5
```

この状態では Image C へ horizontal paging しない。

Image B を `scale ≈ 1` まで戻してから paging する。

---

# 25. Vertical Dismiss

画像がほぼ非拡大状態なら、上下 swipe で Detail Viewer を閉じられる。

条件:

```ts
scale <= dismissScaleThreshold;
```

Default:

```ts
dismissScaleThreshold = 1.02;
```

上方向・下方向の両方を許可する。

```txt
Detail Viewer
     ↓ / ↑
   dismiss
     ↓
Carousel
```

Carousel へ戻る際は current index を維持する。

---

# 26. Paging vs Dismiss Direction Lock

`scale ≈ 1` では、

```txt
horizontal = paging
vertical   = dismiss
```

となる。

Gesture 開始直後は ownership を即決しない。

```ts
type BaseScaleGestureMode = "undecided" | "paging" | "dismissing";
```

例えば:

```ts
directionLockThreshold = 8;
directionDominanceRatio = 1.2;
```

とする。

horizontal 判定:

```ts
Math.abs(translationX) > Math.abs(translationY) * directionDominanceRatio;
```

vertical 判定:

```ts
Math.abs(translationY) > Math.abs(translationX) * directionDominanceRatio;
```

一定距離を超えて direction dominance が確定した時点で ownership を決める。

---

# 27. Gesture Ownership

Gesture が開始された後に ownership を途中で変更しない。

例えば:

```txt
undecided
↓
paging
```

と決定したら、指を離すまで paging。

途中で vertical movement が増えても:

```txt
paging → dismiss
```

には切り替えない。

同様に:

```txt
dismissing → paging
```

も禁止。

これによって diagonal drag 時の jitter を防ぐ。

---

# 28. Pinch Ownership

2本指が認識された場合は pinch が最優先。

ただし既に active な paging / dismiss Gesture の途中で2本目の指が追加された場合、途中から pinch へ role switching しない。

現在 Gesture を cancel / settle してから、新しい pinch として開始する。

逆に pinch 中に指が1本になっても、その Gesture 内で pan / paging / dismiss へ切り替えない。

---

# 29. Detail Viewer Gesture Priority

基本 priority:

```txt
Pinch
  ↓
Zoomed Pan
  ↓
Base-scale direction detection
  ├─ Horizontal Paging
  └─ Vertical Dismiss
```

状態による分類:

```txt
2 fingers
  → Pinch

1 finger
+
scale > pagingScaleThreshold
  → Pan

1 finger
+
scale <= threshold
  → Undecided
       ├─ horizontal → Paging
       └─ vertical   → Dismiss
```

---

# 30. Viewer Gesture State Machine

```ts
type ViewerGestureState = "idle" | "undecided" | "pinching" | "panning" | "paging" | "dismissing" | "settling";
```

概念:

```txt
idle
 ├─ two fingers
 │    └─ pinching
 │
 └─ one finger
      │
      ├─ scale > pagingScaleThreshold
      │    └─ panning
      │
      └─ scale <= pagingScaleThreshold
           └─ undecided
               ├─ horizontal
               │    └─ paging
               │
               └─ vertical
                    └─ dismissing
```

---

# 31. Dismiss Interactive Animation

Dismiss 中は画像を指へ追従させる。

```ts
translateY = gesture.translationY;
```

同時に background opacity を下げる。

例:

```ts
const progress = Math.min(Math.abs(translationY) / (viewportHeight * 0.5), 1);
```

```ts
backgroundOpacity = interpolate(progress, [0, 1], [1, 0.3]);
```

必要なら画像も少し縮小可能。

```ts
dismissScale = interpolate(progress, [0, 1], [1, 0.92]);
```

過剰に小さくしない。

---

# 32. Dismiss Decision

Gesture release 時:

```ts
translationY;
velocityY;
```

を利用する。

Default:

```ts
distanceThreshold = viewportHeight * 0.15;

velocityThreshold = 800;
```

以下のどちらかで dismiss:

```ts
Math.abs(translationY) > distanceThreshold || Math.abs(velocityY) > velocityThreshold;
```

dismiss:

```txt
image → outside screen
background → transparent
```

cancel:

```txt
image → original position
background → opaque
```

へ spring。

---

# 33. Returning to Scale 1

Pinch-in により scale が 1 を下回った場合、Gesture 中のみ若干 overshoot 可能。

```txt
0.85 ～ 1.0 程度
```

release 時:

```ts
scale → 1;
translateX → 0;
translateY → 0;
```

へ spring。

この settle が終了した後、horizontal paging / vertical dismiss が利用可能になる。

Pinch 中に突然 paging / dismiss へ切り替えない。

---

# 34. Edge Hand-off

v1 では **Zoom 中の Edge Hand-off を実装しない。**

つまり、

```txt
scale > pagingScaleThreshold
```

の場合、horizontal drag は常に image pan。

画像端に達してさらに drag しても、次画像は表示しない。

挙動:

```txt
Zoomed Image
    ↓ pan
Image Edge
    ↓
rubber-band resistance
    ↓
release
    ↓
spring back
```

v2 以降では以下の拡張を検討できる。

```txt
Zoomed Pan
    ↓
Image Edge
    ↓
additional horizontal drag
    ↓
surplus translation
    ↓
Paging gestureへ hand-off
    ↓
Adjacent image appears
```

これは v1 の non-goal とする。

ただし将来的な実装を妨げない architecture にする。

---

# 35. Tap Behavior

Carousel:

```txt
single tap
→ Detail Viewer
```

Detail Viewer:

v1 では single tap に必須操作を割り当てない。

将来的に:

```txt
single tap
→ UI chrome show/hide
```

などを追加可能。

---

# 36. Double Tap Zoom

optional feature。

v1 必須ではない。

実装する場合:

```txt
scale ≈ 1
→ double tap
→ zoom in

scale > 1
→ double tap
→ scale = 1
```

zoom center は tap position。

例:

```ts
targetScale = Math.min(2.5, maxScale);
```

ただし Pinch / Pan / Paging / Dismiss の完成度を優先する。

---

# 37. Animation Characteristics

以下は spring animation を基本とする。

```txt
Carousel snap
Detail paging snap
Pan boundary recovery
Scale boundary recovery
Dismiss cancel
```

目標:

```txt
fast
responsive
slightly elastic
not excessively bouncy
```

Gesture release 時の velocity は可能なら animation の初速へ反映する。

---

# 38. Shared Paging Engine

Carousel と Detail Viewer で paging の操作感を揃える。

可能なら以下の pure logic を共有する。

```ts
getPagingTarget({
  index,
  count,
  translationX,
  velocityX,
  viewportWidth,
});

shouldChangePage(...);

applyPagingResistance(...);

getPageOffset(...);
```

Carousel と Detail Viewer で、

```txt
swipe distance
velocity sensitivity
edge resistance
snap feeling
```

が極端に異ならないようにする。

---

# 39. Rubber Band Utility

Pan / Carousel edge / Detail paging edge / Scale overshoot では同一思想の resistance を使用する。

可能であれば共通 utility 化する。

例:

```ts
function applyRubberBand(overshoot: number, dimension: number, coefficient: number): number;
```

単純な線形 resistance でもよいが、可能であれば overshoot が大きくなるほど抵抗が強くなる nonlinear curve を検討する。

重要なのは:

```txt
hard clamp しない
↓
しかし無限には動かない
↓
離すと自然に戻る
```

ことである。

---

# 40. Reduced Motion

OS の Reduce Motion 設定を尊重する。

Reduce Motion 有効時は、

```txt
large scale animation
large transition
spring overshoot
```

を抑える。

ただし Gesture に直接追従する movement 自体は維持する。

---

# 41. Orientation / Layout Changes

viewport size の変化を考慮する。

例:

```txt
device rotation
iPad multitasking
split view
window resize
```

Carousel:

```txt
current index
```

を維持。

Detail Viewer:

v1 では安全性を優先し、

```ts
scale = 1;
translateX = 0;
translateY = 0;
```

へ reset してよい。

current index は維持する。

---

# 42. Image Loading

画像 width / height が既知なら事前に利用する。

不明な場合は metadata を取得後に contain size を計算する。

loading 中に大きな layout jump を起こさない。

loading UI:

```txt
spinner
or
placeholder
```

failure 時は failure placeholder を表示可能にする。

---

# 43. Performance Requirements

Gesture 中に React state を毎 frame 更新しない。

以下は Reanimated Shared Value で管理する。

```ts
scale;

translateX;
translateY;

pagerOffset;

dismissProgress;
backgroundOpacity;

gestureMode;
```

React state へ同期するのは意味的イベントのみ。

例:

```txt
index changed
detail opened
detail closed
```

JS thread が一時的に busy でも Gesture animation が大きく崩れない設計を目指す。

---

# 44. Suggested Shared Values

```ts
const scale = useSharedValue(1);

const translateX = useSharedValue(0);
const translateY = useSharedValue(0);

const savedScale = useSharedValue(1);

const savedTranslateX = useSharedValue(0);

const savedTranslateY = useSharedValue(0);

const pagerOffset = useSharedValue(0);

const gestureMode = useSharedValue<
  "idle" | "undecided" | "pinching" | "panning" | "paging" | "dismissing" | "settling"
>("idle");
```

必要に応じて:

```ts
const focalX = useSharedValue(0);
const focalY = useSharedValue(0);
```

も利用する。

---

# 45. Important Rule: No Hard Clamp During Gesture

Gesture update ごとに以下のような hard clamp を直接使用しない。

```ts
translateX.value = Math.max(min, Math.min(max, proposedX));
```

同様に scale / pager offset にも hard clamp を適用しない。

Gesture 中:

```txt
rubber-band resistance
```

Gesture 終了後:

```txt
spring → valid range
```

とする。

---

# 46. Important Rule: Gesture Ownership Is Stable

Gesture 開始後に role switching しない。

例えば:

```txt
paging
→ dismiss
```

や、

```txt
pinching
→ paging
```

を同一 touch sequence 中に行わない。

Gesture ownership は開始時または direction lock 時点で決定し、終了まで維持する。

---

# 47. Accessibility

各画像へ accessibility label を設定可能にする。

```ts
image.alt;
```

があれば利用する。

Carousel / Detail Viewer ともに、

```txt
画像 2 / 5
```

のような positional information を提供する。

Page Indicator の各 dot を個別 focusable にする必要はない。

Detail Viewer を開いた場合、accessibility focus が viewer 内へ移るよう考慮する。

---

# 48. Safe Area

Indicator や Overlay UI は Safe Area を考慮する。

画像本体は:

```txt
edge-to-edge
```

表示可能。

Detail Viewer の background は screen 全域を覆う。

---

# 49. Testing Scenarios

最低限以下をテストする。

| Scenario                                    | Expected                          |
| ------------------------------------------- | --------------------------------- |
| Carousel 左右 swipe                         | 隣接画像へ smooth transition      |
| Carousel 高速 flick                         | velocity に応じて page transition |
| Carousel edge drag                          | resistance + spring back          |
| Carousel image tap                          | 同 index の Detail を開く         |
| Detail scale=1 で左 swipe                   | next image                        |
| Detail scale=1 で右 swipe                   | previous image                    |
| Detail paging edge                          | rubber-band + spring back         |
| Detail page change                          | 新画像は scale=1                  |
| Detail scale=1 で下 swipe                   | dismiss                           |
| Detail scale=1 で上 swipe                   | dismiss                           |
| Detail diagonal swipe                       | direction lock が安定して動作     |
| Detail horizontal paging 中に縦成分が増える | dismiss へ切り替わらない          |
| Detail vertical dismiss 中に横成分が増える  | paging へ切り替わらない           |
| Pinch-out                                   | focal point 中心に zoom           |
| Pinch + 2-finger move                       | zoom + translation                |
| maxScale 超過                               | resistance + spring               |
| scale < 1                                   | resistance + spring → 1           |
| Zoom 中 horizontal drag                     | image pan                         |
| Zoom 中 vertical drag                       | image pan                         |
| Zoom 中 image edge                          | rubber-band                       |
| Zoom 中 edge からさらに横 drag              | page transition しない            |
| Zoom-out で bounds 縮小                     | valid bounds へ戻る               |
| scale が threshold を超えている             | paging / dismiss しない           |
| scale が threshold 以下                     | direction に応じ paging / dismiss |
| Pinch 中に1本指になる                       | Gesture role を途中変更しない     |
| Paging 中に2本目の指追加                    | 突然 zoom へ変わらない            |
| Detail dismiss                              | Carousel へ同じ index で戻る      |
| viewport resize                             | current index を維持              |
| JS thread busy                              | Gesture が大きく崩れない          |

---

# 50. Suggested File Structure

```txt
components/
  image-gallery/
    ImageGallery.tsx

    ImageCarousel.tsx
    CarouselPage.tsx
    PageIndicator.tsx

    ImageDetailViewer.tsx
    DetailPager.tsx
    ZoomableImage.tsx

    gestures/
      useCarouselGesture.ts
      useDetailPagingGesture.ts
      useZoomGesture.ts
      usePanGesture.ts
      useDismissGesture.ts

    animations/
      rubberBand.ts
      paging.ts
      bounds.ts

    math/
      contain.ts
      zoom.ts
      pan.ts

    types.ts
    constants.ts
```

Gesture mathematics と React components を可能な限り分離する。

特に以下は pure function として testable にする。

```ts
getContainSize(...);

getPanBounds(...);

applyRubberBand(...);

clampToBounds(...);

getPagingTarget(...);

shouldChangePage(...);

shouldDismiss(...);

getZoomTranslationForFocalPoint(...);
```

---

# 51. Non-goals for v1

v1 では以下を必須としない。

```txt
Zoom 中の Edge Hand-off
per-image zoom state preservation
double-tap zoom
shared-element transition
video support
animated GIF special handling
image download
context menu
caption UI
toolbar UI
```

特に **Zoom 中の Edge Hand-off は意図的に v1 対象外**とする。

ただし Detail Viewer における、

```txt
scale ≈ 1
での左右画像切り替え
```

は v1 の必須要件。

---

# 52. UX Priority

判断に迷った場合は以下を優先する。

```txt
1. Gesture が指へ自然に追従する

2. Pinch / Pan / Paging / Dismiss が
   誤認識されない

3. Detail Viewer 内で画像を
   連続して閲覧できる

4. 境界で急停止しない

5. Gesture release 後は
   必ず安定状態へ戻る

6. Animation の見た目

7. 実装コードの単純さ
```

特に、

```txt
境界を越えてはいけない
```

を hard clamp と解釈しない。

正しい挙動:

```txt
通常状態
→ 境界内

Gesture 中
→ resistance 付きで一時的に overshoot

Gesture release
→ spring で境界内へ復帰
```

---

# 53. Interaction Examples

## Normal photo browsing

```txt
Carousel Image 1
↓ tap

Detail Image 1
scale = 1

← swipe

Detail Image 2
scale = 1

← swipe

Detail Image 3
```

---

## Zoom interaction

```txt
Detail Image 2
scale = 1

pinch out

scale = 2.5

← drag

image pan
(no paging)

→ drag to image edge

rubber-band
(no edge hand-off)

pinch in

scale → 1

← swipe

Detail Image 3
```

---

## Dismiss

```txt
Detail Image 3
scale = 1

↓ swipe

interactive dismiss

↓ threshold reached

Carousel Image 3
```

---

## Cancel dismiss

```txt
Detail Image
scale = 1

↓ slight drag

release before threshold

spring

Detail Image
```

---

# 54. Acceptance Criteria

以下をすべて満たした場合に v1 完成とみなす。

Carousel の左右 swipe が指へ滑らかに追従する。

距離だけでなく velocity も page transition 判定へ利用する。

Carousel edge では rubber-band resistance が発生する。

画像 tap で同じ index の fullscreen Detail Viewer が開く。

Detail Viewer の `scale ≈ 1` では左右 swipe で前後画像へ移動できる。

Detail Viewer の `scale ≈ 1` では上下 swipe で dismiss できる。

斜め swipe でも paging / dismiss の ownership が安定する。

一度 ownership が確定した Gesture は途中で別操作へ切り替わらない。

Pinch した focal point を中心に自然に zoom される。

Pinch 中の two-finger translation が自然に反映される。

Zoom 中は上下左右へ pan できる。

画像 edge は通常状態では viewport edge より内側へ入り込みすぎない。

ただし Gesture 中は resistance 付き overscroll を許容する。

overscroll 後は spring で valid bounds へ戻る。

最大 zoom 倍率を props で変更可能。

Zoom 中の horizontal movement は常に pan であり、隣画像への Edge Hand-off は発生しない。

Detail Viewer で page change した画像は `scale = 1` から始まる。

Detail Viewer を dismiss した際、Carousel は同一 current index を表示する。

Carousel と Detail Viewer の paging feeling が大きく異ならない。

Gesture / Animation は可能な限り UI thread で処理する。

iOS / Android 双方で破綻しない。

---

# 55. Implementation Approach

まず、

```txt
react-native-gesture-handler
+
react-native-reanimated
```

を用いた custom implementation とする。

Carousel は native FlatList / ScrollView の paging で要求する UX が実現できるなら利用してよい。

ただし、

```txt
elastic edge behavior
velocity-aware snap
Detail paging との操作感統一
```

を実現しにくい場合は Reanimated + Gesture Handler で paging offset を直接管理してよい。

Detail Viewer の:

```txt
Zoom
Pan
Paging
Dismiss
```

は Gesture arbitration が重要なため、custom Gesture implementation を基本とする。

第三者製 image viewer package へ置き換えて仕様を近似することは避ける。

実装の都合より、この仕様書に定義された Gesture semantics を優先する。

---

# 56. Future v2: Zoomed Edge Hand-off

v1 完成後に検討する。

目標:

```txt
Zoomed Image
↓
horizontal pan
↓
image edge
↓
さらに外側へ drag
↓
edge resistance
↓
一定条件を超える
↓
Adjacent image appears
↓
paging ownershipへ hand-off
```

この際は、

```txt
image pan translation
pager translation
velocity
current scale
edge direction
```

を滑らかに接続する必要がある。

v1 ではここまで実装しない。
