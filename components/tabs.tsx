import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, FlatList, ListRenderItem, Pressable, StyleSheet, Text, View } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const INDICATOR_WIDTH_RATIO = 0.3;

export type Tab = {
  key: string;
  label: string;
};

type TabBarProps = {
  tabs: Tab[];
  activeIndex: number;
  onTabPress: (index: number) => void;
};

export function TabBar({ tabs, activeIndex, onTabPress }: TabBarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "unspecified" ? "light" : colorScheme];

  const TAB_WIDTH = SCREEN_WIDTH / tabs.length;
  const INDICATOR_WIDTH = TAB_WIDTH * INDICATOR_WIDTH_RATIO;

  const indicatorAnim = useRef(new Animated.Value(activeIndex * TAB_WIDTH + (TAB_WIDTH - INDICATOR_WIDTH) / 2)).current;

  useEffect(() => {
    Animated.timing(indicatorAnim, {
      toValue: activeIndex * TAB_WIDTH + (TAB_WIDTH - INDICATOR_WIDTH) / 2,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [activeIndex, TAB_WIDTH, INDICATOR_WIDTH, indicatorAnim]);

  return (
    <View style={[styles.tabBar, { borderBottomColor: colors.icon + "33" }]}>
      {tabs.map((tab, index) => {
        const isActive = index === activeIndex;
        return (
          <Pressable key={tab.key} style={styles.tab} onPress={() => onTabPress(index)}>
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isActive ? colors.text : colors.icon,
                  fontWeight: isActive ? "700" : "400",
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}

      <Animated.View
        style={[
          styles.indicator,
          {
            width: INDICATOR_WIDTH,
            backgroundColor: colors.tint,
            transform: [{ translateX: indicatorAnim }],
          },
        ]}
      />
    </View>
  );
}

type Props = {
  tabs: Tab[];
  renderScene: (tab: Tab) => React.ReactNode;
  defaultIndex?: number;
};

export function Tabs({ tabs, renderScene, defaultIndex = 0 }: Props) {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  const scrollX = useRef(new Animated.Value(defaultIndex * SCREEN_WIDTH)).current;
  const flatListRef = useRef<FlatList<Tab>>(null);

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
    <View style={styles.container}>
      <TabBar tabs={tabs} activeIndex={activeIndex} onTabPress={handleTabPress} />

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
        style={styles.flatList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
  },
  tabLabel: {
    fontSize: 15,
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    height: 2,
    borderRadius: 1,
  },
  flatList: {
    flex: 1,
  },
});
