import { CatalystButton, CatalystButtonText, CatalystDivider, CatalystText } from "@/components/design-system";
import { toRecordRows, type DenormalizedRecords } from "@/lib/photo-metadata-records";
import { clientAtom } from "@/models/atoms/credential";
import { useAtomValue } from "jotai";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";

type Props = {
  mediaId: string;
  records: DenormalizedRecords;
  hidesAutoMetadata: boolean;
  onApplied: () => void;
  onCancel: () => void;
};

// 元画像から読み取った内容を見せ、確かめてから付与する。付与は編集画面の「保存」とは別の API で、すぐに反映される
export const ImportConfirmContent = ({ mediaId, records, hidesAutoMetadata, onApplied, onCancel }: Props) => {
  const client = useAtomValue(clientAtom);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // state の反映を待たずに二度押しされても 1 回しか送らないよう、送信中かどうかは ref でも持つ
  const submittingRef = useRef(false);

  const handleApply = useCallback(async () => {
    if (submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await client.epiclese.v1.media.mediaId.denormalizedMetadata.create({
        path: { mediaId },
        body: { records },
        throwOnError: true,
      });
      onApplied();
    } catch (error) {
      console.error("Failed to import denormalized metadata:", error);
      Alert.alert("エラー", "メタデータの取得に失敗しました。");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [client, mediaId, onApplied, records]);

  return (
    <View className="gap-4 px-5 pb-2">
      <CatalystText variant="subtitle" className="text-center">
        検出されたメタデータ
      </CatalystText>
      <View className="rounded-xl bg-light-surface-muted dark:bg-dark-surface-muted">
        {toRecordRows(records).map((row, i) => (
          <View key={row.key}>
            {i > 0 && <CatalystDivider className="ml-4 w-auto" />}
            <View className="flex-row gap-3 px-4 py-2.5">
              <CatalystText tone="muted" className="w-32">
                {row.label}
              </CatalystText>
              <CatalystText className="min-w-0 flex-1" numberOfLines={2}>
                {row.value}
              </CatalystText>
            </View>
          </View>
        ))}
      </View>
      <View className="gap-1">
        <CatalystText variant="caption" tone="muted" className="leading-4">
          ヘッダーの「保存」とは別に、すぐにこの写真へ付与されます
        </CatalystText>
        {hidesAutoMetadata && (
          <CatalystText variant="caption" tone="danger" className="leading-4">
            表示しない設定が ON のため、付与しても投稿には表示されません
          </CatalystText>
        )}
      </View>
      <View className="gap-2">
        <CatalystButton onPress={handleApply} disabled={isSubmitting}>
          {isSubmitting && <ActivityIndicator className="mr-2" colorClassName="accent-white" />}
          <CatalystButtonText>この写真に付与</CatalystButtonText>
        </CatalystButton>
        <CatalystButton tone="ghost" onPress={onCancel} disabled={isSubmitting}>
          <CatalystButtonText>キャンセル</CatalystButtonText>
        </CatalystButton>
      </View>
    </View>
  );
};
