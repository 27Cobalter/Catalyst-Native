import { CatalystActionSheetItem, CatalystDivider } from "@/components/design-system";
import { MediaPinOverlay } from "@/components/status/media-pin-overlay";
import { useHaptics } from "@/hooks/use-haptics";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { getCdnUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { timelineImageQualityAtom, timelineWifiUpgradeAtom } from "@/models/atoms/image-quality";
import type { EpicleseReference } from "@/models/epiclese";
import type { Media } from "@/models/sdk-types";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView, type BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import {
  ImageGallery,
  type CarouselIndicatorContext,
  type GalleryImage,
} from "@natsuneko-laboratory/react-native-carousel-viewer";
import NetInfo from "@react-native-community/netinfo";
import { File, Paths } from "expo-file-system";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import {
  Asset as MediaLibraryAsset,
  requestPermissionsAsync as requestMediaLibraryPermissions,
} from "expo-media-library";
import { useAtomValue } from "jotai";
import { Download, EyeOff, ImageDown, Share2 } from "lucide-react-native";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, Pressable, Share, Text, View, useColorScheme, useWindowDimensions } from "react-native";
import { withUniwind } from "uniwind";

const UniImage = withUniwind(Image);
const UniEyeOff = withUniwind(EyeOff);
const UniShare2 = withUniwind(Share2);
const UniDownload = withUniwind(Download);
const UniImageDown = withUniwind(ImageDown);

type Props = {
  medias: Media[];
  onIndexChange?: (index: number) => void;
  /** media.id → 写真上のピン（座標付きメタデータ）。渡された場合のみオーバーレイを表示する */
  pins?: Record<string, EpicleseReference[] | undefined>;
};

const getAspect = (media: Media) => ({
  w: media.metadata?.width ?? 1,
  h: media.metadata?.height ?? 1,
});

export const MediaCarousel = memo(({ medias, onIndexChange, pins }: Props) => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const theme = useColorScheme() ?? "light";
  const mediaIdentity = useMemo(() => medias.map((media) => media.id).join(":"), [medias]);
  const [isBlurRemoved, setIsBlurRemoved] = useState(false);
  const [arePinsVisible, setArePinsVisible] = useState(true);
  const imageActionsSheetRef = useRef<BottomSheet>(null);
  const actionTargetMediaRef = useRef<Media | null>(null);

  const imageQuality = useAtomValue(timelineImageQualityAtom);
  const wifiUpgrade = useAtomValue(timelineWifiUpgradeAtom);
  const haptics = useHaptics();
  const reducedMotion = useReducedMotion();
  const [isWifi, setIsWifi] = useState(false);

  useEffect(() => {
    NetInfo.fetch().then((state) => setIsWifi(state.type === "wifi"));
    return NetInfo.addEventListener((state) => setIsWifi(state.type === "wifi"));
  }, []);

  useEffect(() => {
    // FlashList can recycle timeline cells, so reset overlay state when a different post's media set is mounted.
    // The gallery itself is remounted via `key`.
    setIsBlurRemoved(false);
    setArePinsVisible(true);
  }, [mediaIdentity]);

  const timelineVariant = useMemo(() => {
    if (wifiUpgrade && isWifi) {
      return imageQuality === "low" ? "small" : "medium";
    }
    return imageQuality === "low" ? "timeline" : "small";
  }, [imageQuality, wifiUpgrade, isWifi]);

  const mediaById = useMemo(() => new Map(medias.map((media) => [media.id, media])), [medias]);

  const images = useMemo<GalleryImage[]>(
    () =>
      medias.map((media) => ({
        id: media.id,
        uri: getCdnUrl({
          src: media.url,
          variant: "medium",
          width: SCREEN_WIDTH,
          aspect: getAspect(media),
        }),
        width: media.metadata?.width ?? undefined,
        height: media.metadata?.height ?? undefined,
      })),
    [medias, SCREEN_WIDTH],
  );

  const doShareImage = useCallback(async () => {
    const media = actionTargetMediaRef.current;
    if (!media) return;

    imageActionsSheetRef.current?.close();

    try {
      const url = getCdnUrl({
        src: media.url,
        variant: "medium",
        width: SCREEN_WIDTH,
        aspect: getAspect(media),
      });
      const file = await File.downloadFileAsync(url, Paths.cache, {
        idempotent: true,
      });
      await Share.share(Platform.OS === "ios" ? { url: file.uri } : { message: url });
    } catch (e) {
      Alert.alert("エラー", `画像の共有に失敗しました。\n${e instanceof Error ? e.message : String(e)}`);
    }
  }, [SCREEN_WIDTH]);

  const doSaveImage = useCallback(
    async (quality: "current" | "original") => {
      const media = actionTargetMediaRef.current;
      if (!media) return;

      imageActionsSheetRef.current?.close();

      try {
        const { status } = await requestMediaLibraryPermissions();
        if (status !== "granted") {
          Alert.alert("権限エラー", "写真を保存するには写真ライブラリへのアクセス許可が必要です。");
          return;
        }

        const url =
          quality === "original"
            ? getCdnUrl({ src: media.url, variant: "original", width: 9999 })
            : getCdnUrl({
                src: media.url,
                variant: "medium",
                width: SCREEN_WIDTH,
                aspect: getAspect(media),
              });

        const file = await File.downloadFileAsync(url, Paths.cache, {
          idempotent: true,
        });
        await MediaLibraryAsset.create(file.uri);
        haptics.notification(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        Alert.alert("エラー", `画像の保存に失敗しました。\n${e instanceof Error ? e.message : String(e)}`);
      }
    },
    [SCREEN_WIDTH, haptics],
  );

  const handleImageLongPress = useCallback(
    (index: number) => {
      const media = medias[index];
      if (!media) return;

      haptics.impact(Haptics.ImpactFeedbackStyle.Heavy);
      actionTargetMediaRef.current = media;
      imageActionsSheetRef.current?.snapToIndex(0);
    },
    [haptics, medias],
  );

  const renderImage = useCallback(
    (image: GalleryImage, { mode }: { mode: "carousel" | "detail" }) => {
      const media = mediaById.get(image.id);
      if (!media) return null;

      if (mode === "detail") {
        return (
          <UniImage
            recyclingKey={`${mediaIdentity}:${media.id}:modal`}
            source={{ uri: image.uri }}
            className="size-full"
            contentFit="contain"
          />
        );
      }

      return (
        <View className="size-full bg-light-skeleton dark:bg-dark-skeleton">
          <UniImage
            recyclingKey={`${mediaIdentity}:${media.id}:timeline`}
            source={{
              uri: getCdnUrl({
                src: media.url,
                width: SCREEN_WIDTH,
                variant: timelineVariant,
                aspect: getAspect(media),
              }),
            }}
            className="size-full"
            contentFit="contain"
          />
        </View>
      );
    },
    [mediaById, mediaIdentity, SCREEN_WIDTH, timelineVariant],
  );

  const hasSensitiveContent = medias.some((m) => m.metadata?.isSensitive || m.metadata?.isSpoiler);
  const isSensitive = medias.some((m) => m.metadata?.isSensitive);
  const isSpoiler = medias.some((m) => m.metadata?.isSpoiler);
  const isBlurred = hasSensitiveContent && !isBlurRemoved;

  const renderCarouselOverlay = useCallback(
    ({ index, width, height }: { index: number; width: number; height: number }) => {
      if (isBlurred) {
        return (
          <Pressable
            className="absolute inset-0 bg-light-skeleton dark:bg-dark-skeleton items-center justify-center gap-2"
            onPress={() => setIsBlurRemoved(true)}
          >
            <UniEyeOff size={28} className="text-white" />
            <Text className="text-white font-bold text-[17px]">Tap to view</Text>
            {isSensitive && <Text className="text-white/75 text-[13px]">センシティブコンテンツです</Text>}
            {isSpoiler && <Text className="text-white/75 text-[13px]">ネタバレ注意コンテンツです</Text>}
          </Pressable>
        );
      }

      // Photo pin overlay (座標付きメタデータ) — 現在表示中の media のピンのみ重ねる
      const currentMedia = medias[index];
      const references = currentMedia ? pins?.[currentMedia.id] : undefined;
      if (!currentMedia || !references || references.length === 0) return null;

      return (
        <MediaPinOverlay
          media={currentMedia}
          references={references}
          width={width}
          height={height}
          visible={arePinsVisible}
          onToggleVisible={() => setArePinsVisible((v) => !v)}
        />
      );
    },
    [isBlurred, isSensitive, isSpoiler, medias, pins, arePinsVisible],
  );

  const renderCarouselIndicator = useCallback(
    ({ count, index, setIndex }: CarouselIndicatorContext) =>
      count > 1 ? (
        <View className="h-8 flex-row justify-center items-center">
          {Array.from({ length: count }, (_, i) => (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`画像 ${i + 1} / ${count}`}
              onPress={() => setIndex(i)}
              hitSlop={8}
              className={cn(
                "w-2 h-2 rounded-full p-1 mx-2",
                i === index ? "bg-light-tint dark:bg-dark-tint" : "bg-light-icon dark:bg-dark-icon",
              )}
            />
          ))}
        </View>
      ) : null,
    [],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    [],
  );

  // Image action bottom sheet - rendered inside the detail Modal (no portal) so it appears above it
  const renderDetailForeground = useCallback(
    () => (
      <BottomSheet
        ref={imageActionsSheetRef}
        index={-1}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: theme === "dark" ? "#1C1C1E" : "#FFFFFF",
        }}
        handleIndicatorStyle={{
          backgroundColor: theme === "dark" ? "#48484A" : "#C7C7CC",
        }}
      >
        <BottomSheetView className="pb-8">
          <CatalystActionSheetItem icon={UniShare2} title="画像を共有" onPress={doShareImage} tone="accent" />
          <CatalystDivider className="ml-14 w-auto" />
          <CatalystActionSheetItem icon={UniDownload} title="現在の画質で保存" onPress={() => doSaveImage("current")} />
          <CatalystDivider className="ml-14 w-auto" />
          <CatalystActionSheetItem icon={UniImageDown} title="最大画質で保存" onPress={() => doSaveImage("original")} />
        </BottomSheetView>
      </BottomSheet>
    ),
    [renderBackdrop, theme, doShareImage, doSaveImage],
  );

  if (medias.length === 0) return null;

  const firstMedia = medias[0];
  const maxHeight = SCREEN_HEIGHT / 2;
  const aspectRatio =
    firstMedia.metadata?.width && firstMedia.metadata?.height
      ? firstMedia.metadata.width / firstMedia.metadata.height
      : null;
  const carouselHeight = aspectRatio ? Math.min(SCREEN_WIDTH / aspectRatio, maxHeight) : maxHeight;

  return (
    <ImageGallery
      key={mediaIdentity}
      images={images}
      maxScale={5}
      doubleTapScale={3}
      longPressDuration={600}
      reduceMotion={reducedMotion}
      detailEnabled={!isBlurred}
      style={{ height: carouselHeight, aspectRatio: undefined }}
      onIndexChange={onIndexChange}
      onLongPress={handleImageLongPress}
      renderImage={renderImage}
      renderCarouselOverlay={renderCarouselOverlay}
      renderCarouselIndicator={renderCarouselIndicator}
      renderDetailForeground={renderDetailForeground}
    />
  );
});
MediaCarousel.displayName = "MediaCarousel";
