import { cn } from "@/lib/utils";
import { Images, Tags } from "lucide-react-native";
import { withUniwind } from "uniwind";
import { View } from "react-native";

const UniTags = withUniwind(Tags);
const UniImages = withUniwind(Images);

type Props = {
  hasReference: boolean;
  hasMultiple: boolean;
  // グリッドのセル向け。切り抜いた小さいセルで顔などにかぶりにくいよう、ひと回り小さくする
  compact?: boolean;
};

// 写真の右上に並べる、押せない目印（アイテム情報あり・複数枚）。Web と同じ並び・見た目にしている。
// 押せるボタン（投稿詳細のピン表示の切り替えなど）はここには入れない。
// タップは下の写真に通す
export function MediaBadges({ hasReference, hasMultiple, compact = false }: Props) {
  if (!hasReference && !hasMultiple) return null;

  const badgeClassName = cn("bg-light-surface-muted/75 dark:bg-dark-surface-muted/75", compact ? "p-1" : "p-1.5");
  const iconSize = compact ? 12 : 18;
  const iconColorClassName = "accent-light-text/75 dark:accent-dark-text/75";

  return (
    <View
      pointerEvents="none"
      className={cn("absolute flex-row", compact ? "top-0.5 right-0.5 gap-0.5" : "top-3 right-3 gap-1.5")}
    >
      {hasReference && (
        <View accessible accessibilityLabel="アイテム情報あり" className={badgeClassName}>
          <UniTags size={iconSize} colorClassName={iconColorClassName} />
        </View>
      )}
      {hasMultiple && (
        <View accessible accessibilityLabel="複数枚の画像" className={badgeClassName}>
          <UniImages size={iconSize} colorClassName={iconColorClassName} />
        </View>
      )}
    </View>
  );
}
