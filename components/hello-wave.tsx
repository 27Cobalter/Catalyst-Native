import { cn } from "@/lib/utils";
import Animated from "react-native-reanimated";

export function HelloWave() {
  return (
    <Animated.Text
      className={cn("text-[28px] leading-8 -mt-[6px]")}
      style={{
        animationName: {
          "50%": { transform: [{ rotate: "25deg" }] },
        },
        animationIterationCount: 4,
        animationDuration: "300ms",
      }}
    >
      👋
    </Animated.Text>
  );
}
