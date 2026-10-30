import { CatalystDivider, CatalystListItem, CatalystText } from "@/components/design-system";
import type { EpiclesePlatformResponse } from "@natsuneko-laboratory/catalyst-sdk";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Check } from "lucide-react-native";
import React, { useCallback, useImperativeHandle, useRef } from "react";
import { View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const UniCheck = withUniwind(Check);

export type PlatformSheetRef = {
  open: () => void;
};

type Props = {
  ref: React.Ref<PlatformSheetRef>;
  platforms: EpiclesePlatformResponse[];
  value: string | undefined;
  onSelect: (platformId: string | undefined) => void;
};

export const PlatformSheet = ({ ref, platforms, value, onSelect }: Props) => {
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
    (platformId: string | undefined) => {
      bottomSheetRef.current?.dismiss();
      onSelect(platformId);
    },
    [onSelect],
  );

  const options = [
    { id: undefined, label: "選択しない" },
    ...platforms.map((platform) => ({ id: platform.id, label: platform.name })),
  ];

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme === "dark" ? "#1C1C1E" : "#FFFFFF" }}
      handleIndicatorStyle={{ backgroundColor: theme === "dark" ? "#48484A" : "#C7C7CC" }}
    >
      <BottomSheetScrollView contentContainerStyle={{ paddingBottom: insets.bottom * 2 }}>
        <CatalystText variant="subtitle" className="py-3 text-center">
          プラットフォーム
        </CatalystText>
        <CatalystDivider />
        {options.map((option, i) => (
          <View key={option.id ?? "none"}>
            {i > 0 && <CatalystDivider className="ml-5 w-auto" />}
            <CatalystListItem
              divided={false}
              accessibilityRole="button"
              accessibilityState={{ selected: option.id === value }}
              onPress={() => handleSelect(option.id)}
              className="min-h-13 px-5"
            >
              <CatalystText className="flex-1 text-base">{option.label}</CatalystText>
              {option.id === value && <UniCheck size={20} className="text-light-tint dark:text-dark-tint" />}
            </CatalystListItem>
          </View>
        ))}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
};
