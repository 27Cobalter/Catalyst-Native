import { cn } from "@/lib/utils";
import React, { useRef, useState } from "react";
import { Animated, Dimensions, FlatList, ListRenderItem, Pressable, Text, View } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export type Tab = {
  key: string;
  label: string;
};

type Props = {
  tabs: Tab[];
  renderScene: (tab: Tab) => React.ReactNode;
  defaultIndex?: number;
};

export function Tabs({ tabs, renderScene, defaultIndex = 0 }: Props) {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  const scrollX = useRef(new Animated.Value(defaultIndex * SCREEN_WIDTH)).current;
  const flatListRef = useRef<FlatList<Tab>>(null);

  const TAB_WIDTH = SCREEN_WIDTH / tabs.length;
  const INDICATOR_WIDTH = TAB_WIDTH;

  const indicatorTranslateX = scrollX.interpolate({
    inputRange: tabs.map((_, i) => i * SCREEN_WIDTH),
    outputRange: tabs.map((_, i) => i * TAB_WIDTH + (TAB_WIDTH - INDICATOR_WIDTH) / 2),
    extrapolate: "clamp",
  });

  const handleTabPress = (index: number) => {
    setActiveIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
    Animated.timing(scrollX, {
      toValue: index * SCREEN_WIDTH,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const renderItem: ListRenderItem<Tab> = ({ item }) => (
    <View style={{ width: SCREEN_WIDTH, flex: 1 }}>{renderScene(item)}</View>
  );

  return (
    <View className="flex-1">
      {/* タブバー */}
      <View className="flex-row border-b border-light-border dark:border-dark-border">
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          return (
            <Pressable key={tab.key} className="flex-1 items-center py-4" onPress={() => handleTabPress(index)}>
              <Text
                className={cn(
                  isActive ? "font-bold text-light-text dark:text-dark-text" : "text-light-icon dark:text-dark-icon",
                )}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}

        {/* アクティブインジケーター */}
        <Animated.View
          className="bg-light-accent dark:bg-dark-accent h-1 rounded-none absolute bottom-0"
          style={[
            {
              width: INDICATOR_WIDTH,
              transform: [{ translateX: indicatorTranslateX }],
            },
          ]}
        />
      </View>

      {/* スワイプ可能なコンテンツ */}
      <FlatList
        ref={flatListRef}
        data={tabs}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
        initialScrollIndex={defaultIndex}
        scrollEventThrottle={16}
        className="flex-1"
      />
    </View>
  );
}
