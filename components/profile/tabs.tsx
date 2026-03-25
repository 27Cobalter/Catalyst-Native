import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef } from "react";
import { Animated, Pressable, Text, View, useWindowDimensions } from "react-native";

type Props = {
  activeIndex: number;
  tabs: { route: string; label: string }[];
  onClickTab: (index: number) => void;
};

export const ProfileTabs = ({ activeIndex, tabs, onClickTab }: Props) => {
  const { width: screenWidth } = useWindowDimensions();
  const indicator = useRef(new Animated.Value(0));
  const tabWidth = screenWidth / tabs.length;

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
        className="bg-light-accent dark:bg-dark-accent h-1 rounded-none absolute bottom-0"
        style={{ transform: [{ translateX: indicator.current }], width: tabWidth }}
      />
    </View>
  );
};
