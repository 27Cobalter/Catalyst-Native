import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ImageCarousel } from "./ImageCarousel";
import { ImageDetailViewer } from "./ImageDetailViewer";
import { clamp } from "./math";
import type { GalleryState, ImageGalleryProps } from "./types";

export function ImageGallery(props: ImageGalleryProps) {
  const { images, initialIndex = 0, minScale = 1, maxScale = 4, onIndexChange, onCloseDetail } = props;
  if (!Number.isFinite(minScale) || minScale <= 0 || minScale > 1 || !Number.isFinite(maxScale) || maxScale < 1) {
    throw new Error("ImageGallery requires 0 < minScale <= 1 <= maxScale (1 is contain size).");
  }

  const [state, setState] = useState<GalleryState>({
    mode: "carousel",
    index: clamp(Math.trunc(Number.isFinite(initialIndex) ? initialIndex : 0), 0, Math.max(0, images.length - 1)),
  });
  const index = clamp(state.index, 0, Math.max(0, images.length - 1));

  useEffect(() => {
    if (index !== state.index) {
      setState((s) => ({ ...s, index }));
      onIndexChange?.(index);
    }
    if (images.length === 0 && state.mode === "detail") {
      setState({ mode: "carousel", index: 0 });
      onCloseDetail?.(index);
    }
  }, [index, state.index, state.mode, images.length, onIndexChange, onCloseDetail]);

  const changeIndex = (next: number) => {
    if (next === index) return;
    setState((s) => ({ ...s, index: next }));
    onIndexChange?.(next);
  };

  const close = () => {
    setState({ mode: "carousel", index });
    onCloseDetail?.(index);
  };

  if (images.length === 0) return null;

  return (
    <GestureHandlerRootView style={{ flex: 0 }}>
      <ImageCarousel
        {...props}
        index={index}
        onIndexChange={changeIndex}
        onOpenDetail={() => {
          setState({ mode: "detail", index });
          props.onOpenDetail?.(index);
        }}
      />
      {state.mode === "detail" && (
        <ImageDetailViewer {...props} index={index} onIndexChange={changeIndex} onClose={close} />
      )}
    </GestureHandlerRootView>
  );
}
