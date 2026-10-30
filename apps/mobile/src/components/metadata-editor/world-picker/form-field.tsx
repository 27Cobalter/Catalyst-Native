import { CatalystText } from "@/components/design-system";
import type { ReactNode } from "react";
import { View } from "react-native";

type Props = {
  label: string;
  description?: string;
  children: ReactNode;
};

// 登録フォームの 1 項目。見出しと説明の付け方を揃える
export const FormField = ({ label, description, children }: Props) => {
  return (
    <View className="gap-2">
      <View className="gap-1">
        <CatalystText variant="label">{label}</CatalystText>
        {description && (
          <CatalystText variant="caption" tone="muted" className="leading-4">
            {description}
          </CatalystText>
        )}
      </View>
      {children}
    </View>
  );
};
