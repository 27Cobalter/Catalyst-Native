import { getCdnUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import type { Media } from "@/models/sdk-types";
import { Image } from "expo-image";
import { CheckCircle2 } from "lucide-react-native";
import { Pressable, ScrollView, View } from "react-native";
import { withUniwind } from "uniwind";

const UniImage = withUniwind(Image);
const UniCheckCircle2 = withUniwind(CheckCircle2);

type Props = {
  medias: Media[];
  index: number;
  // 写真ごとにメタデータが設定済みか。true の写真に ✓ を出す
  configured: boolean[];
  onSelect: (index: number) => void;
};

export const ThumbnailStrip = ({ medias, index, configured, onSelect }: Props) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4 py-3">
      {medias.map((media, i) => (
        <Pressable
          key={media.id}
          onPress={() => onSelect(i)}
          accessibilityRole="button"
          accessibilityLabel={`${i + 1} 枚目の写真`}
          accessibilityState={{ selected: i === index }}
          className={cn(
            "size-16 overflow-hidden rounded-lg border-2",
            i === index ? "border-light-tint dark:border-dark-tint" : "border-transparent",
          )}
        >
          <UniImage
            source={{ uri: getCdnUrl({ src: media.url, variant: "upload-thumbnail", width: 128 }) }}
            className="size-full bg-light-skeleton dark:bg-dark-skeleton"
            contentFit="cover"
          />
          {configured[i] && (
            <View className="absolute top-1 right-1 rounded-full bg-light-background dark:bg-dark-background">
              <UniCheckCircle2 size={16} className="text-light-tint dark:text-dark-tint" />
            </View>
          )}
        </Pressable>
      ))}
    </ScrollView>
  );
};
