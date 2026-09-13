import { fireEvent, render, screen } from "@testing-library/react-native";
import { CatalystToastCard } from "./toast";

// Icon drawing is native-library behavior; these tests cover the card's content and actions.
jest.mock("lucide-react-native", () => {
  const { View } = require("react-native");
  return { Check: View, CircleAlert: View, Info: View, TriangleAlert: View, X: View };
});

describe("CatalystToastCard", () => {
  it.each(["success", "error", "info", "warning"] as const)(
    "renders %s without truncating messages",
    async (variant) => {
      await render(
        <CatalystToastCard
          variant={variant}
          text1="保存しました"
          text2="長い説明文も省略せずに表示します。"
          hide={jest.fn()}
          onPress={jest.fn()}
        />,
      );
      expect(screen.getByText("保存しました").props.numberOfLines).toBeUndefined();
      expect(screen.getByText("長い説明文も省略せずに表示します。").props.numberOfLines).toBeUndefined();
    },
  );

  it("keeps dismissal separate from the toast action", async () => {
    const hide = jest.fn();
    const onPress = jest.fn();
    await render(<CatalystToastCard variant="success" text1="保存しました" hide={hide} onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "通知を閉じる" }));
    expect(hide).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText("成功。保存しました"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("supports a description without a title", async () => {
    await render(<CatalystToastCard variant="info" text2="お知らせの本文" hide={jest.fn()} onPress={jest.fn()} />);
    expect(screen.getByText("お知らせの本文")).toBeOnTheScreen();
    expect(screen.getByLabelText("お知らせ。お知らせの本文").props.accessibilityLiveRegion).toBe("polite");
  });
});
