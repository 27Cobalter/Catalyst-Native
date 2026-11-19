import { CatalystDivider, CatalystListItem, CatalystListItemContent, CatalystText } from "@/components/design-system";
import type { EpiclesePlatformResponse } from "@natsuneko-laboratory/catalyst-sdk";
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

export type WorldPlatformSheetRef = {
  open: () => void;
};

type Props = {
  ref: React.Ref<WorldPlatformSheetRef>;
  platforms: EpiclesePlatformResponse[];
  // null は「すべて」(プラットフォームで絞り込まない)
  selected: EpiclesePlatformResponse | null;
  onSelect: (platform: EpiclesePlatformResponse | null) => void;
};

// アイテムの種類で絞り込むシート (items/type-sheet.tsx) と同じ見た目
export const WorldPlatformSheet = ({ ref, platforms, selected, onSelect }: Props) => {
  const theme = useColorScheme() ?? "light";
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const options = [{ platform: null, label: "すべて" }, ...platforms.map((w) => ({ platform: w, label: w.name }))];

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
    (platform: EpiclesePlatformResponse | null) => {
      bottomSheetRef.current?.dismiss();
      onSelect(platform);
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
          プラットフォームで絞り込む
        </CatalystText>
        <CatalystDivider />
        <View className="bg-light-background dark:bg-dark-surface">
          {options.map((option, i) => {
            const isSelected = option.platform?.id === selected?.id;

            return (
              <View key={option.platform?.id ?? "all"}>
                <CatalystListItem
                  divided={false}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => handleSelect(option.platform)}
                  className="min-h-14 px-5 py-3.5"
                >
                  <CatalystListItemContent>
                    <CatalystText variant="subtitle" className="text-[15px] font-semibold">
                      {option.label}
                    </CatalystText>
                  </CatalystListItemContent>
                  {isSelected ? <UniCheck size={20} className="text-light-accent dark:text-dark-accent" /> : null}
                </CatalystListItem>
                {i + 1 !== options.length && <CatalystDivider className="ml-5 w-auto" />}
              </View>
            );
          })}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};
