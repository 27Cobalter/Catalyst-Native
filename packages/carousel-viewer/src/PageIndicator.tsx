import { View } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { styles } from "./styles";

function PageDot({ page, index, progress }: { page: number; index: number; progress?: SharedValue<number> }) {
  const animated = useAnimatedStyle(() => ({
    opacity: 0.4 + 0.6 * Math.max(0, 1 - Math.abs((progress?.value ?? index) - page)),
  }));
  return <Animated.View style={[styles.dot, animated]} />;
}

export function PageIndicator({
  count,
  index,
  bottom = 12,
  placement = "overlay",
  progress,
}: {
  count: number;
  index: number;
  bottom?: number;
  placement?: "overlay" | "below";
  progress?: SharedValue<number>;
}) {
  if (count < 2) return null;

  return (
    <View
      style={[styles.indicator, placement === "below" ? styles.indicatorBelow : { bottom }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: count }, (_, i) => (
        <PageDot key={i} page={i} index={index} progress={progress} />
      ))}
    </View>
  );
}
