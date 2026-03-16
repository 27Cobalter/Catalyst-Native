import { getCdnUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { accountAtom } from "@/models/atoms/account";
import type { EgeriaUser } from "@natsuneko-laboratory/catalyst-sdk";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { useAtom } from "jotai";
import { Camera, Plus, Trash2 } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import ImageCropPicker from "react-native-image-crop-picker";
import Toast from "react-native-toast-message";
import { withUniwind } from "uniwind";

const UniImage = withUniwind(Image);
const UniCamera = withUniwind(Camera);
const UniPlus = withUniwind(Plus);
const UniTrash2 = withUniwind(Trash2);

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BANNER_HEIGHT = SCREEN_WIDTH / 3;

const BANNER_WIDTH = 1500;
const BANNER_CROP_HEIGHT = 500;
const ICON_SIZE = 512;
const MAX_ADDITIONAL_WEBSITES = 4;

type ImageSelection = {
  uri: string;
  mime: string;
} | null;

function isValidUrl(text: string): boolean {
  if (!text.trim()) return true;
  try {
    const url = new URL(text);
    return (url.protocol === "http:" || url.protocol === "https:") && !!url.host;
  } catch {
    return false;
  }
}

export default function ProfileEditScreen() {
  const theme = useColorScheme() ?? "light";
  const router = useRouter();
  const [account, setAccount] = useAtom(accountAtom);
  const user = account?.user as EgeriaUser | undefined;

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.profile?.bio ?? "");
  const [website, setWebsite] = useState(user?.profile?.website ?? "");
  const [additionalWebsites, setAdditionalWebsites] = useState<string[]>(
    user?.profile?.additionalWebsites?.filter((w) => !!w.trim()) ?? [],
  );

  const [bannerImage, setBannerImage] = useState<ImageSelection>(null);
  const [iconImage, setIconImage] = useState<ImageSelection>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!displayName.trim()) errors.push("表示名を入力してください");
    if (!isValidUrl(website)) errors.push("ウェブサイトのURLが無効です");
    for (const w of additionalWebsites) {
      if (!isValidUrl(w)) {
        errors.push("追加ウェブサイトのURLが無効です");
        break;
      }
    }
    return errors;
  }, [displayName, website, additionalWebsites]);

  const canSave = validationErrors.length === 0 && !isSubmitting;

  const handlePickBanner = useCallback(async () => {
    try {
      const image = await ImageCropPicker.openPicker({
        width: BANNER_WIDTH,
        height: BANNER_CROP_HEIGHT,
        cropping: true,
        cropperToolbarTitle: "ヘッダー画像を切り取り",
        mediaType: "photo",
      });
      setBannerImage({ uri: image.path, mime: image.mime });
    } catch (e: any) {
      if (e?.code !== "E_PICKER_CANCELLED") {
        console.error("Banner pick error:", e);
      }
    }
  }, []);

  const handlePickIcon = useCallback(async () => {
    try {
      const image = await ImageCropPicker.openPicker({
        width: ICON_SIZE,
        height: ICON_SIZE,
        cropping: true,
        cropperCircleOverlay: true,
        cropperToolbarTitle: "アイコン画像を切り取り",
        mediaType: "photo",
      });
      setIconImage({ uri: image.path, mime: image.mime });
    } catch (e: any) {
      if (e?.code !== "E_PICKER_CANCELLED") {
        console.error("Icon pick error:", e);
      }
    }
  }, []);

  const uploadImage = useCallback(
    async (imageSelection: ImageSelection): Promise<string | null> => {
      if (!imageSelection || !account) return null;

      const client = account.credential.client;
      const uploadUrls = await client.media.upload();

      const response = await fetch(imageSelection.uri);
      const blob = await response.blob();

      const uploadResponse = await fetch(uploadUrls.signedUrl, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": imageSelection.mime || "image/jpeg" },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }

      return uploadUrls.url;
    },
    [account],
  );

  const handleAddWebsite = useCallback(() => {
    if (additionalWebsites.length < MAX_ADDITIONAL_WEBSITES) {
      setAdditionalWebsites((prev) => [...prev, ""]);
    }
  }, [additionalWebsites.length]);

  const handleRemoveWebsite = useCallback((index: number) => {
    setAdditionalWebsites((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateWebsite = useCallback((index: number, value: string) => {
    setAdditionalWebsites((prev) => prev.map((w, i) => (i === index ? value : w)));
  }, []);

  const handleSave = useCallback(async () => {
    if (!canSave || !account) return;

    setIsSubmitting(true);

    try {
      const client = account.credential.client;

      let iconUrl = user?.profile?.iconUrl ?? "";
      let bannerUrl = user?.profile?.bannerUrl ?? "";

      if (iconImage) {
        const uploaded = await uploadImage(iconImage);
        if (uploaded) iconUrl = uploaded;
      }

      if (bannerImage) {
        const uploaded = await uploadImage(bannerImage);
        if (uploaded) bannerUrl = uploaded;
      }

      const filteredWebsites = additionalWebsites.filter((w) => !!w.trim());

      await client.egeria.update({
        displayName: displayName.trim(),
        profile: {
          iconUrl,
          bannerUrl,
          bio,
          website: website.trim(),
          additionalWebsites: filteredWebsites,
        },
      });

      // ユーザー情報を更新
      const me = await client.egeria.me();
      if (me?.user) {
        setAccount({ user: me.user, credential: account.credential });
      }

      router.back();
    } catch (error) {
      console.error("Failed to update profile:", error);
      Toast.show({
        type: "error",
        text1: "エラー",
        text2: "プロフィールの更新に失敗しました",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canSave,
    account,
    user,
    iconImage,
    bannerImage,
    displayName,
    bio,
    website,
    additionalWebsites,
    uploadImage,
    setAccount,
    router,
  ]);

  const currentBannerUri = bannerImage
    ? bannerImage.uri
    : user?.profile?.bannerUrl
      ? getCdnUrl({ src: user.profile.bannerUrl, variant: "header", width: SCREEN_WIDTH })
      : null;

  const currentIconUri = iconImage
    ? iconImage.uri
    : user?.profile?.iconUrl
      ? getCdnUrl({ src: user.profile.iconUrl, variant: "icon", width: 128 })
      : null;

  return (
    <>
      <Stack.Screen
        options={{
          title: "プロフィールを編集",
          headerBackTitle: "キャンセル",
          headerRight: () => (
            <Pressable onPress={handleSave} disabled={!canSave}>
              <Text
                className={cn(
                  "text-base font-semibold",
                  canSave
                    ? "text-light-accent dark:text-dark-accent"
                    : "text-light-text-subtle dark:text-dark-text-subtle",
                )}
              >
                保存
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
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={100}
        >
          <ScrollView className="flex-1" contentContainerClassName="pb-12">
            {/* ヘッダー画像 */}
            <Pressable onPress={handlePickBanner}>
              <View style={{ width: SCREEN_WIDTH, height: BANNER_HEIGHT }}>
                {currentBannerUri ? (
                  <UniImage
                    source={{ uri: currentBannerUri }}
                    contentFit="cover"
                    style={{ width: SCREEN_WIDTH, height: BANNER_HEIGHT }}
                  />
                ) : (
                  <View
                    className="bg-neutral-400 dark:bg-neutral-700"
                    style={{ width: SCREEN_WIDTH, height: BANNER_HEIGHT }}
                  />
                )}
                <View className="absolute inset-0 items-center justify-center bg-black/30">
                  <UniCamera size={28} className="text-white" />
                </View>
              </View>
            </Pressable>

            {/* アイコン画像 */}
            <View className="px-4 -mt-10">
              <Pressable onPress={handlePickIcon}>
                <View className="border-light-background dark:border-dark-background rounded-full border-4 w-24 h-24">
                  {currentIconUri ? (
                    <UniImage
                      source={{ uri: currentIconUri }}
                      className="w-full h-full rounded-full"
                      contentFit="cover"
                    />
                  ) : (
                    <View className="w-full h-full rounded-full bg-neutral-400 dark:bg-neutral-600" />
                  )}
                  <View className="absolute inset-0 items-center justify-center rounded-full bg-black/30">
                    <UniCamera size={20} className="text-white" />
                  </View>
                </View>
              </Pressable>
              <Text className="mt-1 text-xs text-light-text-muted dark:text-dark-text-muted">
                正方形にクロップされます
              </Text>
            </View>

            {/* フォーム */}
            <View className="px-4 mt-4 gap-5">
              {/* 表示名 */}
              <View className="gap-1.5">
                <Text className="text-sm font-medium text-light-text dark:text-dark-text">表示名</Text>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="表示名"
                  placeholderTextColor={theme === "dark" ? "#666" : "#999"}
                  className="rounded-lg border border-light-border bg-light-surface px-3 py-2.5 text-base text-light-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                />
                {!displayName.trim() && (
                  <Text className="text-xs text-light-error dark:text-dark-error">表示名は必須です</Text>
                )}
              </View>

              <View className="h-px bg-light-divider dark:bg-dark-divider" />

              {/* 自己紹介 */}
              <View className="gap-1.5">
                <Text className="text-sm font-medium text-light-text dark:text-dark-text">自己紹介</Text>
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  placeholder="自己紹介を入力..."
                  placeholderTextColor={theme === "dark" ? "#666" : "#999"}
                  multiline
                  className="min-h-[80px] rounded-lg border border-light-border bg-light-surface px-3 py-2.5 text-base text-light-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                  textAlignVertical="top"
                />
              </View>

              <View className="h-px bg-light-divider dark:bg-dark-divider" />

              {/* ウェブサイト */}
              <View className="gap-1.5">
                <Text className="text-sm font-medium text-light-text dark:text-dark-text">ウェブサイト</Text>
                <TextInput
                  value={website}
                  onChangeText={setWebsite}
                  placeholder="https://example.com"
                  placeholderTextColor={theme === "dark" ? "#666" : "#999"}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  className="rounded-lg border border-light-border bg-light-surface px-3 py-2.5 text-base text-light-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                />
                {website.trim() && !isValidUrl(website) && (
                  <Text className="text-xs text-light-error dark:text-dark-error">
                    有効なURLを入力してください (http:// または https://)
                  </Text>
                )}
              </View>

              {/* 追加ウェブサイト */}
              {additionalWebsites.map((w, index) => (
                <View key={`additional-website-${index}`} className="gap-1.5">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-light-text dark:text-dark-text">
                      追加ウェブサイト {index + 1}
                    </Text>
                    <Pressable onPress={() => handleRemoveWebsite(index)} hitSlop={8}>
                      <UniTrash2 size={16} className="text-light-error dark:text-dark-error" />
                    </Pressable>
                  </View>
                  <TextInput
                    value={w}
                    onChangeText={(value) => handleUpdateWebsite(index, value)}
                    placeholder="https://example.com"
                    placeholderTextColor={theme === "dark" ? "#666" : "#999"}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    className="rounded-lg border border-light-border bg-light-surface px-3 py-2.5 text-base text-light-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                  />
                  {w.trim() && !isValidUrl(w) && (
                    <Text className="text-xs text-light-error dark:text-dark-error">
                      有効なURLを入力してください (http:// または https://)
                    </Text>
                  )}
                </View>
              ))}

              {additionalWebsites.length < MAX_ADDITIONAL_WEBSITES && (
                <Pressable onPress={handleAddWebsite} className="flex-row items-center gap-2">
                  <UniPlus size={16} className="text-light-tint dark:text-dark-tint" />
                  <Text className="text-sm text-light-tint dark:text-dark-tint">ウェブサイトを追加</Text>
                </Pressable>
              )}
              {additionalWebsites.length > 0 && (
                <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
                  最大{MAX_ADDITIONAL_WEBSITES}件まで追加できます
                </Text>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}
