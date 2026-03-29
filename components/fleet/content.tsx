import { useContainerUnits } from "@/hooks/use-container-units";
import { getCdnUrl } from "@/lib/media";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { withUniwind } from "uniwind";

const UniImage = withUniwind(Image);

type FleetTextStyle = "default" | "bold" | "serif" | "handwriting";
type FleetTextAlignment = "left" | "center" | "right";

export type FleetMediaPlacement = {
  posX: number;
  posY: number;
  scale: number;
  rotation: number;
};

export type FleetMediaEntity = {
  alt?: string;
  height?: number;
  placement?: FleetMediaPlacement;
  url: string;
  width?: number;
};

export type FleetTextEntity = {
  backgroundColor?: string;
  body: string;
  color: string;
  id?: string;
  posX: number;
  posY: number;
  rotation: number;
  scale: number;
  textAlignment: FleetTextAlignment;
  textStyle: FleetTextStyle;
};

export type FleetStickerEntity = {
  emoji: string;
  id?: string;
  imageUrl?: string;
  posX: number;
  posY: number;
  rotation: number;
  scale: number;
};

export type FleetContentData = {
  backgroundColor: string;
  media: FleetMediaEntity | null;
  mediaPlacement?: FleetMediaPlacement;
  stickers: FleetStickerEntity[];
  texts: FleetTextEntity[];
};

type Props = {
  fleet: FleetContentData;
  onMediaLoad?: () => void;
};

const DEFAULT_MEDIA_PLACEMENT: FleetMediaPlacement = {
  posX: 0.5,
  posY: 0.5,
  rotation: 0,
  scale: 1,
};

const getFleetFontFamily = (style: FleetTextStyle) => {
  switch (style) {
    case "bold":
      return "Noto Sans JP Bold";
    case "serif":
      return "Noto Sans JP Regular";
    case "handwriting":
      return "HunyaJi-Re";
    default:
      return "Noto Sans JP Regular";
  }
};

export const FleetContent = ({ fleet, onMediaLoad }: Props) => {
  const { containerHeight, containerWidth, onLayout, cqh, cqw } = useContainerUnits();
  const mediaPlacement = fleet.media?.placement ?? fleet.mediaPlacement ?? DEFAULT_MEDIA_PLACEMENT;

  return (
    <View
      className="relative h-full w-full overflow-hidden bg-light-surface dark:bg-dark-surface items-center justify-center"
      style={{ backgroundColor: fleet.backgroundColor }}
      onLayout={onLayout}
    >
      <View style={{ aspectRatio: 9 / 16 }} className="w-full h-auto">
        {fleet.media ? (
          <View
            pointerEvents="none"
            style={[
              styles.centeredLayer,
              {
                transform: [
                  { translateX: (mediaPlacement.posX - 0.5) * containerWidth },
                  { translateY: (mediaPlacement.posY - 0.5) * containerHeight },
                  { scale: mediaPlacement.scale },
                  { rotate: `${mediaPlacement.rotation}deg` },
                ],
              },
            ]}
          >
            <UniImage
              source={{ uri: getCdnUrl({ src: fleet.media.url, width: containerWidth, variant: "medium" }) }}
              style={{
                width: cqw(100),
                height: (cqw(100) * (fleet.media.height ?? containerHeight)) / (fleet.media.width ?? containerWidth),
              }}
              accessibilityLabel={fleet.media.alt}
              contentFit="cover"
              onLoad={onMediaLoad}
            />
          </View>
        ) : null}

        {fleet.texts.map((text, index) => {
          const fontSize = Math.max(cqh(3), 14);
          const verticalPadding = Math.max(cqh(1.2), 8);
          const horizontalPadding = Math.max(cqw(3.2), 12);
          const borderRadius = Math.max(cqw(1.5), 10);

          return (
            <View
              key={text.id ?? `${text.body}-${index}`}
              pointerEvents="none"
              style={[
                styles.centeredLayer,
                {
                  transform: [
                    { translateX: (text.posX - 0.5) * containerWidth },
                    { translateY: (text.posY - 0.5) * containerHeight },
                    { scale: text.scale },
                    { rotate: `${text.rotation}deg` },
                  ],
                },
              ]}
            >
              <Text
                style={{
                  backgroundColor: text.backgroundColor ?? "transparent",
                  borderRadius,
                  color: text.color,
                  fontFamily: getFleetFontFamily(text.textStyle),
                  fontSize,
                  lineHeight: fontSize * 1.25,
                  paddingHorizontal: horizontalPadding,
                  paddingVertical: verticalPadding,
                  textAlign: text.textAlignment,
                  textShadowColor: "rgba(0, 0, 0, 0.45)",
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 6,
                }}
              >
                {text.body || "テキストを入力..."}
              </Text>
            </View>
          );
        })}

        {fleet.stickers.map((sticker, index) => {
          const size = Math.max(cqw(8), 28);

          return (
            <View
              key={sticker.id ?? `${sticker.emoji}-${index}`}
              pointerEvents="none"
              style={[
                styles.centeredLayer,
                {
                  transform: [
                    { translateX: (sticker.posX - 0.5) * containerWidth },
                    { translateY: (sticker.posY - 0.5) * containerHeight },
                    { scale: sticker.scale },
                    { rotate: `${sticker.rotation}deg` },
                  ],
                },
              ]}
            >
              {sticker.emoji ? (
                <UniImage
                  source={{ uri: `https://static.natsuneko.com/images/reactions/${sticker.emoji}.png` }}
                  contentFit="contain"
                  style={{ width: size, height: size }}
                />
              ) : (
                <Text style={{ fontSize: size }}>{sticker.emoji}</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  centeredLayer: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
});
