import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export type GalleryImage = { id: string; uri: string; width?: number; height?: number; alt?: string };
export type GalleryState = { mode: "carousel" | "detail"; index: number };
export type ViewerGestureState = "idle" | "undecided" | "pinching" | "panning" | "paging" | "dismissing" | "settling";
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
  renderImage?: (image: GalleryImage, context: { mode: "carousel" | "detail"; index: number }) => ReactNode;
  style?: StyleProp<ViewStyle>;
  renderOverlay?: (context: { index: number; close: () => void }) => ReactNode;
};
export type PagerProps = ImageGalleryProps & { index: number; onIndexChange: (index: number) => void };
