import { fireEvent, render, screen } from "@testing-library/react-native";
import { createStore, Provider } from "jotai";
import { Alert } from "react-native";

import type { DenormalizedRecords } from "@/lib/photo-metadata-records";
import { accountAtom } from "@/models/atoms/account";

import { ImportConfirmContent } from "./import-confirm-content";

jest.mock("lucide-react-native", () => new Proxy({}, { get: () => () => null }));
jest.mock("expo-image", () => ({ Image: () => null }));
// design-system の index 経由で読まれる reanimated は jest 環境で初期化できないので、使わない部品ごと差し替える
jest.mock("@/components/design-system/switch", () => ({ CatalystSwitch: () => null }));
jest.mock("@/components/design-system/tabs", () => ({ CatalystTabs: () => null, usePagerGestures: () => ({}) }));

const records: DenormalizedRecords = {
  LocationName: "Home",
  TakenBy: { value: "Neko", referenceId: "U-neko", referenceType: "author" },
  Platform: "Resonite",
};

const renderContent = async ({
  hidesAutoMetadata = false,
  create = jest.fn(async () => ({ data: { additionalData: {}, additionalData2: {} } })),
}: { hidesAutoMetadata?: boolean; create?: jest.Mock } = {}) => {
  const client = { epiclese: { v1: { media: { mediaId: { denormalizedMetadata: { create } } } } } };
  const store = createStore();
  store.set(accountAtom, { user: { id: "me" }, credential: { client } } as never);
  const onApplied = jest.fn();
  const onCancel = jest.fn();

  await render(
    <Provider store={store}>
      <ImportConfirmContent
        mediaId="m1"
        records={records}
        hidesAutoMetadata={hidesAutoMetadata}
        onApplied={onApplied}
        onCancel={onCancel}
      />
    </Provider>,
  );

  return { create, onApplied, onCancel };
};

let alert: jest.SpyInstance;

beforeEach(() => {
  alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

afterEach(() => {
  alert.mockRestore();
});

describe("ImportConfirmContent", () => {
  it("付与を押したときだけ API を呼ぶ", async () => {
    const { create, onApplied } = await renderContent();
    expect(create).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText("この写真に付与"));

    expect(create).toHaveBeenCalledWith({ path: { mediaId: "m1" }, body: { records }, throwOnError: true });
    expect(onApplied).toHaveBeenCalledTimes(1);
  });

  it("キャンセルでは API を呼ばない", async () => {
    const { create, onCancel } = await renderContent();

    await fireEvent.press(screen.getByText("キャンセル"));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(create).not.toHaveBeenCalled();
  });

  it("失敗したら閉じずに Alert を出す", async () => {
    const { onApplied } = await renderContent({ create: jest.fn(async () => Promise.reject(new Error("boom"))) });

    await fireEvent.press(screen.getByText("この写真に付与"));

    expect(alert).toHaveBeenCalledWith("エラー", "メタデータの取得に失敗しました。");
    expect(onApplied).not.toHaveBeenCalled();
    expect(screen.getByText("この写真に付与")).toBeOnTheScreen();
  });

  it("表示しない設定が ON なら注意を出す", async () => {
    await renderContent({ hidesAutoMetadata: true });
    expect(screen.getByText("表示しない設定が ON のため、付与しても投稿には表示されません")).toBeOnTheScreen();
  });

  it("表示しない設定が OFF なら注意を出さない", async () => {
    await renderContent();
    expect(screen.queryByText("表示しない設定が ON のため、付与しても投稿には表示されません")).toBeNull();
  });

  it("検出した項目を並べる", async () => {
    await renderContent();

    expect(screen.getByText("撮影場所")).toBeOnTheScreen();
    expect(screen.getByText("Home")).toBeOnTheScreen();
  });
});
