import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef } from "react";
import { Animated, Dimensions, Pressable, Text, View } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Props = {
  activeIndex: number;
  tabs: { route: string; label: string }[];
  onClickTab: (index: number) => void;
};

export const ProfileTabs = ({ activeIndex, tabs, onClickTab }: Props) => {
  const indicator = useRef(new Animated.Value(0));
  const tabWidth = SCREEN_WIDTH / tabs.length;

  const handleTabClick = useCallback(
    (i: number) => {
      onClickTab?.(i);

      Animated.timing(indicator.current, {
        toValue: i * tabWidth,
        duration: 200,
        useNativeDriver: false,
      }).start();
    },
    [onClickTab, tabWidth],
  );

  useEffect(() => {
    indicator.current.setValue(activeIndex * tabWidth);
  }, [activeIndex, tabWidth]);

  return (
    <View className="flex flex-row">
      {tabs.map((tab, i) => {
        return (
          <Pressable
            className="items-center py-3.5"
            key={tab.route}
            style={{ width: tabWidth }}
            onPress={() => handleTabClick(i)}
          >
            <Text
              className={cn(
                "text-light-text dark:text-dark-text",
                i === activeIndex && "font-bold text-light-text dark:text-dark-text",
              )}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
      <Animated.View
        className="absolute rounded-[1px] h-0.5 bottom-0 bg-light-tint dark:bg-dark-tint"
        style={{ transform: [{ translateX: indicator.current }], width: tabWidth }}
      />
    </View>
  );
};
