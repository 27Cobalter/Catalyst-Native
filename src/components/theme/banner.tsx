import { CatalystText } from "@/components/design-system";
import type { CatalystWeeklyTheme } from "@/models/sdk-types";
import { useRouter } from "expo-router";
import { CalendarDays, ChevronRight } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { withUniwind } from "uniwind";

const UniCalendarDays = withUniwind(CalendarDays);
const UniChevronRight = withUniwind(ChevronRight);

type Props = {
  theme: Pick<CatalystWeeklyTheme, "slug" | "title" | "weekKey" | "sponsor">;
};

export const WeeklyThemeBanner = ({ theme }: Props) => {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      className="flex-row items-center gap-3 rounded-xl border border-light-toggle-border bg-light-toggle px-3.5 py-3 active:opacity-80 dark:border-dark-toggle-border dark:bg-dark-toggle"
      onPress={() => router.push(`/theme/${theme.slug}` as never)}
    >
      <UniCalendarDays size={20} className="text-light-toggle-icon dark:text-dark-toggle-icon" />
      <View className="min-w-0 flex-1 gap-0.5">
        <CatalystText variant="caption" className="font-semibold text-light-toggle-foreground dark:text-dark-toggle-foreground">
          {theme.sponsor ? `${theme.sponsor.disclosure} お題に参加中` : "今週のお題に参加中"}
        </CatalystText>
        <CatalystText variant="label" numberOfLines={1} className="text-light-toggle-foreground dark:text-dark-toggle-foreground">
          {theme.title}
        </CatalystText>
      </View>
      <UniChevronRight size={18} className="text-light-toggle-icon dark:text-dark-toggle-icon" />
    </Pressable>
  );
};
