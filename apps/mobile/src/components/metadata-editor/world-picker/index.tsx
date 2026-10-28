import { toEditableWorld, type EditableWorld } from "@/models/epiclese-metadata-editor";
import type { EpiclesePlatformResponse } from "@natsuneko-laboratory/catalyst-sdk";
import { useEffect, useState } from "react";
import { Modal, View } from "react-native";

import { WorldSearchStep } from "./world-search-step";

type Step = "world-search" | "world-form" | "author-search" | "author-form";

type Props = {
  visible: boolean;
  platform: EpiclesePlatformResponse;
  platforms: EpiclesePlatformResponse[];
  value: EditableWorld | undefined;
  onCancel: () => void;
  onSelect: (world: EditableWorld | undefined) => void;
};

// ワールドの検索と、見つからないときの登録 (作者の検索・登録を含む) をモーダルの中で行き来する
export const WorldPickerModal = ({ visible, platform, value, onCancel, onSelect }: Props) => {
  const [step, setStep] = useState<Step>("world-search");

  useEffect(() => {
    if (visible) setStep("world-search");
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <View className="flex-1 bg-light-background dark:bg-dark-background">
        {step === "world-search" && (
          <WorldSearchStep
            platform={platform}
            value={value}
            onCancel={onCancel}
            onSelect={(world) => onSelect(toEditableWorld(world))}
            onClear={() => onSelect(undefined)}
            onRegister={() => {}}
          />
        )}
      </View>
    </Modal>
  );
};
