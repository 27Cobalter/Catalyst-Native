import { CatalystDivider, CatalystListItem, CatalystListItemContent, CatalystText } from "@/components/design-system";
import { EPICLESE_ITEM_TYPE_LABELS, type EpicleseItemType } from "@/models/epiclese";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Check } from "lucide-react-native";
import React, { useCallback, useImperativeHandle, useRef } from "react";
import { View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const UniCheck = withUniwind(Check);

// null は「すべて」(種類で絞り込まない)
const OPTIONS: { type: EpicleseItemType | null; label: string }[] = [
  { type: null, label: "すべて" },
  ...(Object.keys(EPICLESE_ITEM_TYPE_LABELS) as EpicleseItemType[]).map((type) => ({
    type,
    label: EPICLESE_ITEM_TYPE_LABELS[type],
  })),
];

export const getItemTypeLabel = (type: EpicleseItemType | null) => (type ? EPICLESE_ITEM_TYPE_LABELS[type] : "すべて");

export type ItemTypeSheetRef = {
  open: () => void;
};

type Props = {
  ref: React.Ref<ItemTypeSheetRef>;
  selected: EpicleseItemType | null;
  onSelect: (type: EpicleseItemType | null) => void;
};

export const ItemTypeSheet = ({ ref, selected, onSelect }: Props) => {
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
    (type: EpicleseItemType | null) => {
      bottomSheetRef.current?.dismiss();
      onSelect(type);
    },
    [onSelect],
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
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
      <BottomSheetView style={{ paddingBottom: insets.bottom * 2 }}>
        <CatalystText variant="subtitle" className="py-3 text-center">
          種類で絞り込む
        </CatalystText>
        <CatalystDivider />
        <View className="bg-light-background dark:bg-dark-surface">
          {OPTIONS.map((option, i) => (
            <View key={option.label}>
              <CatalystListItem
                divided={false}
                accessibilityState={{ selected: option.type === selected }}
                onPress={() => handleSelect(option.type)}
                className="min-h-14 px-5 py-3.5"
              >
                <CatalystListItemContent>
                  <CatalystText variant="subtitle" className="text-[15px] font-semibold">
                    {option.label}
                  </CatalystText>
                </CatalystListItemContent>
                {option.type === selected ? (
                  <UniCheck size={20} className="text-light-accent dark:text-dark-accent" />
                ) : null}
              </CatalystListItem>
              {i + 1 !== OPTIONS.length && <CatalystDivider className="ml-5 w-auto" />}
            </View>
          ))}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};
