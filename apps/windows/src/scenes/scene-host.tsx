import { useNavigation } from "@natsuneko-laboratory/react-native-desktop-navigation/native";
import { createContext, useCallback, useContext } from "react";
import { navigateToScene, type RootNavigation } from "../navigation";
import type { Scene } from "./scene";
import { closeSceneWindow, openSceneWindow } from "./window-manager";

type SceneHost = {
  // 詳細ペインを表示できる幅があれば開いて true を返す
  openInPane?: (scene: Scene) => boolean;
  closePane?: () => void;
  // 詳細ペインに表示中のシーン (リストの選択状態の表示に使う)
  paneScene?: Scene | null;
  // 別ウィンドウとして開かれている場合の native 側の ID
  windowId?: number;
};

export const SceneHostContext = createContext<SceneHost>({});

export const useSceneHost = () => useContext(SceneHostContext);

// どこに開くか:
// - auto: 詳細ペインが使えればペイン、そうでなければスタックに積む (投稿作成だけは別ウィンドウを優先する)
// - window: 別ウィンドウ (非対応環境ではスタック)
// - stack: 現在のウィンドウのスタック
export type SceneTarget = "auto" | "window" | "stack";

export const useOpenScene = () => {
  const navigation = useNavigation<RootNavigation>();
  const { openInPane } = useSceneHost();

  return useCallback(
    (scene: Scene, target: SceneTarget = "auto") => {
      if (target === "window" || (target === "auto" && scene.type === "compose")) {
        if (openSceneWindow(scene)) return;
      }
      if (target === "auto" && openInPane?.(scene)) return;
      navigateToScene(navigation, scene);
    },
    [navigation, openInPane],
  );
};

// 別ウィンドウなら閉じ、メインウィンドウ内ならスタックを戻る
export const useDismissScene = () => {
  const navigation = useNavigation<RootNavigation>();
  const { windowId } = useSceneHost();

  return useCallback(() => {
    if (windowId != null && !navigation.canGoBack()) {
      closeSceneWindow(windowId);
      return;
    }
    navigation.goBack();
  }, [navigation, windowId]);
};
