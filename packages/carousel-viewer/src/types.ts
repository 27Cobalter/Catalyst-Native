import type { ReactNode, RefObject } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import type { GestureType } from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";

/** A gesture, or a ref to one, that RNGH gesture relations can resolve to a handler tag. */
export type ExternalGestureRef = GestureType | RefObject<GestureType | undefined>;
export type GalleryImage = { id: string; uri: string; width?: number; height?: number; alt?: string };
export type GalleryState = { mode: "carousel" | "detail"; index: number };
export type ViewerGestureState = "idle" | "undecided" | "pinching" | "panning" | "paging" | "dismissing" | "settling";
export type CarouselIndicatorContext = {
  count: number;
  index: number;
  /** Fractional page position that follows the drag on the UI thread. */
  progress: SharedValue<number>;
  setIndex: (index: number) => void;
};
export type ImageGalleryProps = {
  images: GalleryImage[];
  initialIndex?: number;
  minScale?: number;
  maxScale?: number;
  pagingScaleThreshold?: number;
  dismissScaleThreshold?: number;
  /** Scale applied by double tap in Detail. Values <= 1 disable double tap. */
  doubleTapScale?: number;
  longPressDuration?: number;
  /** Overrides the system Reduce Motion setting. */
  reduceMotion?: boolean;
  /** When false, tapping the carousel does not open Detail. */
  detailEnabled?: boolean;
  /**
   * Gestures outside the gallery that must wait for the carousel swipe to fail before they can
   * activate — typically the horizontal pager the carousel is embedded in. Only consulted when
   * there is more than one image, since a single image never claims the swipe.
   */
  blockedExternalGestures?: ExternalGestureRef[];
  /**
   * When set, the carousel logs every swipe decision (position, direction, winner) with this label.
   * Development aid only; leave unset in release builds.
   */
  debugLabel?: string;
  onIndexChange?: (index: number) => void;
  onOpenDetail?: (index: number) => void;
  onCloseDetail?: (index: number) => void;
  /** Long press on the Detail image. */
  onLongPress?: (index: number) => void;
  renderImage?: (image: GalleryImage, context: { mode: "carousel" | "detail"; index: number }) => ReactNode;
  style?: StyleProp<ViewStyle>;
  /** UI drawn over the carousel image viewport (not including the indicator). */
  renderCarouselOverlay?: (context: { index: number; width: number; height: number }) => ReactNode;
  /** Replaces the default carousel indicator below the viewport. */
  renderCarouselIndicator?: (context: CarouselIndicatorContext) => ReactNode;
  renderOverlay?: (context: { index: number; close: () => void }) => ReactNode;
  /** Fullscreen UI above the Detail chrome, outside the Safe Area and dismiss fade (e.g. bottom sheets). */
  renderDetailForeground?: (context: { index: number; close: () => void }) => ReactNode;
};
export type PagerProps = ImageGalleryProps & { index: number; onIndexChange: (index: number) => void };
