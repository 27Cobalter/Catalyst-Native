import { toEditableWorld, type EditableWorld } from "@/models/epiclese-metadata-editor";
import type { EpiclesePlatformResponse, EpicleseWorldResponse } from "@natsuneko-laboratory/catalyst-sdk";
import { useCallback, useEffect, useState } from "react";
import { Modal, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

import { AuthorFormStep } from "./author-form-step";
import { AuthorSearchStep } from "./author-search-step";
import { EMPTY_WORLD_DRAFT, WorldFormStep, type WorldDraft } from "./world-form-step";
import { WorldSearchStep } from "./world-search-step";

const UniSafeAreaView = withUniwind(SafeAreaView);

type Step = "world-search" | "world-form" | "author-search" | "author-form";

type Props = {
  visible: boolean;
  platform: EpiclesePlatformResponse;
  platforms: EpiclesePlatformResponse[];
  value: EditableWorld | undefined;
  onCancel: () => void;
  onSelect: (world: EditableWorld | undefined) => void;
};

// ワールドの検索と、見つからないときの登録 (作者の検索・登録を含む) をモーダルの中で行き来する。
// 登録フォームの入力はここで持ち、作者を選びに行って戻っても消えないようにする
export const WorldPickerModal = ({ visible, platform, platforms, value, onCancel, onSelect }: Props) => {
  const [step, setStep] = useState<Step>("world-search");
  const [draft, setDraft] = useState<WorldDraft>(EMPTY_WORLD_DRAFT);

  useEffect(() => {
    if (!visible) return;

    setStep("world-search");
    setDraft(EMPTY_WORLD_DRAFT);
  }, [visible]);

  const handleSelectWorld = useCallback((world: EpicleseWorldResponse) => onSelect(toEditableWorld(world)), [onSelect]);

  // Android の戻る操作はモーダル全体ではなく 1 つ前のステップに戻す (登録の入力を失わないように)
  const handleRequestClose = useCallback(() => {
    switch (step) {
      case "author-form":
        return setStep("author-search");
      case "author-search":
        return setStep("world-form");
      case "world-form":
        return setStep("world-search");
      case "world-search":
        return onCancel();
    }
  }, [onCancel, step]);

  return (
    <Modal
      testID="world-picker-modal"
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleRequestClose}
    >
      {/* Android では pageSheet が効かず全画面表示になり、edge-to-edge でステータスバーの裏まで描画されるので上端と左右を避ける。
          下端は一覧ごとにホームインジケーターぶんの余白を取っている。iOS はシート表示なので避けない */}
      <UniSafeAreaView
        edges={Platform.OS === "android" ? ["top", "left", "right"] : []}
        className="flex-1 bg-light-background dark:bg-dark-background"
      >
        {step === "world-search" && (
          <WorldSearchStep
            platform={platform}
            value={value}
            onCancel={onCancel}
            onSelect={handleSelectWorld}
            onClear={() => onSelect(undefined)}
            onRegister={() => setStep("world-form")}
          />
        )}
        {step === "world-form" && (
          <WorldFormStep
            platform={platform}
            draft={draft}
            onChange={setDraft}
            onBack={() => setStep("world-search")}
            onPickAuthor={() => setStep("author-search")}
            onSaved={handleSelectWorld}
          />
        )}
        {step === "author-search" && (
          <AuthorSearchStep
            platform={platform}
            onBack={() => setStep("world-form")}
            onSelect={(author) => {
              setDraft((prev) => ({ ...prev, author }));
              setStep("world-form");
            }}
            onRegister={() => setStep("author-form")}
          />
        )}
        {step === "author-form" && (
          <AuthorFormStep
            platform={platform}
            platforms={platforms}
            onBack={() => setStep("author-search")}
            onSaved={(author) => {
              setDraft((prev) => ({ ...prev, author }));
              setStep("world-form");
            }}
          />
        )}
      </UniSafeAreaView>
    </Modal>
  );
};
