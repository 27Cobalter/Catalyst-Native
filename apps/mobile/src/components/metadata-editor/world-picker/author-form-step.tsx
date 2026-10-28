import { CatalystDivider, CatalystListItem, CatalystText, CatalystTextField } from "@/components/design-system";
import { clientAtom } from "@/models/atoms/credential";
import type { EpicleseAuthorResponse, EpiclesePlatformResponse } from "@natsuneko-laboratory/catalyst-sdk";
import { useAtomValue } from "jotai";
import { Check } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Alert, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { withUniwind } from "uniwind";

import { PickerHeader } from "../picker-header";
import { FormField } from "./form-field";
import { getAuthorIdPlaceholder } from "./placeholders";
import { TEXT_INPUT_CLASS_NAME } from "./world-form-step";

const UniCheck = withUniwind(Check);
const UniKeyboardAwareScrollView = withUniwind(KeyboardAwareScrollView);

const PLATFORM_DESCRIPTION =
  "この作者が所属するプラットフォームを選択します。写真自体のプラットフォームと異なっていても構いません（例：BOOTH のショップのみを持つ作者）";

type Props = {
  platform: EpiclesePlatformResponse;
  platforms: EpiclesePlatformResponse[];
  onBack: () => void;
  onSaved: (author: EpicleseAuthorResponse) => void;
};

export const AuthorFormStep = ({ platform, platforms, onBack, onSaved }: Props) => {
  const client = useAtomValue(clientAtom);
  const insets = useSafeAreaInsets();
  // null は「なし (BOOTH のショップなど)」。VR-SNS のアカウントを持たない作者を表す
  const [platformId, setPlatformId] = useState<string | null>(platform.id);
  const [name, setName] = useState("");
  const [platformIdentifier, setPlatformIdentifier] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const canSave = name.trim() !== "" && platformIdentifier.trim() !== "" && !isSaving;
  const selectedPlatform = platforms.find((item) => item.id === platformId);

  const handleSave = useCallback(async () => {
    if (!canSave) return;

    setIsSaving(true);
    try {
      const { data } = await client.epiclese.v1.authors.create({
        body: {
          name: name.trim(),
          platformIdentifier: platformIdentifier.trim(),
          ...(platformId ? { platform: platformId } : {}),
        },
        throwOnError: true,
      });
      onSaved(data.author);
    } catch (error) {
      console.error("Failed to create author:", error);
      Alert.alert("エラー", "作者情報の保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  }, [canSave, client, name, onSaved, platformId, platformIdentifier]);

  // BottomSheetModal はルートのポータルに描画され、このモーダルの裏に出てしまうので、選択肢はその場に並べる
  const options = [
    ...platforms.map((item) => ({ id: item.id as string | null, label: item.name })),
    { id: null, label: "なし（BOOTH のショップなど）" },
  ];

  return (
    <>
      <PickerHeader
        title="作者情報を入力"
        left={{ label: "戻る", onPress: onBack, disabled: isSaving }}
        right={{ label: "保存", onPress: handleSave, disabled: !canSave }}
      />
      <UniKeyboardAwareScrollView
        bottomOffset={24}
        contentContainerClassName="gap-6 py-5"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2">
          <View className="gap-1 px-5">
            <CatalystText variant="label">プラットフォーム</CatalystText>
            <CatalystText variant="caption" tone="muted" className="leading-4">
              {PLATFORM_DESCRIPTION}
            </CatalystText>
          </View>
          <View>
            {options.map((option, i) => (
              <View key={option.id ?? "none"}>
                {i > 0 && <CatalystDivider className="ml-5 w-auto" />}
                <CatalystListItem
                  divided={false}
                  accessibilityRole="button"
                  accessibilityState={{ selected: option.id === platformId }}
                  onPress={() => setPlatformId(option.id)}
                  className="min-h-12 px-5"
                >
                  <CatalystText className="flex-1 text-base">{option.label}</CatalystText>
                  {option.id === platformId && <UniCheck size={20} className="text-light-tint dark:text-dark-tint" />}
                </CatalystListItem>
              </View>
            ))}
          </View>
        </View>
        <View className="gap-6 px-5">
          <FormField label="作者名">
            <CatalystTextField value={name} onChangeText={setName} className={TEXT_INPUT_CLASS_NAME} />
          </FormField>
          <FormField label="ユーザー ID">
            <CatalystTextField
              value={platformIdentifier}
              onChangeText={setPlatformIdentifier}
              placeholder={getAuthorIdPlaceholder(selectedPlatform)}
              autoCapitalize="none"
              autoCorrect={false}
              className={TEXT_INPUT_CLASS_NAME}
            />
          </FormField>
        </View>
        {/* 末尾の入力欄がホームインジケーターに重ならないよう、下の安全領域ぶん余白を取る */}
        <View style={{ height: insets.bottom }} />
      </UniKeyboardAwareScrollView>
    </>
  );
};
