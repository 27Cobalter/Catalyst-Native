import { accountAtom } from "@/models/atoms/account";
import type { CatalystCustomReaction } from "@natsuneko-laboratory/catalyst-sdk";
import { useAtomValue } from "jotai";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { getFilteredCategories, useDefaultCategories } from "./emoji-data";
import { EmojiPickerView } from "./emoji-picker-view";
import { recordUnicodeUsage, recordUrlUsage } from "./frequency-manager";
import type { EmojiCategory, EmojiItem } from "./types";
import { emojiToCodepoints } from "./unicode";

type Props = {
  visible: boolean;
  onClose: () => void;
  onReact: (symbol: string) => void;
};

export function EmojiPickerSheet({ visible, onClose, onReact }: Props) {
  const theme = useColorScheme() ?? "light";
  const account = useAtomValue(accountAtom);
  const [categories, setCategories] = useState<EmojiCategory[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [sheetTranslateY] = useState(() => new Animated.Value(600));
  const { categories: defaultCategories, isLoading: isEmojiDataLoading } =
    useDefaultCategories();

  useEffect(() => {
    if (!visible || isEmojiDataLoading) return;

    setIsCategoriesLoading(true);

    const load = async () => {
      try {
        const customReactions = account?.credential.client
          ? await account.credential.client.catalyst
              .customReactions()
              .catch(() => [] as CatalystCustomReaction[])
          : [];

        const builtCategories: EmojiCategory[] = [];

        if (customReactions.length > 0) {
          builtCategories.push({
            id: "catalyst",
            title: "Catalyst",
            icon: "star",
            emojis: customReactions.map((r) => ({
              id: r.symbol,
              type: { kind: "url" as const, url: r.url },
              keywords: [r.name],
            })),
          });
        }

        const filtered = getFilteredCategories(
          ["flags", "smileys_and_people"],
          defaultCategories,
        );
        builtCategories.push(...filtered);

        setCategories(builtCategories);
      } catch (e) {
        console.error("Failed to load emoji data:", e);
        setCategories(
          getFilteredCategories(
            ["flags", "smileys_and_people"],
            defaultCategories,
          ),
        );
      } finally {
        setIsCategoriesLoading(false);
      }
    };

    load();
  }, [visible, account, isEmojiDataLoading, defaultCategories]);

  useEffect(() => {
    if (visible && Platform.OS !== "ios") {
      overlayOpacity.setValue(0);
      sheetTranslateY.setValue(600);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, overlayOpacity, sheetTranslateY]);

  const handleClose = useCallback(() => {
    if (Platform.OS === "ios") {
      onClose();
      return;
    }
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 600,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [onClose, overlayOpacity, sheetTranslateY]);

  const handleEmojiSelected = useCallback(
    async (emoji: EmojiItem) => {
      if (emoji.type.kind === "unicode") {
        const codepoints = emojiToCodepoints(emoji.type.emoji);
        onReact(codepoints);
        recordUnicodeUsage(emoji.type.emoji).catch(() => {});
      } else if (emoji.type.kind === "url") {
        onReact(emoji.id);
        recordUrlUsage(emoji.id, emoji.type.url).catch(() => {});
      }
      handleClose();
    },
    [onReact, handleClose],
  );


  if (Platform.OS === "ios") {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <View className="flex-1 bg-light-background dark:bg-dark-background">
          <View className="flex-row items-center justify-between px-4 py-4">
            <Pressable onPress={handleClose}>
              <Text style={styles.cancelText}>キャンセル</Text>
            </Pressable>
            <Text
              style={[
                styles.title,
                { color: theme === "dark" ? "#FFFFFF" : "#000000" },
              ]}
            >
              リアクションを追加
            </Text>
            <View style={{ width: 80 }} />
          </View>
          <View
            style={[
              styles.headerDivider,
              { backgroundColor: theme === "dark" ? "#38383A" : "#E5E5EA" },
            ]}
          />
          {isCategoriesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator />
            </View>
          ) : (
            <EmojiPickerView
              categories={categories}
              onEmojiSelected={handleEmojiSelected}
            />
          )}
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Pressable style={styles.overlayPressable} onPress={handleClose} />
        <Animated.View
          className="bg-light-background dark:bg-dark-background"
          style={[
            styles.androidSheet,
            {
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <View style={styles.androidHandle}>
            <View
              style={[
                styles.handleBar,
                { backgroundColor: theme === "dark" ? "#48484A" : "#C7C7CC" },
              ]}
            />
          </View>
          <Text
            style={[
              styles.androidTitle,
              { color: theme === "dark" ? "#FFFFFF" : "#000000" },
            ]}
          >
            リアクションを追加
          </Text>
          <View
            style={[
              styles.headerDivider,
              { backgroundColor: theme === "dark" ? "#38383A" : "#E5E5EA" },
            ]}
          />
          {isCategoriesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator />
            </View>
          ) : (
            <EmojiPickerView
              categories={categories}
              onEmojiSelected={handleEmojiSelected}
            />
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  cancelText: {
    fontSize: 17,
    color: "#007AFF",
    width: 80,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  overlayPressable: {
    flex: 1,
  },
  androidSheet: {
    height: "75%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  androidHandle: {
    alignItems: "center",
    paddingVertical: 8,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  androidTitle: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    paddingBottom: 8,
  },
});
