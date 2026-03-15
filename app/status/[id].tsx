import { EmojiPickerSheet, type EmojiPickerSheetRef } from "@/components/emoji-verse";
import { ReactionBar } from "@/components/reaction-bar";
import { ActionBar } from "@/components/status/action-bar";
import { StatusText } from "@/components/status/text";
import { MediaCarousel } from "@/components/ui/media-carousel";
import { abs, rel } from "@/lib/dayjs";
import { getCdnUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { accountAtom } from "@/models/atoms/account";
import { openUrlWithBrowser } from "@/models/browser-settings";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import type { CatalystReaction, CatalystStatus } from "@natsuneko-laboratory/catalyst-sdk";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import {
  ArrowLeft,
  Bookmark,
  Check,
  Clipboard as ClipboardIcon,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { withUniwind } from "uniwind";

import "@/global.css";

const UniBookmark = withUniwind(Bookmark);
const UniClipboardIcon = withUniwind(ClipboardIcon);
const UniExternalLink = withUniwind(ExternalLink);
const UniPencil = withUniwind(Pencil);
const UniSend = withUniwind(Send);
const UniTrash2 = withUniwind(Trash2);

const UniImage = withUniwind(Image);
const UniMoreHorizontal = withUniwind(MoreHorizontal);

function MenuItem({
  label,
  icon: Icon,
  theme,
  onPress,
  destructive,
}: {
  label: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  theme: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        pressed && { backgroundColor: theme === "dark" ? "#38383A" : "#E5E5EA" },
      ]}
      className="rounded-sm bg-light-surface dark:bg-dark-surface mx-2 my-1"
      onPress={onPress}
    >
      <Icon
        size={20}
        className={cn(
          "text-light-accent dark:text-dark-accent",
          destructive && "text-light-error dark:text-dark-error",
        )}
      />
      <Text
        className={cn("text-light-text dark:text-dark-text", destructive && "text-light-error dark:text-dark-error")}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function StatusDetailsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useColorScheme() ?? "light";
  const account = useAtomValue(accountAtom);

  const [status, setStatus] = useState<CatalystStatus | null>(null);
  const [reactions, setReactions] = useState<Record<string, CatalystReaction>>({});
  const [editingCaption, setEditingCaption] = useState("");
  const [isEditSheetVisible, setIsEditSheetVisible] = useState(false);
  const [isEditingSaving, setIsEditingSaving] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const emojiPickerRef = useRef<EmojiPickerSheetRef>(null);
  const menuSheetRef = useRef<BottomSheetModal>(null);

  const isMyself = account?.user?.id === status?.user?.id;
  const isLoggedIn = account !== null;
  const statusUrl = `https://catalyst.natsuneko.com/status/${id}`;

  useEffect(() => {
    if (!account?.credential.client || !id) return;

    const fetchData = async () => {
      try {
        const [statusRes, favRes, reactionsRes] = await Promise.all([
          account.credential.client.catalyst.getStatus(id),
          account.credential.client.catalyst.isFavorited(id).catch(() => false),
          account.credential.client.catalyst.reactions(id).catch(() => ({ reactions: {} })),
        ]);
        setStatus(statusRes.status);
        setIsFavorited(favRes as boolean);
        setReactions(reactionsRes.reactions ?? {});
      } catch (e) {
        console.error("Failed to fetch status:", e);
      }
    };

    fetchData();
  }, [id, account]);

  const handleReact = useCallback(
    async (symbol: string) => {
      if (!account?.credential.client || !id) return;
      try {
        await account.credential.client.catalyst.react(id, symbol);
        setReactions((prev) => ({
          ...prev,
          [symbol]: { ...prev[symbol], symbol, count: (prev[symbol]?.count ?? 0) + 1, hasSelfReaction: true },
        }));
      } catch {
        Alert.alert("エラー", "リアクションに失敗しました");
      }
    },
    [account, id],
  );

  const handleUnreact = useCallback(
    async (symbol: string) => {
      if (!account?.credential.client || !id) return;
      try {
        await account.credential.client.catalyst.unreact(id, symbol);
        setReactions((prev) => ({
          ...prev,
          [symbol]: { ...prev[symbol], count: (prev[symbol]?.count ?? 0) - 1, hasSelfReaction: false },
        }));
      } catch {
        Alert.alert("エラー", "リアクションの取り消しに失敗しました");
      }
    },
    [account, id],
  );

  const handleDeleteStatus = useCallback(async () => {
    if (!account?.credential.client || !id) return;
    try {
      await account.credential.client.catalyst.deleteStatus(id);
      router.back();
    } catch {
      Alert.alert("エラー", "削除に失敗しました");
    }
  }, [account, id, router]);

  const handleEditSave = useCallback(async () => {
    if (!account?.credential.client || !id || !editingCaption) return;
    setIsEditingSaving(true);
    try {
      await account.credential.client.catalyst.editStatus(id, { description: editingCaption });
      setStatus((prev) => (prev ? { ...prev, body: editingCaption } : prev));
      setIsEditSheetVisible(false);
    } catch {
      Alert.alert("エラー", "更新に失敗しました");
    } finally {
      setIsEditingSaving(false);
    }
  }, [account, id, editingCaption]);

  const handleMenuAction = useCallback(
    (action: string) => {
      switch (action) {
        case "アルバムへ追加":
          // TODO: アルバムへ追加の実装
          break;
        case "編集する":
          setEditingCaption(status?.body ?? "");
          setIsEditSheetVisible(true);
          break;
        case "削除する":
          Alert.alert("この投稿を削除しますか？", "この操作は取り消せません", [
            { text: "キャンセル", style: "cancel" },
            { text: "削除", style: "destructive", onPress: handleDeleteStatus },
          ]);
          break;
        case "ブラウザで開く":
          openUrlWithBrowser(statusUrl);
          break;
        case "URL をコピー":
          Clipboard.setStringAsync(statusUrl);
          break;
        case "投稿をコピー":
          Clipboard.setStringAsync(`${status?.body ?? ""}\n\n${statusUrl}`);
          break;
        case "共有":
          Share.share({
            message: `${status?.body ?? ""}\n\n${statusUrl}`,
            url: statusUrl,
          });
          break;
      }
    },
    [status, statusUrl, handleDeleteStatus],
  );

  const showMenu = useCallback(() => {
    menuSheetRef.current?.present();
  }, []);

  const handleMenuItemPress = useCallback(
    (action: string) => {
      menuSheetRef.current?.dismiss();
      handleMenuAction(action);
    },
    [handleMenuAction],
  );

  const renderMenuBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    [],
  );

  const user = status?.user;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity onPress={showMenu} style={{ padding: 8 }}>
              <UniMoreHorizontal size={22} className="text-black dark:text-white" />
            </TouchableOpacity>
          ),
        }}
      />

      {!status ? (
        <View className="flex-1 bg-light-background dark:bg-dark-background items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <ScrollView className="flex-1 bg-light-background dark:bg-dark-background">
          {/* User header */}
          <View className="flex-row items-center px-4 pt-4 pb-2">
            <TouchableOpacity onPress={() => user && router.push(`/user/${user.screenName}`)} activeOpacity={0.7}>
              {user?.profile?.iconUrl ? (
                <UniImage
                  source={{ uri: getCdnUrl({ src: user.profile.iconUrl, variant: "icon", width: 96 }) }}
                  className="h-12 w-12 rounded-full"
                  contentFit="cover"
                />
              ) : (
                <View className="h-12 w-12 rounded-full" />
              )}
            </TouchableOpacity>

            <View className="flex-1 ml-3">
              <TouchableOpacity onPress={() => user && router.push(`/user/${user.screenName}`)} activeOpacity={0.7}>
                <Text className="text-light-text dark:text-dark-text font-semibold text-base" numberOfLines={1}>
                  {user?.displayName ?? ""}
                </Text>
                <Text className="text-neutral-500" numberOfLines={1}>
                  @{user?.screenName ?? ""}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Media */}
          {status && status.medias.length > 0 && <MediaCarousel medias={status.medias} />}

          {/* Body and actions */}
          <View className="p-4">
            {status && status.body.length > 0 && <StatusText status={status.body} />}

            {status && (
              <>
                <Text className="text-sm text-neutral-500 mt-2">
                  {abs(status.createdAt)} - {rel(status.createdAt)}
                </Text>

                <View className="border-t border-light-border dark:border-dark-border my-2" />

                <ActionBar isDefaultFavorited={isFavorited} status={status} />

                <View className="border-t border-light-border dark:border-dark-border my-2" />

                <ReactionBar
                  reactions={reactions}
                  onReact={handleReact}
                  onUnreact={handleUnreact}
                  onAddReaction={isLoggedIn ? () => emojiPickerRef.current?.open() : undefined}
                />
              </>
            )}
          </View>
        </ScrollView>
      )}

      {/* Edit caption sheet */}
      {Platform.OS === "ios" ? (
        <Modal visible={isEditSheetVisible} animationType="slide" presentationStyle="pageSheet">
          <View className="bg-light-background dark:bg-dark-background" style={[styles.editSheetContainer]}>
            <View style={styles.editSheetHeader}>
              <TouchableOpacity onPress={() => setIsEditSheetVisible(false)}>
                <Text style={styles.editSheetCancel}>キャンセル</Text>
              </TouchableOpacity>
              <Text style={styles.editSheetTitle}>キャプションを編集</Text>
              <TouchableOpacity onPress={handleEditSave} disabled={isEditingSaving || editingCaption.length === 0}>
                <Text
                  style={[
                    styles.editSheetSave,
                    (isEditingSaving || editingCaption.length === 0) && styles.editSheetSaveDisabled,
                  ]}
                >
                  保存
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.editSheetInput}
              value={editingCaption}
              onChangeText={setEditingCaption}
              multiline
              autoFocus
              textAlignVertical="top"
            />
          </View>
        </Modal>
      ) : (
        <Modal visible={isEditSheetVisible} animationType="fade" statusBarTranslucent>
          <View className="bg-light-background dark:bg-dark-background" style={[styles.editSheetContainerAndroid]}>
            <View style={[styles.editSheetToolbar, { backgroundColor: theme === "dark" ? "#1E1E1E" : "#FFFFFF" }]}>
              <TouchableOpacity onPress={() => setIsEditSheetVisible(false)} style={styles.toolbarIconButton}>
                <ArrowLeft size={24} color={theme === "dark" ? "#FFFFFF" : "#000000"} />
              </TouchableOpacity>
              <Text style={[styles.toolbarTitle, { color: theme === "dark" ? "#FFFFFF" : "#000000" }]}>
                キャプションを編集
              </Text>
              <TouchableOpacity
                onPress={handleEditSave}
                disabled={isEditingSaving || editingCaption.length === 0}
                style={[
                  styles.toolbarSaveButton,
                  (isEditingSaving || editingCaption.length === 0) && styles.toolbarSaveButtonDisabled,
                ]}
              >
                <Check size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.editSheetInput, { color: theme === "dark" ? "#FFFFFF" : "#000000" }]}
              value={editingCaption}
              onChangeText={setEditingCaption}
              multiline
              autoFocus
              textAlignVertical="top"
            />
          </View>
        </Modal>
      )}

      {/* Reaction picker sheet */}
      <EmojiPickerSheet ref={emojiPickerRef} onReact={handleReact} />

      {/* Action menu */}
      <BottomSheetModal
        ref={menuSheetRef}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderMenuBackdrop}
        backgroundStyle={{
          backgroundColor: theme === "dark" ? "#1C1C1E" : "#FFFFFF",
        }}
        handleIndicatorStyle={{
          backgroundColor: theme === "dark" ? "#48484A" : "#C7C7CC",
        }}
      >
        <BottomSheetView style={styles.menuContent}>
          <View className="px-2 mb-2">
            <MenuItem
              icon={UniBookmark}
              label="アルバムへ追加"
              theme={theme}
              onPress={() => handleMenuItemPress("アルバムへ追加")}
            />
          </View>
          {isMyself && (
            <View className="px-2 my-2">
              <MenuItem
                icon={UniPencil}
                label="編集する"
                theme={theme}
                onPress={() => handleMenuItemPress("編集する")}
              />
              <MenuItem
                icon={UniTrash2}
                label="削除する"
                theme={theme}
                onPress={() => handleMenuItemPress("削除する")}
                destructive
              />
            </View>
          )}
          <View className="px-2 mt-2">
            <MenuItem
              icon={UniExternalLink}
              label="ブラウザで開く"
              theme={theme}
              onPress={() => handleMenuItemPress("ブラウザで開く")}
            />
            <MenuItem
              icon={UniClipboardIcon}
              label="URL をコピー"
              theme={theme}
              onPress={() => handleMenuItemPress("URL をコピー")}
            />
            <MenuItem
              icon={UniClipboardIcon}
              label="投稿をコピー"
              theme={theme}
              onPress={() => handleMenuItemPress("投稿をコピー")}
            />
            <MenuItem icon={UniSend} label="共有" theme={theme} onPress={() => handleMenuItemPress("共有")} />
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  editSheetContainer: {
    flex: 1,
  },
  editSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  editSheetTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  editSheetCancel: {
    fontSize: 17,
    color: "#007AFF",
  },
  editSheetSave: {
    fontSize: 17,
    color: "#007AFF",
    fontWeight: "600",
  },
  editSheetSaveDisabled: {
    opacity: 0.4,
  },
  editSheetInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
  },
  editSheetContainerAndroid: {
    flex: 1,
  },
  editSheetToolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 8,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  toolbarIconButton: {
    padding: 12,
  },
  toolbarTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "500",
    marginLeft: 8,
  },
  toolbarSaveButton: {
    margin: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1976D2",
  },
  toolbarSaveButtonDisabled: {
    backgroundColor: "#90CAF9",
  },
  menuContent: {
    paddingBottom: 32,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  menuItemText: {
    fontSize: 17,
  },
});
