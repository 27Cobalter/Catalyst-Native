import { CatalystBadge, CatalystBadgeText, CatalystDivider, CatalystText } from "@/components/design-system";
import { abs } from "@/lib/dayjs";
import type { ImageMetadataSummary } from "@/lib/image-metadata";
import { Image } from "expo-image";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { withUniwind } from "uniwind";

const UniImage = withUniwind(Image);

export type ImageMetadataEntry = {
  uri: string;
  status: "analyzing" | "analyzed" | "failed";
  metadata: ImageMetadataSummary | null;
};

type ImageMetadataSectionProps = {
  entries: ImageMetadataEntry[];
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <View className="flex-row border-b border-light-divider py-2 dark:border-dark-divider">
    <CatalystText variant="caption" tone="muted" className="w-32">
      {label}
    </CatalystText>
    <CatalystText variant="caption" className="flex-1">
      {value}
    </CatalystText>
  </View>
);

const EntryBody = ({ entry }: { entry: ImageMetadataEntry }) => {
  if (entry.status === "analyzing") {
    return (
      <View className="flex-row items-center gap-2">
        <ActivityIndicator size="small" />
        <CatalystText variant="caption" tone="muted">
          画像を解析しています...
        </CatalystText>
      </View>
    );
  }

  if (entry.status === "failed") {
    return (
      <CatalystText variant="caption" tone="muted">
        メタデータの取得に失敗しました
      </CatalystText>
    );
  }

  const metadata = entry.metadata;
  if (!metadata) {
    // 判定しているのは VRChat / Resonite の撮影情報だけなので、
    // 「メタデータが無い」と断定はしない (EXIF など他の情報は見ていない)
    return (
      <CatalystText variant="caption" tone="muted">
        対応している撮影情報は見つかりませんでした
      </CatalystText>
    );
  }

  return (
    <View>
      <Row label="撮影プラットフォーム" value={metadata.platform} />
      {/* ID しか埋め込まれていない画像があるので、名前が無いものは行ごと出さない */}
      {metadata.world?.name ? <Row label="撮影ワールド" value={metadata.world.name} /> : null}
      {metadata.author?.name ? <Row label="撮影者" value={metadata.author.name} /> : null}
      {metadata.takenAt ? <Row label="撮影日時" value={abs(metadata.takenAt)} /> : null}
      {metadata.appVersion ? <Row label="アプリバージョン" value={metadata.appVersion} /> : null}
      {metadata.cameraFov ? <Row label="画角 (FOV)" value={metadata.cameraFov} /> : null}
    </View>
  );
};

const describe = (entries: ImageMetadataEntry[]) => {
  if (entries.some((entry) => entry.status === "analyzing")) return "画像を解析しています...";

  const detected = entries.filter((entry) => entry.metadata !== null).length;
  if (detected === 0) {
    return "VRCX や ResoniteScreenshotExtensions などで撮影情報が埋め込まれた画像を選ぶと、ここに内容が表示されます。";
  }

  return `${detected} 枚の画像から撮影情報を検出しました。これはこの端末で読み取った内容で、投稿に表示される内容はサーバー側の解析結果によって異なる場合があります。`;
};

/**
 * 選択中の画像に埋め込まれた撮影メタデータを、投稿前に確認するためのセクション。
 *
 * 表示しているのは端末内で読み取ったプレビューであり、実際に投稿へ表示される内容を決めるのは
 * サーバー側の解析結果。表示するかどうかは「メタデータを非表示」の設定で切り替えられる。
 */
export const ImageMetadataSection = ({ entries }: ImageMetadataSectionProps) => {
  if (entries.length === 0) return null;

  return (
    <View className="mt-6">
      <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
        メタデータ
      </CatalystText>
      <View className="bg-light-background dark:bg-dark-surface">
        {entries.map((entry, index) => (
          <View key={entry.uri}>
            {index > 0 ? <CatalystDivider className="ml-5 w-auto" /> : null}
            <View className="flex-row items-start gap-3 px-5 py-3">
              <UniImage
                source={{ uri: entry.uri }}
                className="h-10 w-10 rounded-lg"
                contentFit="cover"
                recyclingKey={entry.uri}
                accessible={false}
              />
              <View className="flex-1">
                <View className="mb-1 flex-row items-center gap-2">
                  <CatalystText variant="caption" tone="muted">
                    画像 {index + 1}
                  </CatalystText>
                  {entry.metadata ? (
                    <CatalystBadge tone="neutral">
                      <CatalystBadgeText>{entry.metadata.source}</CatalystBadgeText>
                    </CatalystBadge>
                  ) : null}
                </View>
                <EntryBody entry={entry} />
              </View>
            </View>
          </View>
        ))}
      </View>
      <CatalystText variant="caption" tone="subtle" className="px-5 pt-2 leading-4">
        {describe(entries)}
      </CatalystText>
    </View>
  );
};
