import { CatalystText } from "@/components/design-system";
import { readDenormalizedRecords, type DenormalizedRecords } from "@/lib/photo-metadata-records";
import { metadataRevisionAtomFamily } from "@/models/atoms/epiclese-metadata";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import * as ImagePicker from "expo-image-picker";
import { useSetAtom } from "jotai";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { MetadataRow } from "../metadata-row";
import { ImportConfirmContent } from "./import-confirm-content";

const DESCRIPTION =
  "レタッチする前の元画像を選ぶと、埋め込まれたワールドや撮影者などの情報をこの端末内だけで読み取り、この写真に付与します。選んだ画像自体は送信・保存されません。";

type Props = {
  statusId: string;
  mediaId: string;
  hidesAutoMetadata: boolean;
};

// レタッチ済みの写真に、レタッチ前の元画像の撮影情報を付与する。解析は端末内で行い、抽出した値だけを送る
export const OriginalPhotoImport = ({ statusId, mediaId, hidesAutoMetadata }: Props) => {
  const theme = useColorScheme() ?? "light";
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const setMetadataRevision = useSetAtom(metadataRevisionAtomFamily(statusId));
  const [isParsing, setIsParsing] = useState(false);
  const [records, setRecords] = useState<DenormalizedRecords | null>(null);

  const handlePick = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      // 埋め込まれたメタデータを保持したまま読み込むために、再エンコードを避ける
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;

    setIsParsing(true);
    try {
      // 解析は JS スレッド上で走るので、先に「解析中」を描けるようイベントループへ譲る
      await new Promise((resolve) => setTimeout(resolve, 0));
      const detected = await readDenormalizedRecords(result.assets[0].uri);

      if (!detected) {
        Alert.alert("エラー", "この画像から VRChat や Resonite などの撮影情報を検出できませんでした。");
        return;
      }

      setRecords(detected);
      sheetRef.current?.present();
    } catch (error) {
      console.error("Failed to read original photo metadata:", error);
      Alert.alert("エラー", "メタデータの取得に失敗しました。");
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleApplied = useCallback(() => {
    sheetRef.current?.dismiss();
    Toast.show({ type: "success", text1: "メタデータを取得し、この写真に付与しました。" });
    // 投稿詳細に表示している撮影情報を取り直させる
    setMetadataRevision((revision) => revision + 1);
  }, [setMetadataRevision]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    [],
  );

  return (
    <>
      <MetadataRow
        label="元の写真から読み込む"
        disabled={isParsing}
        value={
          isParsing ? (
            <>
              <ActivityIndicator size="small" colorClassName="accent-light-tint dark:accent-dark-tint" />
              <CatalystText tone="muted">画像を解析しています...</CatalystText>
            </>
          ) : (
            ""
          )
        }
        onPress={handlePick}
      />
      <CatalystText variant="caption" tone="subtle" className="px-5 pt-2 pb-4 leading-4">
        {DESCRIPTION}
      </CatalystText>

      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme === "dark" ? "#1C1C1E" : "#FFFFFF" }}
        handleIndicatorStyle={{ backgroundColor: theme === "dark" ? "#48484A" : "#C7C7CC" }}
      >
        <BottomSheetView style={{ paddingBottom: insets.bottom * 2 }}>
          <View className="pt-1">
            {records && (
              <ImportConfirmContent
                mediaId={mediaId}
                records={records}
                hidesAutoMetadata={hidesAutoMetadata}
                onApplied={handleApplied}
                onCancel={() => sheetRef.current?.dismiss()}
              />
            )}
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
};
