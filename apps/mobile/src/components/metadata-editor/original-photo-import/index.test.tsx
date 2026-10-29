import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { createStore, Provider } from "jotai";

import type { DenormalizedRecords } from "@/lib/photo-metadata-records";
import { accountAtom } from "@/models/atoms/account";

import { OriginalPhotoImport } from ".";

jest.mock("lucide-react-native", () => new Proxy({}, { get: () => () => null }));
jest.mock("expo-image", () => ({ Image: () => null }));
// design-system の index 経由で読まれる reanimated は jest 環境で初期化できないので、使わない部品ごと差し替える
jest.mock("@/components/design-system/switch", () => ({ CatalystSwitch: () => null }));
jest.mock("@/components/design-system/tabs", () => ({ CatalystTabs: () => null, usePagerGestures: () => ({}) }));
jest.mock("react-native-toast-message", () => ({ __esModule: true, default: { show: jest.fn() } }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
// シートは開閉を問わず中身を描画する (開いたかどうかではなく、何を描画するかを確かめる)
jest.mock("@gorhom/bottom-sheet", () => {
  const { View } = jest.requireActual("react-native");
  const { forwardRef, useImperativeHandle } = jest.requireActual("react");
  return {
    BottomSheetModal: forwardRef(({ children }: { children: React.ReactNode }, ref: unknown) => {
      useImperativeHandle(ref, () => ({ present: () => {}, dismiss: () => {} }));
      return children;
    }),
    BottomSheetView: View,
    BottomSheetBackdrop: () => null,
  };
});
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: false, assets: [{ uri: "file:///original.png" }] })),
}));

const mockRead = jest.fn();
jest.mock("@/lib/photo-metadata-records", () => ({
  ...jest.requireActual("@/lib/photo-metadata-records"),
  readDenormalizedRecords: (uri: string) => mockRead(uri),
}));

const records: DenormalizedRecords = { LocationName: "Home", Platform: "Resonite" };

describe("OriginalPhotoImport", () => {
  it("解析中に写真を切り替えても、選んだときの写真に付与する", async () => {
    let resolveRead!: (value: DenormalizedRecords) => void;
    mockRead.mockReturnValue(
      new Promise<DenormalizedRecords>((resolve) => {
        resolveRead = resolve;
      }),
    );
    const create = jest.fn(async () => ({ data: { additionalData: {}, additionalData2: {} } }));
    const client = { epiclese: { v1: { media: { mediaId: { denormalizedMetadata: { create } } } } } };
    const store = createStore();
    store.set(accountAtom, { user: { id: "me" }, credential: { client } } as never);

    const ui = (mediaId: string) => (
      <Provider store={store}>
        <OriginalPhotoImport statusId="s1" mediaId={mediaId} hidesAutoMetadata={false} />
      </Provider>
    );
    const { rerender } = await render(ui("m1"));

    // 写真 1 で読み込みを始め、解析の途中で写真 2 に切り替える
    const pick = fireEvent.press(screen.getByText("元の写真から読み込む"));
    await act(async () => {});
    await rerender(ui("m2"));
    await act(async () => {
      resolveRead(records);
    });
    await pick;

    await fireEvent.press(screen.getByText("この写真に付与"));

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ path: { mediaId: "m1" } }));
  });
});
