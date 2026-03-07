import { emojis } from "@/lib/emojis";
import { Image } from "expo-image";
import {
  Clock,
  Flag,
  Heart,
  Lightbulb,
  PawPrint,
  Plane,
  Search,
  Smile,
  Star,
  Trophy,
  Utensils,
  X,
} from "lucide-react-native";
import React, { memo, useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import type { EmojiCategory, EmojiItem } from "./types";
import { emojiToCodepoints } from "./unicode";

const GRID_COLUMNS = 8;
const EMOJI_SIZE = 36;

const ICON_MAP: Record<
  string,
  React.ComponentType<{ size: number; color: string }>
> = {
  clock: Clock,
  smile: Smile,
  "paw-print": PawPrint,
  utensils: Utensils,
  trophy: Trophy,
  plane: Plane,
  lightbulb: Lightbulb,
  heart: Heart,
  flag: Flag,
  star: Star,
};

type Props = {
  categories: EmojiCategory[];
  onEmojiSelected: (emoji: EmojiItem) => void;
};

const EmojiItemCell = memo(
  ({
    item,
    onPress,
  }: {
    item: EmojiItem;
    onPress: (item: EmojiItem) => void;
  }) => {
    const handlePress = useCallback(() => onPress(item), [item, onPress]);

    if (item.type.kind === "unicode") {
      const codepoint = emojiToCodepoints(item.type.emoji);
      const source = emojis[codepoint as keyof typeof emojis];
      if (source) {
        return (
          <Pressable onPress={handlePress} style={styles.emojiCell}>
            <Image
              source={source}
              style={styles.emojiImage}
              contentFit="contain"
            />
          </Pressable>
        );
      }
      return (
        <Pressable onPress={handlePress} style={styles.emojiCell}>
          <Text style={styles.emojiText}>{item.type.emoji}</Text>
        </Pressable>
      );
    }

    return (
      <Pressable onPress={handlePress} style={styles.emojiCell}>
        <Image
          source={{ uri: item.type.url }}
          style={styles.emojiImage}
          contentFit="contain"
        />
      </Pressable>
    );
  },
);
EmojiItemCell.displayName = "EmojiItemCell";

function CategoryButton({
  category,
  isSelected,
  disabled,
  onPress,
}: {
  category: EmojiCategory;
  isSelected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useColorScheme() ?? "light";
  const IconComponent = ICON_MAP[category.icon];
  const activeColor = theme === "dark" ? "#0A84FF" : "#007AFF";
  const inactiveColor = theme === "dark" ? "#8E8E93" : "#8E8E93";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.categoryButton, disabled && { opacity: 0.5 }]}
    >
      {IconComponent && (
        <IconComponent
          size={22}
          color={isSelected ? activeColor : inactiveColor}
        />
      )}
      <View
        style={[
          styles.categoryIndicator,
          isSelected && { backgroundColor: activeColor },
        ]}
      />
    </Pressable>
  );
}

export function EmojiPickerView({ categories, onEmojiSelected }: Props) {
  const theme = useColorScheme() ?? "light";
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    categories[0]?.id ?? "",
  );
  const [searchText, setSearchText] = useState("");
  const isSearching = searchText.trim().length > 0;

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const query = searchText.toLowerCase().trim();
    const results: EmojiItem[] = [];
    for (const category of categories) {
      for (const emoji of category.emojis) {
        if (emoji.id.toLowerCase().includes(query)) {
          results.push(emoji);
          continue;
        }
        if (emoji.keywords.some((k) => k.toLowerCase().includes(query))) {
          results.push(emoji);
        }
      }
    }
    return results;
  }, [searchText, categories, isSearching]);

  const handleEmojiPress = useCallback(
    (emoji: EmojiItem) => {
      onEmojiSelected(emoji);
    },
    [onEmojiSelected],
  );

  const renderItem = useCallback(
    ({ item }: { item: EmojiItem }) => (
      <EmojiItemCell item={item} onPress={handleEmojiPress} />
    ),
    [handleEmojiPress],
  );

  const keyExtractor = useCallback(
    (item: EmojiItem, index: number) => `${item.id}-${index}`,
    [],
  );

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const displayEmojis = isSearching
    ? searchResults
    : (selectedCategory?.emojis ?? []);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme === "dark" ? "#1C1C1E" : "#FFFFFF" },
      ]}
    >
      {/* Search bar */}
      <View
        style={[
          styles.searchBar,
          { backgroundColor: theme === "dark" ? "#2C2C2E" : "#F2F2F7" },
        ]}
      >
        <Search size={16} color="#8E8E93" />
        <TextInput
          style={[
            styles.searchInput,
            { color: theme === "dark" ? "#FFFFFF" : "#000000" },
          ]}
          placeholder="絵文字を検索"
          placeholderTextColor="#8E8E93"
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchText.length > 0 && (
          <Pressable onPress={() => setSearchText("")}>
            <X size={16} color="#8E8E93" />
          </Pressable>
        )}
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryBar}
        contentContainerStyle={styles.categoryBarContent}
      >
        {categories.map((category) => (
          <CategoryButton
            key={category.id}
            category={category}
            isSelected={selectedCategoryId === category.id}
            disabled={isSearching}
            onPress={() => setSelectedCategoryId(category.id)}
          />
        ))}
      </ScrollView>

      <View
        style={[
          styles.divider,
          { backgroundColor: theme === "dark" ? "#38383A" : "#E5E5EA" },
        ]}
      />

      {/* Emoji grid */}
      <FlatList
        data={displayEmojis}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={GRID_COLUMNS}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.gridRow}
        getItemLayout={(_, index) => ({
          length: EMOJI_SIZE + 8,
          offset: (EMOJI_SIZE + 8) * Math.floor(index / GRID_COLUMNS),
          index,
        })}
        initialNumToRender={40}
        maxToRenderPerBatch={40}
        windowSize={5}
        removeClippedSubviews
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  categoryBar: {
    maxHeight: 48,
    flexShrink: 0,
    flexGrow: 0,
  },
  categoryBarContent: {
    paddingHorizontal: 12,
    gap: 12,
    alignItems: "center",
  },
  categoryButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 40,
    gap: 4,
  },
  categoryIndicator: {
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: "transparent",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  gridContent: {
    padding: 8,
  },
  gridRow: {
    justifyContent: "flex-start",
  },
  emojiCell: {
    width: `${100 / GRID_COLUMNS}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiImage: {
    width: EMOJI_SIZE,
    height: EMOJI_SIZE,
  },
  emojiText: {
    fontSize: EMOJI_SIZE - 4,
    lineHeight: EMOJI_SIZE + 4,
  },
});
