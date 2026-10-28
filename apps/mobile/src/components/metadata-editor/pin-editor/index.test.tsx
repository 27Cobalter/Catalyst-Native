import { fireEvent, render, screen } from "@testing-library/react-native";
import { createStore, Provider } from "jotai";
import { Alert } from "react-native";

import { accountAtom } from "@/models/atoms/account";
import type { EditablePin } from "@/models/epiclese-pin-editor";
import type { Media } from "@/models/sdk-types";

import { PinEditorModal } from ".";

jest.mock("lucide-react-native", () => new Proxy({}, { get: () => () => null }));
jest.mock("expo-image", () => ({ Image: () => null }));
// design-system の index 経由で読まれる reanimated は jest 環境で初期化できないので、使わない部品ごと差し替える
jest.mock("@/components/design-system/switch", () => ({ CatalystSwitch: () => null }));
jest.mock("@/components/design-system/tabs", () => ({ CatalystTabs: () => null, usePagerGestures: () => ({}) }));
// gesture-handler は読み込み時に worklets の UI ランタイムを初期化しようとして jest では落ちる。
// ドラッグはここでは確かめない (手動確認) ので、素通しの部品に差し替える
jest.mock("react-native-gesture-handler", () => {
  const { View } = jest.requireActual("react-native");
  const chain = (): unknown => new Proxy({}, { get: () => () => chain() });
  return {
    GestureHandlerRootView: View,
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    Gesture: { Pan: chain },
  };
});
jest.mock("react-native-keyboard-controller", () => ({
  KeyboardAwareScrollView: jest.requireActual("react-native").ScrollView,
}));

const media = { id: "m1", url: "https://example.com/m1", metadata: { width: 1000, height: 1000 } } as Media;
const platform = { id: "p-vrchat", name: "VRChat", description: "", url: null, startAt: null };
const pin = (i: number, overrides: Partial<EditablePin> = {}): EditablePin => ({
  x: 100 * i,
  y: 100 * i,
  order: i,
  type: "other",
  name: `Item ${i + 1}`,
  reference: `i-${i}`,
  ...overrides,
});
const pins = (n: number) => Array.from({ length: n }, (_, i) => pin(i));

const renderEditor = async (initialPins: EditablePin[]) => {
  const client = {
    epiclese: {
      v1: {
        items: { get: jest.fn(async () => ({ data: { items: [] } })) },
        authors: { get: jest.fn(async () => ({ data: { items: [] } })) },
      },
    },
  };
  const store = createStore();
  store.set(accountAtom, { user: { id: "me" }, credential: { client } } as never);
  const onCancel = jest.fn();
  const onDone = jest.fn();

  await render(
    <Provider store={store}>
      <PinEditorModal
        visible
        media={media}
        pins={initialPins}
        platform={platform}
        platforms={[platform]}
        onCancel={onCancel}
        onDone={onDone}
      />
    </Provider>,
  );
  await fireEvent(screen.getByTestId("pin-canvas"), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 400 } },
  });

  return { client, onCancel, onDone };
};

const tapCanvas = async (x: number, y: number) => {
  await fireEvent.press(screen.getByTestId("pin-canvas"), { nativeEvent: { locationX: x, locationY: y } });
};

let alert: jest.SpyInstance;

beforeEach(() => {
  jest.useFakeTimers();
  alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  alert.mockRestore();
});

describe("PinEditorModal", () => {
  it("21 件目は追加せず Alert を出す", async () => {
    const { onDone } = await renderEditor(pins(20));

    await tapCanvas(200, 200);
    expect(alert).toHaveBeenCalledWith("エラー", "写真1枚につき最大20件までピンを設定できます");

    await fireEvent.press(screen.getByText("完了"));
    expect(onDone.mock.calls[0][0]).toHaveLength(20);
  });

  it("入力が足りないピンがあると完了で反映しない", async () => {
    const { onDone } = await renderEditor([pin(0), pin(1, { name: "", reference: undefined })]);

    await fireEvent.press(screen.getByText("完了"));

    expect(onDone).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith("エラー", "2 番のピンの入力が足りません");
  });

  it("キャンセルでは反映しない", async () => {
    const { onCancel, onDone } = await renderEditor(pins(1));

    await fireEvent.press(screen.getByLabelText("1 番のピンを削除"));
    await fireEvent.press(screen.getByText("キャンセル"));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onDone).not.toHaveBeenCalled();
  });

  it("並べ替えると order を振り直して返す", async () => {
    const { onDone } = await renderEditor(pins(3));

    await fireEvent.press(screen.getByLabelText("3 番のピンを上へ移動"));
    await fireEvent.press(screen.getByText("完了"));

    const result: EditablePin[] = onDone.mock.calls[0][0];
    expect(result.map((item) => [item.reference, item.order])).toEqual([
      ["i-0", 0],
      ["i-2", 1],
      ["i-1", 2],
    ]);
  });
});
