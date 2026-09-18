import { TurboModuleRegistry, type TurboModule } from "react-native";
import { getSceneTitle, getSceneWindowSize, serializeScene, type Scene } from "./scene";

// windows/Catalyst/WindowManager.h で実装している native module
interface Spec extends TurboModule {
  openWindow(scene: string, title: string, width: number, height: number): void;
  closeWindow(windowId: number): void;
  setWindowTitle(windowId: number, title: string): void;
}

const NativeWindowManager = TurboModuleRegistry.get<Spec>("WindowManager");

// native module が無い環境 (Jest や古いビルド) では別ウィンドウを使わずにアプリ内で開く
export const isMultiWindowSupported = NativeWindowManager != null;

export const openSceneWindow = (scene: Scene) => {
  if (!NativeWindowManager) return false;

  const { width, height } = getSceneWindowSize(scene);
  const title = scene.type === "main" ? "Catalyst" : `${getSceneTitle(scene)} - Catalyst`;
  NativeWindowManager.openWindow(serializeScene(scene), title, width, height);
  return true;
};

export const closeSceneWindow = (windowId: number) => {
  NativeWindowManager?.closeWindow(windowId);
};

export const setSceneWindowTitle = (windowId: number, title: string) => {
  NativeWindowManager?.setWindowTitle(windowId, `${title} - Catalyst`);
};
