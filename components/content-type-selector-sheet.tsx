import { cn } from "@/lib/utils";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { BookImage, ChevronRight, Images, PenLine } from "lucide-react-native";
import React, { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { Pressable, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const UniChevronRight = withUniwind(ChevronRight);
const UniPenLine = withUniwind(PenLine);
const UniImages = withUniwind(Images);
const UniBookImage = withUniwind(BookImage);

type ContentType = {
  key: string;
  title: string;
  description: string;
  icon: (args: { size: number; className?: string }) => React.ReactNode;
};

const CONTENT_TYPES: ContentType[] = [
  {
    key: "post",
    title: "投稿",
    description: "最大10枚の写真を添付できます",
    icon: UniPenLine,
  },
  {
    key: "album",
    title: "アルバム",
    description: "複数の投稿をまとめたアルバムを作成します",
    icon: UniImages,
  },
  {
    key: "smartAlbum",
    title: "スマートアルバム",
    description: "ハッシュタグに基づいて自動更新されるアルバムを作成します",
    icon: UniBookImage,
  },
];

export type ContentTypeSelectorSheetRef = {
  open: () => void;
  close: () => void;
};

type Props = {
  onSelect: (contentType: string) => void;
};

export const ContentTypeSelectorSheet = forwardRef<ContentTypeSelectorSheetRef, Props>(
  function ContentTypeSelectorSheet({ onSelect }, ref) {
    const theme = useColorScheme() ?? "light";
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const insets = useSafeAreaInsets();

    useImperativeHandle(ref, () => ({
      open: () => {
        bottomSheetRef.current?.present();
      },
      close: () => {
        bottomSheetRef.current?.dismiss();
      },
    }));

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
      [],
    );

    const handleSelect = useCallback(
      (key: string) => {
        bottomSheetRef.current?.dismiss();
        onSelect(key);
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
          <Text className="py-3 text-center text-[17px] font-semibold text-light-text dark:text-dark-text">
            作成するコンテンツを選択
          </Text>
          <View className="mb-2 h-px bg-light-divider dark:bg-dark-divider" />
          <View className="bg-light-surface-muted dark:bg-dark-surface-muted rounded-xl mx-2">
            {CONTENT_TYPES.map((contentType, i) => (
              <Pressable
                key={contentType.key}
                onPress={() => handleSelect(contentType.key)}
                className="flex-row items-start px-5 py-2"
              >
                <View className="mr-4 h-11 w-11 items-center justify-center rounded-lg bg-light-accent/10 dark:bg-dark-accent/10">
                  <View className="text-light-accent dark:text-dark-accent">
                    {contentType.icon({ size: 24, className: "text-light-accent dark:text-dark-accent" })}
                  </View>
                </View>
                <View
                  className={cn(
                    "flex-row mr-12 pb-4 items-center",
                    i + 1 !== CONTENT_TYPES.length && "border-b border-light-border dark:border-dark-border",
                  )}
                >
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-light-text dark:text-dark-text">
                      {contentType.title}
                    </Text>
                    <Text className="mt-0.5 text-xs text-light-text-muted dark:text-dark-text-muted">
                      {contentType.description}
                    </Text>
                  </View>
                  <UniChevronRight size={16} className="text-light-text-subtle dark:text-dark-text-subtle" />
                </View>
              </Pressable>
            ))}
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);
