import { CatalystTrend } from "@/models/sdk-types";
import { trendsAtom } from "@/models/trends";
import { cn } from "cn";
import { useAtomValue } from "jotai";
import { ArrowDown, ArrowRight, ArrowUp, LucideIcon, Sparkles } from "lucide-react-native";
import { Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { RailCard, RailRow } from "./ui/rail";

type NotString<T> = Exclude<T, string>;
type Assertion = <T extends CatalystTrend>(val: T[]) => asserts val is NotString<T>[];

const assert: Assertion = <T extends CatalystTrend>(val: T[]): asserts val is NotString<T>[] => {
  if (!val.every(item => typeof item !== "string")) {
    throw new Error("Array contains a string");
  }
};

export const Trends = () => {
  const trends = useAtomValue(trendsAtom);
  assert(trends);

  const label = (movement: (typeof trends)[number]["movement"]): { label: string; arrow: LucideIcon; } => {
    switch (movement) {
      case "up":
        return { label: "上昇", arrow: ArrowUp };

      case "down":
        return { label: "下降", arrow: ArrowDown };

      case "new":
        return { label: "新着", arrow: Sparkles };

      default:
        return { label: "維持", arrow: ArrowRight };
    }
  };

  if (trends.length === 0) {
    return null;
  }

  return <RailCard title="トレンド">
    <RailRow label="トレンド">
      <View className="gap-1.5 px-4 py-2.5">
        {trends.map((trend, i) => {
          const movement = label(trend.movement);
          const Arrow = withUniwind(movement.arrow);

          return (
            <View key={trend.tag} className="flex flex-col gap-1">
              <View className="flex flex-row justify-between">
                <Text className="text-sm text-light-text-muted dark:text-dark-text-muted">#{i + 1} Trending</Text>
                <View className={cn(
                  "rounded border px-1 py-0.5",
                  trend.movement === "up" && "border-light-success bg-light-success-background text-light-success-foreground dark:border-dark-success dark:bg-dark-success-background dark:text-dark-success-foreground",
                  trend.movement === "down" && "border-light-error bg-light-error-background text-light-error-foreground dark:border-dark-error dark:bg-dark-error-background dark:text-dark-error-foreground",
                  trend.movement === "new" && "border-light-warning bg-light-warning-background text-light-warning-foreground dark:border-dark-warning dark:bg-dark-warning-background dark:text-dark-warning-foreground",
                  trend.movement === "same" && "border-light-border dark:border-dark-border",
                )}>
                  <View className={cn("flex flex-row items-center gap-1")}>
                    <Arrow size={16} className="text-light-text-muted dark:text-dark-text-muted" />
                    <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">{movement.label}</Text>
                  </View>
                </View>
              </View>
              <Text className="mt-2 text-lg text-light-text dark:text-dark-text">{trend.tag}</Text>
              <Text className="text-sm text-light-text-muted dark:text-dark-text-muted">前回 #{trend.previousRank ?? "-"}</Text>
            </View>
          )
        })}
      </View>
    </RailRow>
  </RailCard>
};

