import { EmojiPickerSheet } from "@/components/emoji-verse";
import { MediaCarousel } from "@/components/MediaCarousel";
import { ReactionBar } from "@/components/reaction-bar";
import { StatusText } from "@/components/status/text";
import { Colors } from "@/constants/theme";
import { abs, rel } from "@/lib/dayjs";
import { getCdnUrl } from "@/lib/media";
import { accountAtom } from "@/models/atoms/account";
import type { CatalystReaction, CatalystStatus } from "@natsuneko-laboratory/catalyst-sdk";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { ArrowLeft, Check, Heart, MoreHorizontal } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Animated,
  Linking,
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

export default function StatusDetailsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useColorScheme() ?? "light";
  const account = useAtomValue(accountAtom);

  const [status, setStatus] = useState<CatalystStatus | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [reactions, setReactions] = useState<Record<string, CatalystReaction>>({});
  const [editingCaption, setEditingCaption] = useState("");
  const [isEditSheetVisible, setIsEditSheetVisible] = useState(false);
  const [isEditingSaving, setIsEditingSaving] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isReactionSheetVisible, setIsReactionSheetVisible] = useState(false);
  const menuOverlayOpacity = useRef(new Animated.Value(0)).current;
  const menuSheetTranslateY = useRef(new Animated.Value(300)).current;

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

  const toggleFavorite = useCallback(async () => {
    if (!account?.credential.client || !id || isTogglingFavorite) return;
    setIsTogglingFavorite(true);
    try {
      if (isFavorited) {
        await account.credential.client.catalyst.unfavorite(id);
        setIsFavorited(false);
      } else {
        await account.credential.client.catalyst.favorite(id);
        setIsFavorited(true);
      }
    } catch (e) {
      Alert.alert("エラー", "お気に入りの操作に失敗しました");
    } finally {
      setIsTogglingFavorite(false);
    }
  }, [account, id, isFavorited, isTogglingFavorite]);

  const handleReact = useCallback(
    async (symbol: string) => {
      if (!account?.credential.client || !id) return;
      try {
        await account.credential.client.catalyst.react(id, symbol);
        setReactions((prev) => ({
          ...prev,
          [symbol]: { ...prev[symbol], count: (prev[symbol]?.count ?? 0) + 1, hasSelfReaction: true },
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
          Linking.openURL(statusUrl);
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

  const closeMenu = useCallback(
    (onClosed?: () => void) => {
      Animated.parallel([
        Animated.timing(menuOverlayOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(menuSheetTranslateY, { toValue: 300, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setIsMenuVisible(false);
        onClosed?.();
      });
    },
    [menuOverlayOpacity, menuSheetTranslateY],
  );

  const showMenu = useCallback(() => {
    if (Platform.OS === "ios") {
      const options: string[] = ["キャンセル", "ブラウザで開く", "URL をコピー", "投稿をコピー", "共有"];
      if (isMyself) {
        options.splice(1, 0, "編集する", "削除する");
      }
      const cancelIndex = 0;
      const destructiveIndex = isMyself ? options.indexOf("削除する") : -1;

      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: destructiveIndex },
        (buttonIndex) => {
          const label = options[buttonIndex];
          handleMenuAction(label);
        },
      );
    } else {
      menuSheetTranslateY.setValue(300);
      menuOverlayOpacity.setValue(0);
      setIsMenuVisible(true);
      Animated.parallel([
        Animated.timing(menuOverlayOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(menuSheetTranslateY, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    }
  }, [isMyself, handleMenuAction, menuOverlayOpacity, menuSheetTranslateY]);

  const user = status?.user;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity onPress={showMenu} style={{ padding: 8 }}>
              <MoreHorizontal size={22} color="#000" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={{
          ...styles.container,
          backgroundColor: theme === "dark" ? Colors.dark.background : Colors.light.background,
        }}
      >
        {/* User header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => user && router.push(`/user/${user.screenName}`)} activeOpacity={0.7}>
            {user?.profile?.iconUrl ? (
              <Image
                source={{ uri: getCdnUrl({ src: user.profile.iconUrl, variant: "icon", width: 96 }) }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]} />
            )}
          </TouchableOpacity>

          <View style={styles.userInfo}>
            <TouchableOpacity onPress={() => user && router.push(`/user/${user.screenName}`)} activeOpacity={0.7}>
              <Text style={styles.displayName} numberOfLines={1}>
                {user?.displayName ?? ""}
              </Text>
              <Text style={styles.screenName} numberOfLines={1}>
                @{user?.screenName ?? ""}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Media */}
        {status && status.medias.length > 0 && <MediaCarousel medias={status.medias} />}

        {/* Body and actions */}
        <View style={styles.bodyContainer}>
          {status && status.body.length > 0 && <StatusText status={status.body} />}

          {status && (
            <>
              <Text style={styles.timestamp}>
                {abs(status.createdAt)} · {rel(status.createdAt)}
              </Text>

              <View style={styles.divider} />

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  onPress={toggleFavorite}
                  disabled={isTogglingFavorite || !isLoggedIn}
                  style={[styles.actionButton, (!isLoggedIn || isTogglingFavorite) && styles.actionButtonDisabled]}
                >
                  <Heart size={22} color={isFavorited ? "#FF3B30" : "#000"} fill={isFavorited ? "#FF3B30" : "none"} />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <ReactionBar
                reactions={reactions}
                onReact={handleReact}
                onUnreact={handleUnreact}
                onAddReaction={isLoggedIn ? () => setIsReactionSheetVisible(true) : undefined}
              />
            </>
          )}
        </View>
      </ScrollView>

      {/* Edit caption sheet */}
      {Platform.OS === "ios" ? (
        <Modal visible={isEditSheetVisible} animationType="slide" presentationStyle="pageSheet">
          <View
            style={[
              styles.editSheetContainer,
              { backgroundColor: theme === "dark" ? Colors.dark.background : Colors.light.background },
            ]}
          >
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
          <View
            style={[
              styles.editSheetContainerAndroid,
              { backgroundColor: theme === "dark" ? Colors.dark.background : Colors.light.background },
            ]}
          >
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
      <EmojiPickerSheet
        visible={isReactionSheetVisible}
        onClose={() => setIsReactionSheetVisible(false)}
        onReact={handleReact}
      />

      {/* Android menu modal */}
      {Platform.OS !== "ios" && (
        <Modal visible={isMenuVisible} transparent animationType="none" onRequestClose={() => closeMenu()}>
          <Animated.View style={[styles.menuOverlay, { opacity: menuOverlayOpacity }]}>
            <Pressable style={styles.menuOverlayPressable} onPress={() => closeMenu()} />
            <Animated.View
              style={[
                styles.menuSheet,
                { backgroundColor: theme === "dark" ? Colors.dark.background : Colors.light.background },
                { transform: [{ translateY: menuSheetTranslateY }] },
              ]}
            >
              {isMyself && (
                <>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => closeMenu(() => handleMenuAction("編集する"))}
                  >
                    <Text style={styles.menuItemText}>編集する</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => closeMenu(() => handleMenuAction("削除する"))}
                  >
                    <Text style={[styles.menuItemText, styles.destructiveText]}>削除する</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => closeMenu(() => handleMenuAction("ブラウザで開く"))}
              >
                <Text style={styles.menuItemText}>ブラウザで開く</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => closeMenu(() => handleMenuAction("URL をコピー"))}
              >
                <Text style={styles.menuItemText}>URL をコピー</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => closeMenu(() => handleMenuAction("投稿をコピー"))}
              >
                <Text style={styles.menuItemText}>投稿をコピー</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => closeMenu(() => handleMenuAction("共有"))}>
                <Text style={styles.menuItemText}>共有</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {},
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  displayName: {
    fontSize: 15,
    fontWeight: "bold",
  },
  screenName: {
    fontSize: 14,
    color: "#8E8E93",
  },
  bodyContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  timestamp: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E5EA",
    marginVertical: 8,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  actionButton: {
    padding: 4,
  },
  actionButtonDisabled: {
    opacity: 0.2,
  },
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
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  menuOverlayPressable: {
    flex: 1,
  },
  menuSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 32,
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
  },
  menuItemText: {
    fontSize: 17,
  },
  destructiveText: {
    color: "#FF3B30",
  },
});
