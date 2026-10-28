import { CatalystDivider, CatalystText } from "@/components/design-system";
import { cn } from "@/lib/utils";
import { Pressable, View } from "react-native";

type Action = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

type Props = {
  title: string;
  left: Action;
  right?: Action;
};

// 選択モーダルのヘッダー。iOS の pageSheet に合わせて、左に戻る系、右に確定系の操作を置く
export const PickerHeader = ({ title, left, right }: Props) => {
  return (
    <>
      <View className="min-h-14 flex-row items-center justify-between gap-3 px-4">
        <Pressable onPress={left.onPress} disabled={left.disabled} hitSlop={8} className="min-w-20 py-2">
          <CatalystText variant="subtitle" tone="tint" className="font-normal">
            {left.label}
          </CatalystText>
        </Pressable>
        <CatalystText variant="subtitle" numberOfLines={1} className="shrink text-center">
          {title}
        </CatalystText>
        <View className="min-w-20 items-end">
          {right && (
            <Pressable onPress={right.onPress} disabled={right.disabled} hitSlop={8} className="py-2">
              <CatalystText
                variant="subtitle"
                tone={right.disabled ? "subtle" : "tint"}
                className={cn(right.disabled && "opacity-60")}
              >
                {right.label}
              </CatalystText>
            </Pressable>
          )}
        </View>
      </View>
      <CatalystDivider />
    </>
  );
};
