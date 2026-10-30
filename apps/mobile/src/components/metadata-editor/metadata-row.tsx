import { CatalystListItem, CatalystText } from "@/components/design-system";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { withUniwind } from "uniwind";

const UniChevronRight = withUniwind(ChevronRight);

type Props = {
  label: string;
  value: ReactNode;
  disabled?: boolean;
  onPress: () => void;
};

// 編集画面の「この写真の設定」の 1 行。値はテキストに限らず (アイコンを並べるなど) 呼び出し側で組む
export const MetadataRow = ({ label, value, disabled = false, onPress }: Props) => {
  return (
    <CatalystListItem
      divided={false}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={cn("min-h-14 bg-light-background px-5 dark:bg-dark-surface", disabled && "opacity-50")}
    >
      <CatalystText variant="subtitle" className="text-[15px] font-semibold">
        {label}
      </CatalystText>
      <View className="min-w-0 flex-1 flex-row items-center justify-end gap-2">
        {typeof value === "string" ? (
          <CatalystText tone="muted" numberOfLines={1} className="shrink text-right">
            {value}
          </CatalystText>
        ) : (
          value
        )}
      </View>
      <UniChevronRight size={16} className="text-light-text-subtle dark:text-dark-text-subtle" />
    </CatalystListItem>
  );
};
