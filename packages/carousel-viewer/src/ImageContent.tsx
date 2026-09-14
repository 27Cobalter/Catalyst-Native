import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";
import { styles } from "./styles";
import type { GalleryImage, ImageGalleryProps } from "./types";

export function useImageSize(image: GalleryImage, width: number, height: number) {
  const [metadata, setMetadata] = useState<{ uri: string; width: number; height: number }>();

  useEffect(() => {
    let alive = true;
    if (!(image.width && image.height))
      Image.getSize(
        image.uri,
        (w, h) => {
          if (alive) setMetadata({ uri: image.uri, width: w, height: h });
        },
        () => { },
      );
    return () => {
      alive = false;
    };
  }, [image.uri, image.width, image.height]);

  if (image.width && image.width > 0 && image.height && image.height > 0)
    return { width: image.width, height: image.height };
  return metadata?.uri === image.uri ? metadata : { width, height };
}

export function ImageContent({
  image,
  index,
  mode,
  renderImage,
}: {
  image: GalleryImage;
  index: number;
  mode: "carousel" | "detail";
  renderImage?: ImageGalleryProps["renderImage"];
}) {
  const [status, setStatus] = useState("loading");

  useEffect(() => setStatus("loading"), [image.uri]);

  if (renderImage) return <View style={styles.absolute}>{renderImage(image, { mode, index })}</View>;

  return (
    <View style={styles.absolute}>
      <Image
        source={{ uri: image.uri }}
        resizeMode="contain"
        style={styles.absolute}
        accessibilityLabel={image.alt}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
      {status !== "loaded" && (
        <View pointerEvents="none" style={styles.center}>
          {status === "loading" ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.white}>画像を読み込めませんでした</Text>
          )}
        </View>
      )}
    </View>
  );
}
