import { accountAtom } from "@/models/atoms/account";
import { Stack, useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import Toast from "react-native-toast-message";

import type { CatalystAlbumDisplayMode } from "@natsuneko-laboratory/catalyst-sdk";

const DISPLAY_MODE_OPTIONS: { value: CatalystAlbumDisplayMode; label: string }[] = [
  { value: "timeline", label: "タイムライン" },
  { value: "grid", label: "グリッド" },
  { value: "gallery", label: "ギャラリー" },
];

export default function AlbumComposerScreen() {
  const theme = useColorScheme() ?? "light";
  const router = useRouter();
  const account = useAtomValue(accountAtom);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [displayMode, setDisplayMode] = useState<CatalystAlbumDisplayMode>("timeline");
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canCreate = useMemo(() => {
    return title.trim().length > 0 && !isSubmitting;
  }, [title, isSubmitting]);

  const handleSubmit = useCallback(async () => {
    if (!canCreate || !account) return;

    setIsSubmitting(true);

    try {
      const client = account.credential.client;
      await client.catalyst.createAlbum({
        title: title.trim(),
        description: description.trim(),
        isPublic,
        mode: displayMode,
      });

      Toast.show({ type: "success", text1: "アルバムを作成しました" });
      router.back();
    } catch (error) {
      console.error("Failed to create album:", error);
      Toast.show({ type: "error", text1: "エラー", text2: "アルバムの作成に失敗しました" });
    } finally {
      setIsSubmitting(false);
    }
  }, [canCreate, account, title, description, isPublic, displayMode, router]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "アルバム作成",
          headerBackTitle: "キャンセル",
          headerRight: () => (
            <Pressable onPress={handleSubmit} disabled={!canCreate}>
              <Text
                className={`text-base font-semibold ${canCreate ? "text-light-accent dark:text-dark-accent" : "text-light-text-subtle dark:text-dark-text-subtle"}`}
              >
                作成
              </Text>
            </Pressable>
          ),
        }}
      />
      <View className="flex-1 bg-light-background dark:bg-dark-background">
        {isSubmitting && (
          <View className="absolute inset-0 z-50 items-center justify-center bg-light-overlay dark:bg-dark-overlay">
            <ActivityIndicator size="large" />
          </View>
        )}
        <ScrollView className="flex-1" contentContainerClassName="p-4 gap-6">
          {/* 基本情報セクション */}
          <View className="gap-3">
            <Text className="text-base font-semibold text-light-text dark:text-dark-text">基本情報</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="タイトル"
              placeholderTextColor={theme === "dark" ? "#666" : "#999"}
              className="rounded-lg border border-light-border bg-light-surface p-3 text-base text-light-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="説明（任意）"
              placeholderTextColor={theme === "dark" ? "#666" : "#999"}
              className="min-h-[100px] rounded-lg border border-light-border bg-light-surface p-3 text-base text-light-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
              textAlignVertical="top"
            />
          </View>

          <View className="h-px bg-light-divider dark:bg-dark-divider" />

          {/* 表示モードセクション */}
          <View className="gap-3">
            <Text className="text-base font-semibold text-light-text dark:text-dark-text">表示モード</Text>
            <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
              アルバム内の投稿の表示方法を選択します
            </Text>
            <View className="flex-row gap-0 overflow-hidden rounded-lg border border-light-border dark:border-dark-border">
              {DISPLAY_MODE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setDisplayMode(option.value)}
                  className={`flex-1 items-center py-2 ${
                    displayMode === option.value
                      ? "bg-light-accent dark:bg-dark-accent"
                      : "bg-light-surface dark:bg-dark-surface"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      displayMode === option.value
                        ? "text-light-accent-foreground dark:text-dark-accent-foreground"
                        : "text-light-text dark:text-dark-text"
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="h-px bg-light-divider dark:bg-dark-divider" />

          {/* プライバシーセクション */}
          <View className="gap-3">
            <Text className="text-base font-semibold text-light-text dark:text-dark-text">プライバシー</Text>
            <View className="flex-row items-center justify-between">
              <Text className="flex-1 text-sm text-light-text dark:text-dark-text">公開アルバム</Text>
              <Switch value={isPublic} onValueChange={setIsPublic} />
            </View>
            <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
              {isPublic
                ? "すべてのユーザーがこのアルバムを閲覧できます"
                : "自分のみがこのアルバムを閲覧できます"}
            </Text>
          </View>
        </ScrollView>
      </View>
    </>
  );
}
