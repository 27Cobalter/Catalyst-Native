import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { createStore, Provider } from "jotai";

import { accountAtom } from "@/models/atoms/account";
import type { UserProfile } from "@/models/epiclese-metadata-editor";

import { UserPickerModal } from "./user-picker-modal";

jest.mock("lucide-react-native", () => new Proxy({}, { get: () => () => null }));
jest.mock("expo-image", () => ({ Image: () => null }));
// design-system の index 経由で読まれる reanimated は jest 環境で初期化できないので、使わない部品ごと差し替える
jest.mock("@/components/design-system/switch", () => ({ CatalystSwitch: () => null }));
jest.mock("@/components/design-system/tabs", () => ({ CatalystTabs: () => null, usePagerGestures: () => ({}) }));

const searchResult = (id: string, displayName: string) => ({
  id,
  screenName: id,
  displayName,
  profile: { iconUrl: `https://example.com/${id}.png`, bannerUrl: "", bio: "", website: "", additionalWebsites: [] },
});

const renderPicker = async ({
  users = [] as { id: string }[],
  profiles = {} as Record<string, UserProfile>,
  results = [] as ReturnType<typeof searchResult>[],
} = {}) => {
  const client = { egeria: { v1: { search: { get: jest.fn(async () => ({ data: { users: results } })) } } } };
  const store = createStore();
  store.set(accountAtom, { user: { id: "me" }, credential: { client } } as never);
  const onCancel = jest.fn();
  const onDone = jest.fn();

  await render(
    <Provider store={store}>
      <UserPickerModal visible users={users} profiles={profiles} onCancel={onCancel} onDone={onDone} />
    </Provider>,
  );

  return { onCancel, onDone };
};

const search = async (q: string) => {
  await fireEvent.changeText(screen.getByPlaceholderText("表示名やユーザー名で検索..."), q);
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("UserPickerModal", () => {
  it("11 人目は追加せず、上限のメッセージを出す", async () => {
    const users = Array.from({ length: 10 }, (_, i) => ({ id: `u${i + 1}` }));
    const { onDone } = await renderPicker({ users, results: [searchResult("u11", "Eleven")] });

    await search("ele");
    await fireEvent.press(screen.getByText("Eleven"));

    expect(screen.getByText("最大 10 人まで選べます")).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("完了"));
    expect(onDone.mock.calls[0][0]).toEqual(users);
  });

  it("キャンセルでは反映しない", async () => {
    const { onCancel, onDone } = await renderPicker({ results: [searchResult("u1", "One")] });

    await search("one");
    await fireEvent.press(screen.getByText("One"));
    await fireEvent.press(screen.getByText("キャンセル"));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onDone).not.toHaveBeenCalled();
  });

  it("完了で選んだ人と表示用の情報を返す", async () => {
    const { onDone } = await renderPicker({ results: [searchResult("u1", "One")] });

    await search("one");
    await fireEvent.press(screen.getByText("One"));
    await fireEvent.press(screen.getByText("完了"));

    expect(onDone).toHaveBeenCalledWith([{ id: "u1" }], {
      u1: { displayName: "One", screenName: "u1", iconUrl: "https://example.com/u1.png" },
    });
  });
});
