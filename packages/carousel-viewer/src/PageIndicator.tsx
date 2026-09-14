import { View } from "react-native";
import { styles } from "./styles";

export function PageIndicator({ count, index, bottom = 12 }: { count: number; index: number; bottom?: number }) {
  if (count < 2) return null;

  return (
    <View
      style={[styles.indicator, { bottom }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.dot, i === index && styles.activeDot]} />
      ))}
    </View>
  );
}
