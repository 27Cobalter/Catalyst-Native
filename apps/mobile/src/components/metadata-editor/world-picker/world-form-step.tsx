import { CatalystTextField } from "@/components/design-system";
import { clientAtom } from "@/models/atoms/credential";
import type {
  EpicleseAuthorResponse,
  EpiclesePlatformResponse,
  EpicleseWorldResponse,
} from "@natsuneko-laboratory/catalyst-sdk";
import { useAtomValue } from "jotai";
import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { withUniwind } from "uniwind";

import { MetadataRow } from "../metadata-row";
import { PickerHeader } from "../picker-header";
import { FormField } from "./form-field";
import { getWorldIdPlaceholder } from "./placeholders";

const UniKeyboardAwareScrollView = withUniwind(KeyboardAwareScrollView);

export type WorldDraft = {
  name: string;
  platformIdentifier: string;
  author: EpicleseAuthorResponse | null;
};

export const EMPTY_WORLD_DRAFT: WorldDraft = { name: "", platformIdentifier: "", author: null };

export const TEXT_INPUT_CLASS_NAME = "rounded-lg bg-light-surface-muted px-3 py-2.5 dark:bg-dark-surface-muted";

type Props = {
  platform: EpiclesePlatformResponse;
  draft: WorldDraft;
  onChange: (draft: WorldDraft) => void;
  onBack: () => void;
  onPickAuthor: () => void;
  onSaved: (world: EpicleseWorldResponse) => void;
};

// 入力中の値は親 (モーダル) が持つ。作者を選びに行って戻っても消えないようにするため
export const WorldFormStep = ({ platform, draft, onChange, onBack, onPickAuthor, onSaved }: Props) => {
  const client = useAtomValue(clientAtom);
  const [isSaving, setIsSaving] = useState(false);
  const canSave = draft.name.trim() !== "" && draft.platformIdentifier.trim() !== "" && !isSaving;

  const handleSave = useCallback(async () => {
    if (!canSave) return;

    setIsSaving(true);
    try {
      const { author } = draft;
      const { data } = await client.epiclese.v1.worlds.create({
        body: {
          name: draft.name.trim(),
          platformIdentifier: draft.platformIdentifier.trim(),
          platform: platform.id,
          author: author
            ? {
                id: author.id,
                name: author.name,
                platformIdentifier: author.platformIdentifier,
                platform: author.platform?.id,
              }
            : null,
        },
        throwOnError: true,
      });
      // サーバーは ID だけで既存のワールドを探すので、別のプラットフォームで登録済みのワールドが返ることがある。
      // そのまま選ぶと「cluster の写真に VRChat のワールド」のような食い違いで保存されてしまうため、選ばずに知らせる
      if (data.world.platform?.id !== platform.id) {
        Alert.alert(
          "エラー",
          `このワールドは別のプラットフォーム (${data.world.platform?.name ?? "不明"}) で登録されています。ワールドID を確認してください`,
        );
        return;
      }

      onSaved(data.world);
    } catch (error) {
      console.error("Failed to create world:", error);
      Alert.alert("エラー", "ワールド情報の保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  }, [canSave, client, draft, onSaved, platform.id]);

  return (
    <>
      <PickerHeader
        title="ワールド情報を入力"
        left={{ label: "戻る", onPress: onBack, disabled: isSaving }}
        right={{ label: "保存", onPress: handleSave, disabled: !canSave }}
      />
      <UniKeyboardAwareScrollView
        bottomOffset={24}
        contentContainerClassName="gap-6 px-5 py-5"
        keyboardShouldPersistTaps="handled"
      >
        <FormField label="ワールド名" description="ワールドの名前を正確に入力してください">
          <CatalystTextField
            value={draft.name}
            onChangeText={(name) => onChange({ ...draft, name })}
            placeholder="Avatar Testing Chamber"
            className={TEXT_INPUT_CLASS_NAME}
          />
        </FormField>
        <FormField label="ワールドID" description="ワールドID もしくは URL を入力してください。">
          <CatalystTextField
            value={draft.platformIdentifier}
            onChangeText={(platformIdentifier) => onChange({ ...draft, platformIdentifier })}
            placeholder={getWorldIdPlaceholder(platform)}
            autoCapitalize="none"
            autoCorrect={false}
            className={TEXT_INPUT_CLASS_NAME}
          />
        </FormField>
        <FormField label="ワールド作者" description="ワールドの作者を選択、もしくは入力してください。">
          <MetadataRow label="作者" value={draft.author?.name ?? "未選択"} onPress={onPickAuthor} />
        </FormField>
      </UniKeyboardAwareScrollView>
    </>
  );
};
