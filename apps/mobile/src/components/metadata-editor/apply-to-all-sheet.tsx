import { CatalystActionSheetItem, CatalystDivider, CatalystText } from "@/components/design-system";
import type { ApplyToAllField } from "@/models/epiclese-metadata-editor";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import React, { useCallback, useImperativeHandle, useRef } from "react";
import { View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ApplyToAllOption = {
  field: ApplyToAllField;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
};

export type ApplyToAllSheetRef = {
  open: () => void;
};

type Props = {
  ref: React.Ref<ApplyToAllSheetRef>;
  options: ApplyToAllOption[];
  onSelect: (field: ApplyToAllField) => void;
};

// 表示中の写真の設定をすべての写真にコピーするときに、コピーする項目を選ぶシート。
// 後続フェーズはここに選択肢を足していく
export const ApplyToAllSheet = ({ ref, options, onSelect }: Props) => {
  const theme = useColorScheme() ?? "light";
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();

  useImperativeHandle(ref, () => ({
    open: () => {
      bottomSheetRef.current?.present();
    },
  }));

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    [],
  );

  const handleSelect = useCallback(
    (field: ApplyToAllField) => {
      bottomSheetRef.current?.dismiss();
      onSelect(field);
    },
    [onSelect],
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme === "dark" ? "#1C1C1E" : "#FFFFFF" }}
      handleIndicatorStyle={{ backgroundColor: theme === "dark" ? "#48484A" : "#C7C7CC" }}
    >
      <BottomSheetView style={{ paddingBottom: insets.bottom * 2 }}>
        <CatalystText variant="subtitle" className="py-3 text-center">
          すべての写真に適用する項目
        </CatalystText>
        <CatalystDivider />
        {options.map((option, i) => (
          <View key={option.field}>
            {i > 0 && <CatalystDivider className="ml-14 w-auto" />}
            <CatalystActionSheetItem
              icon={option.icon}
              title={option.label}
              onPress={() => handleSelect(option.field)}
            />
          </View>
        ))}
      </BottomSheetView>
    </BottomSheetModal>
  );
};
