import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { createStore, Provider } from "jotai";

import { accountAtom } from "@/models/atoms/account";

import { WorldPickerModal } from ".";

jest.mock("lucide-react-native", () => new Proxy({}, { get: () => () => null }));
jest.mock("expo-image", () => ({ Image: () => null }));
// design-system の index 経由で読まれる reanimated は jest 環境で初期化できないので、使わない部品ごと差し替える
jest.mock("@/components/design-system/switch", () => ({ CatalystSwitch: () => null }));
jest.mock("@/components/design-system/tabs", () => ({ CatalystTabs: () => null, usePagerGestures: () => ({}) }));

const platform = { id: "p-vrchat", name: "VRChat", description: "", url: null, startAt: null };
const author = { id: "a-1", platformIdentifier: "usr_1", platform, name: "Author" };

const renderPicker = async () => {
  const client = {
    epiclese: {
      v1: {
        worlds: { get: jest.fn(async () => ({ data: { items: [] } })), create: jest.fn() },
        authors: { get: jest.fn(async () => ({ data: { items: [author] } })) },
      },
    },
  };
  const store = createStore();
  store.set(accountAtom, { user: { id: "me" }, credential: { client } } as never);

  await render(
    <Provider store={store}>
      <WorldPickerModal
        visible
        platform={platform}
        platforms={[platform]}
        value={undefined}
        onCancel={jest.fn()}
        onSelect={jest.fn()}
      />
    </Provider>,
  );
  await act(async () => {
    jest.advanceTimersByTime(300);
  });

  return { client };
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("WorldPickerModal", () => {
  it("作者を選びに行って戻っても、登録フォームの入力を保持する", async () => {
    await renderPicker();

    await fireEvent.press(screen.getByText("見つからない場合はワールドを登録"));
    await fireEvent.changeText(screen.getByPlaceholderText("Avatar Testing Chamber"), "Home");
    await fireEvent.changeText(screen.getByPlaceholderText("wrld_a5e9ec13-36b1-4e63-ae0c-dab9023401f9"), "wrld_1");

    await fireEvent.press(screen.getByText("未選択"));
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await fireEvent.press(screen.getByText("Author"));

    expect(screen.getByDisplayValue("Home")).toBeOnTheScreen();
    expect(screen.getByDisplayValue("wrld_1")).toBeOnTheScreen();
    expect(screen.getByText("Author")).toBeOnTheScreen();
  });
});
