import {
  CatalystButton,
  CatalystButtonIcon,
  CatalystButtonText,
  CatalystEmptyState,
  CatalystSwitch,
  CatalystText,
} from "@/components/design-system";
import {
  ApplyToAllSheet,
  type ApplyToAllOption,
  type ApplyToAllSheetRef,
} from "@/components/metadata-editor/apply-to-all-sheet";
import { PhotoPager } from "@/components/metadata-editor/photo-pager";
import { ThumbnailStrip } from "@/components/metadata-editor/thumbnail-strip";
import { accountAtom } from "@/models/atoms/account";
import { clientAtom } from "@/models/atoms/credential";
import { metadataRevisionAtomFamily } from "@/models/atoms/epiclese-metadata";
import {
  applyToAll,
  isMetadataConfigured,
  isMetadataDirty,
  toEditableMetadata,
  type ApplyToAllField,
  type EditableMediaMetadata,
} from "@/models/epiclese-metadata-editor";
import type { Media } from "@/models/sdk-types";
import { Stack, useLocalSearchParams, usePreventRemove, useRouter } from "expo-router";
import { useAtomValue, useSetAtom } from "jotai";
import { Copy, EyeOff } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import { withUniwind } from "uniwind";

const UniCopy = withUniwind(Copy);
const UniEyeOff = withUniwind(EyeOff);

const HIDE_AUTO_DESCRIPTION =
  "ResoniteScreenshotExtensions や VRCX などのツールで画像に埋め込まれたメタデータがある場合でも、表示したくないときは ON にしてください。編集画面から追加したメタデータは引き続き表示されます。";

const APPLY_TO_ALL_OPTIONS: ApplyToAllOption[] = [{ field: "privacyMetadata", label: "表示設定", icon: UniEyeOff }];

type LoadState = { kind: "loading" } | { kind: "forbidden" } | { kind: "error" } | { kind: "ready"; medias: Media[] };

export default function StatusMetadataScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  // トークン更新のたびに accountAtom は作り直されるので、読み込みはユーザー ID とクライアントにだけ追従させる。
  // account そのものに追従すると、更新のたびに読み込み直して編集中の内容が消える
  const userId = useAtomValue(accountAtom)?.user.id;
  const client = useAtomValue(clientAtom);
  const setMetadataRevision = useSetAtom(metadataRevisionAtomFamily(id));

  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [initialItems, setInitialItems] = useState<EditableMediaMetadata[]>([]);
  const [items, setItems] = useState<EditableMediaMetadata[]>([]);
  const [index, setIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const applyToAllSheetRef = useRef<ApplyToAllSheetRef>(null);

  const isDirty = isMetadataDirty(initialItems, items);
  const canSave = isDirty && !isSubmitting;

  useEffect(() => {
    if (!id) return;
    if (!userId) {
      setLoadState({ kind: "forbidden" });
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoadState({ kind: "loading" });

      try {
        const { data } = await client.catalyst.v11.status.id.get({
          path: { id },
          throwOnError: true,
        });
        if (cancelled) return;
        if (data.status.user?.id !== userId) {
          setLoadState({ kind: "forbidden" });
          return;
        }

        // 保存は全置換なので、どれか 1 つでも欠けたら編集させない (送り返す値が欠けて消えるのを防ぐ)
        const [metadata, platforms] = await Promise.all([
          client.epiclese.v1.tag.by.status.id.get({ path: { id }, throwOnError: true }).then(({ data }) => data),
          client.epiclese.v1.platforms.get({ throwOnError: true }).then(({ data }) => data.platforms),
        ]);
        if (cancelled) return;

        const editable = toEditableMetadata(data.status.medias, metadata, platforms);
        setInitialItems(editable);
        setItems(editable);
        setIndex(0);
        setLoadState({ kind: "ready", medias: data.status.medias });
      } catch (error) {
        console.error("Failed to load metadata:", error);
        if (!cancelled) setLoadState({ kind: "error" });
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [id, userId, client, reloadKey]);

  const handleTogglePrivacy = useCallback(
    (value: boolean) => {
      setItems((prev) => prev.map((item, i) => (i === index ? { ...item, privacyMetadata: value } : item)));
    },
    [index],
  );

  const handleApplyToAll = useCallback(
    (field: ApplyToAllField) => {
      setItems((prev) => applyToAll(prev, index, field));
    },
    [index],
  );

  const handleSave = useCallback(async () => {
    if (!canSave) return;

    setIsSubmitting(true);

    try {
      await client.epiclese.v1.tag.by.status.id.create({
        path: { id },
        body: items,
        throwOnError: true,
      });
      setMetadataRevision((revision) => revision + 1);
      setIsSaved(true);
    } catch (error) {
      console.error("Failed to save metadata:", error);
      Alert.alert("エラー", "メタデータの保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  }, [canSave, client, id, items, setMetadataRevision]);

  // 保存済みにしたレンダーで usePreventRemove が外れてから戻る。同じレンダーで戻ると破棄確認が出てしまう
  useEffect(() => {
    if (isSaved) router.back();
  }, [isSaved, router]);

  // 保存中は離れさせない。破棄して離れても送信中の保存は取り消せず、結果だけが残ってしまうため
  usePreventRemove(isSubmitting || (isDirty && !isSaved), ({ repeat }) => {
    if (isSubmitting) return;

    Alert.alert("変更を破棄しますか？", undefined, [
      { text: "編集を続ける", style: "cancel" },
      {
        text: "破棄",
        style: "destructive",
        // 変更を戻して preventRemove を false にしてから、止めた画面遷移をやり直す
        onPress: () => {
          setItems(initialItems);
          repeat();
        },
      },
    ]);
  });

  if (loadState.kind === "loading") {
    return (
      <View className="flex-1 items-center justify-center bg-light-background dark:bg-dark-background">
        <ActivityIndicator size="large" colorClassName="accent-light-tint dark:accent-dark-tint" />
      </View>
    );
  }

  if (loadState.kind === "forbidden") {
    return (
      <View className="flex-1 bg-light-background dark:bg-dark-background">
        <CatalystEmptyState title="この投稿のメタデータは編集できません" />
      </View>
    );
  }

  if (loadState.kind === "error") {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-light-background px-6 dark:bg-dark-background">
        <CatalystEmptyState className="h-auto" title="メタデータを読み込めませんでした" />
        <CatalystButton tone="secondary" onPress={() => setReloadKey((key) => key + 1)}>
          <CatalystButtonText>再読み込み</CatalystButtonText>
        </CatalystButton>
      </View>
    );
  }

  const { medias } = loadState;
  const current = items[index];

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={handleSave} disabled={!canSave} hitSlop={8} className="px-1 py-2">
              <CatalystText
                variant="subtitle"
                tone={canSave ? "tint" : "subtle"}
                className={!canSave ? "opacity-60" : undefined}
              >
                保存
              </CatalystText>
            </Pressable>
          ),
        }}
      />
      <View className="flex-1 bg-light-surface-muted dark:bg-dark-background">
        {isSubmitting && (
          <View className="absolute inset-0 z-50 items-center justify-center bg-light-overlay dark:bg-dark-overlay">
            <ActivityIndicator size="large" colorClassName="accent-light-tint dark:accent-dark-tint" />
          </View>
        )}
        <ScrollView className="flex-1">
          <PhotoPager medias={medias} index={index} onIndexChange={setIndex} />
          {medias.length >= 2 && (
            <View className="bg-light-background dark:bg-dark-surface">
              <ThumbnailStrip
                medias={medias}
                index={index}
                configured={items.map(isMetadataConfigured)}
                onSelect={setIndex}
              />
            </View>
          )}

          <View className="mt-6">
            <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
              この写真の設定
            </CatalystText>
            <View className="min-h-16 flex-row items-center bg-light-background px-5 py-3 dark:bg-dark-surface">
              <CatalystText variant="subtitle" className="mr-4 flex-1 text-[15px] font-semibold">
                自動設定されたメタデータを表示しない
              </CatalystText>
              <CatalystSwitch value={current?.privacyMetadata ?? false} onValueChange={handleTogglePrivacy} />
            </View>
            <CatalystText variant="caption" tone="subtle" className="px-5 pt-2 leading-4">
              {HIDE_AUTO_DESCRIPTION}
            </CatalystText>
          </View>

          {medias.length >= 2 && (
            <View className="px-5 py-6">
              <CatalystButton tone="secondary" onPress={() => applyToAllSheetRef.current?.open()}>
                <CatalystButtonIcon>
                  <UniCopy />
                </CatalystButtonIcon>
                <CatalystButtonText>すべての写真に適用…</CatalystButtonText>
              </CatalystButton>
            </View>
          )}
        </ScrollView>
      </View>
      <ApplyToAllSheet ref={applyToAllSheetRef} options={APPLY_TO_ALL_OPTIONS} onSelect={handleApplyToAll} />
    </>
  );
}
