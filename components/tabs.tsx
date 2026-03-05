import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { useRef, useState } from "react";
import { Animated, Dimensions, FlatList, ListRenderItem, Pressable, StyleSheet, Text, View } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const INDICATOR_WIDTH_RATIO = 0.3;

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
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "unspecified" ? "light" : colorScheme];
  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  const scrollX = useRef(new Animated.Value(defaultIndex * SCREEN_WIDTH)).current;
  const flatListRef = useRef<FlatList<Tab>>(null);

  const TAB_WIDTH = SCREEN_WIDTH / tabs.length;
  const INDICATOR_WIDTH = TAB_WIDTH * INDICATOR_WIDTH_RATIO;

  const indicatorTranslateX = scrollX.interpolate({
    inputRange: tabs.map((_, i) => i * SCREEN_WIDTH),
    outputRange: tabs.map((_, i) => i * TAB_WIDTH + (TAB_WIDTH - INDICATOR_WIDTH) / 2),
    extrapolate: "clamp",
  });

  const handleTabPress = (index: number) => {
    setActiveIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const renderItem: ListRenderItem<Tab> = ({ item }) => (
    <View style={{ width: SCREEN_WIDTH, flex: 1 }}>{renderScene(item)}</View>
  );

  return (
    <View style={styles.container}>
      {/* タブバー */}
      <View style={[styles.tabBar, { borderBottomColor: colors.icon + "33" }]}>
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          return (
            <Pressable key={tab.key} style={styles.tab} onPress={() => handleTabPress(index)}>
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

        {/* アクティブインジケーター */}
        <Animated.View
          style={[
            styles.indicator,
            {
              width: INDICATOR_WIDTH,
              backgroundColor: colors.tint,
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
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
        initialScrollIndex={defaultIndex}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setActiveIndex(index);
        }}
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
