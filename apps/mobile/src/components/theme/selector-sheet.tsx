import {
  CatalystDivider,
  CatalystEmptyState,
  CatalystListItem,
  CatalystListItemContent,
  CatalystText,
} from "@/components/design-system";
import { useAsyncEffect } from "@/hooks/use-async-effect";
import { clientAtom } from "@/models/atoms/credential";
import type { CatalystWeeklyTheme } from "@/models/sdk-types";
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useAtomValue } from "jotai";
import { CalendarDays } from "lucide-react-native";
import React, { useCallback, useImperativeHandle, useRef, useState } from "react";
import { View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const UniCalendarDays = withUniwind(CalendarDays);

export type WeeklyThemeSelectorSheetRef = {
  open: () => void;
  close: () => void;
};

type Props = {
  ref: React.Ref<WeeklyThemeSelectorSheetRef>;
  onSelect: (theme: CatalystWeeklyTheme) => void;
};

export const WeeklyThemeSelectorSheet = ({ onSelect, ref }: Props) => {
  const colorScheme = useColorScheme() ?? "light";
  const client = useAtomValue(clientAtom);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const [themes, setThemes] = useState<CatalystWeeklyTheme[]>([]);
  const [loading, setLoading] = useState(true);

  const loadThemes = useCallback(async () => {
    const weeklyThemes = client?.catalyst.v1.weeklyThemes;
    if (!weeklyThemes) {
      setThemes([]);
      return;
    }

    const { data } = await weeklyThemes.get({
      query: { state: "open", take: 20 },
      throwOnError: true,
    });
    setThemes(data.themes);
  }, [client]);

  useAsyncEffect(async () => {
    setLoading(true);
    try {
      await loadThemes();
    } finally {
      setLoading(false);
    }
  }, [loadThemes]);

  useImperativeHandle(ref, () => ({
    open: () => {
      void loadThemes();
      bottomSheetRef.current?.present();
    },
    close: () => {
      bottomSheetRef.current?.dismiss();
    },
  }), [loadThemes]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    [],
  );

  const handleSelect = useCallback((theme: CatalystWeeklyTheme) => {
    bottomSheetRef.current?.dismiss();
    onSelect(theme);
  }, [onSelect]);

  const renderItem = useCallback(({ item }: { item: CatalystWeeklyTheme }) => (
    <CatalystListItem
      divided={false}
      onPress={() => handleSelect(item)}
      className="min-h-18 bg-light-background px-5 py-3 dark:bg-dark-surface"
    >
      <View className="mr-3 size-11 items-center justify-center rounded-xl bg-light-surface-muted dark:bg-dark-surface-muted">
        <UniCalendarDays size={20} className="text-light-icon dark:text-dark-icon" />
      </View>
      <CatalystListItemContent>
        <CatalystText variant="subtitle" className="text-[15px] font-semibold" numberOfLines={1}>
          {item.title}
        </CatalystText>
        <CatalystText variant="caption" tone="muted" numberOfLines={1}>
          投稿すると {item.points} ポイント獲得できます
        </CatalystText>
      </CatalystListItemContent>
    </CatalystListItem>
  ), [handleSelect]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={["45%"]}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colorScheme === "dark" ? "#1C1C1E" : "#FFFFFF" }}
      handleIndicatorStyle={{ backgroundColor: colorScheme === "dark" ? "#48484A" : "#C7C7CC" }}
    >
      <BottomSheetFlatList
        data={themes}
        keyExtractor={(item) => item.slug}
        renderItem={renderItem}
        ListHeaderComponent={
          <>
            <CatalystText variant="subtitle" className="py-3 text-center">お題を選択</CatalystText>
            <CatalystDivider />
          </>
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        ListEmptyComponent={
          loading ? null : <CatalystEmptyState icon={<UniCalendarDays />} title="開催中のお題はありません" className="min-h-56" />
        }
        ItemSeparatorComponent={() => <CatalystDivider className="ml-5 w-auto" />}
      />
    </BottomSheetModal>
  );
};
