import { View } from "react-native";
import { useOpenScene, useSceneHost } from "../scenes/scene-host";
import { closeSceneWindow } from "../scenes/window-manager";

export const SHORTCUTS = {
  compose: "Ctrl+N",
  newWindow: "Ctrl+Shift+N",
  closeWindow: "Ctrl+W",
  settings: "Ctrl+,",
  refresh: "F5",
  closePane: "Esc",
} as const;

type Props = {
  children: React.ReactNode;
  onRefresh?: () => void;
};

// キーイベントはフォーカスのある要素から native のビュー階層をたどって伝搬する。
// サイドバーの各シーンや別ウィンドウは独立した island になるため、シーンのルートごとにこのスコープを置く
export const ShortcutScope = ({ children, onRefresh }: Props) => {
  const openScene = useOpenScene();
  const { closePane, windowId } = useSceneHost();

  return (
    <View
      className="flex-1"
      keyDownEvents={[
        { code: "KeyN", ctrlKey: true },
        { code: "KeyN", ctrlKey: true, shiftKey: true },
        { code: "KeyW", ctrlKey: true },
        { code: "Comma", ctrlKey: true },
        { code: "F5" },
        ...(closePane ? [{ code: "Escape" }] : []),
      ]}
      onKeyDown={(event) => {
        const { code, ctrlKey, shiftKey } = event.nativeEvent;

        if (ctrlKey && code === "KeyN")
          openScene(shiftKey ? { type: "main" } : { type: "compose" }, shiftKey ? "window" : "auto");
        else if (ctrlKey && code === "KeyW" && windowId != null) closeSceneWindow(windowId);
        else if (ctrlKey && code === "Comma") openScene({ type: "settings" }, "stack");
        else if (code === "F5") onRefresh?.();
        else if (code === "Escape") closePane?.();
      }}
    >
      {children}
    </View>
  );
};
