import { getCdnUrl } from "@/lib/media";
import type { Media } from "@/models/sdk-types";
import { Image } from "expo-image";
import { useCallback, useEffect, useRef } from "react";
import { FlatList, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { withUniwind } from "uniwind";

const UniImage = withUniwind(Image);

type Props = {
  medias: Media[];
  index: number;
  onIndexChange: (index: number) => void;
};

// メタデータ編集の写真表示。選択中の写真はサムネイル列と共有するので、index は外から制御する。
// Phase 3 ではこの上にピン編集を重ねるため、保存や全画面表示を持つ MediaCarousel は使わない
export const PhotoPager = ({ medias, index, onIndexChange }: Props) => {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Media>>(null);
  const visibleIndexRef = useRef(index);

  useEffect(() => {
    if (visibleIndexRef.current === index) return;

    visibleIndexRef.current = index;
    listRef.current?.scrollToIndex({ index, animated: true });
  }, [index]);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / width);
      if (next === visibleIndexRef.current) return;

      visibleIndexRef.current = next;
      onIndexChange(next);
    },
    [onIndexChange, width],
  );

  return (
    <FlatList
      ref={listRef}
      data={medias}
      keyExtractor={(media) => media.id}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      initialScrollIndex={index}
      getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
      onMomentumScrollEnd={handleMomentumScrollEnd}
      renderItem={({ item: media }) => (
        <View className="bg-light-skeleton dark:bg-dark-skeleton" style={{ width, height: width }}>
          <UniImage
            source={{
              uri: getCdnUrl({
                src: media.url,
                variant: "post-details",
                width,
                aspect: { w: media.metadata?.width ?? 1, h: media.metadata?.height ?? 1 },
              }),
            }}
            className="size-full"
            contentFit="contain"
          />
        </View>
      )}
    />
  );
};
