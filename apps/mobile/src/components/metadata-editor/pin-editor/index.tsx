import {
  addPin,
  findInvalidPinIndex,
  isPinUntouched,
  MAX_PINS,
  movePin,
  movePinDown,
  movePinUp,
  removePin,
  type EditablePin,
} from "@/models/epiclese-pin-editor";
import type { Media } from "@/models/sdk-types";
import type { EpiclesePlatformResponse } from "@natsuneko-laboratory/catalyst-sdk";
import { useCallback, useEffect, useState } from "react";
import { Alert, Modal, ScrollView } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { withUniwind } from "uniwind";

import { PickerHeader } from "../picker-header";
import { PinCanvas } from "./pin-canvas";
import { PinList } from "./pin-list";

const UniGestureHandlerRootView = withUniwind(GestureHandlerRootView);

type Step = "canvas" | "item-search" | "item-create" | "author-filter" | "author-search" | "author-form";

type Props = {
  visible: boolean;
  media: Media;
  pins: EditablePin[];
  platform: EpiclesePlatformResponse | undefined;
  platforms: EpiclesePlatformResponse[];
  onCancel: () => void;
  onDone: (pins: EditablePin[]) => void;
};

// 1 枚の写真のピンを編集する。「完了」まで編集画面には反映しないので、開いている間は下書きを持つ
export const PinEditorModal = ({ visible, media, pins, onCancel, onDone }: Props) => {
  const [draft, setDraft] = useState(pins);
  const [step, setStep] = useState<Step>("canvas");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return;

    setDraft(pins);
    setStep("canvas");
    setActiveIndex(null);
    // 開いた時点の値から始めればよく、開いている間に親の値が変わっても下書きは作り直さない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const openPin = useCallback((index: number) => {
    setActiveIndex(index);
    setStep("item-search");
  }, []);

  const handleAdd = useCallback(
    (point: { x: number; y: number }) => {
      const next = addPin(draft, point);
      if (next.limited) {
        Alert.alert("エラー", `写真1枚につき最大${MAX_PINS}件までピンを設定できます`);
        return;
      }

      setDraft(next.pins);
      openPin(next.pins.length - 1);
    },
    [draft, openPin],
  );

  // フォームからピン編集画面に戻る。新しく足したまま何も入力していないピンは捨てる (Web 版と同じ)
  const backToCanvas = useCallback(() => {
    setDraft((prev) =>
      activeIndex !== null && prev[activeIndex] && isPinUntouched(prev[activeIndex])
        ? removePin(prev, activeIndex)
        : prev,
    );
    setActiveIndex(null);
    setStep("canvas");
  }, [activeIndex]);

  const handleDone = useCallback(() => {
    const invalidIndex = findInvalidPinIndex(draft);
    if (invalidIndex !== -1) {
      Alert.alert("エラー", `${invalidIndex + 1} 番のピンの入力が足りません`);
      return;
    }

    onDone(draft);
  }, [draft, onDone]);

  const handleRequestClose = useCallback(() => {
    if (step === "canvas") {
      onCancel();
      return;
    }

    backToCanvas();
  }, [backToCanvas, onCancel, step]);

  return (
    <Modal
      testID="pin-editor-modal"
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleRequestClose}
    >
      <UniGestureHandlerRootView className="flex-1 bg-light-background dark:bg-dark-background">
        {step === "canvas" ? (
          <>
            <PickerHeader
              title={`ピン ${draft.length}/${MAX_PINS}`}
              left={{ label: "キャンセル", onPress: onCancel }}
              right={{ label: "完了", onPress: handleDone }}
            />
            <ScrollView>
              <PinCanvas
                media={media}
                pins={draft}
                activeIndex={activeIndex}
                onAdd={handleAdd}
                onSelect={openPin}
                onMove={(index, point) => setDraft((prev) => movePin(prev, index, point))}
              />
              <PinList
                pins={draft}
                onSelect={openPin}
                onMoveUp={(index) => setDraft((prev) => movePinUp(prev, index))}
                onMoveDown={(index) => setDraft((prev) => movePinDown(prev, index))}
                onRemove={(index) => setDraft((prev) => removePin(prev, index))}
              />
            </ScrollView>
          </>
        ) : (
          <PickerHeader title="アイテムを選択" left={{ label: "戻る", onPress: backToCanvas }} />
        )}
      </UniGestureHandlerRootView>
    </Modal>
  );
};
