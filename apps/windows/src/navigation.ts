import type { Navigation } from "@natsuneko-laboratory/react-native-desktop-navigation/native";
import type { Scene } from "./scenes/scene";

// メインウィンドウ・別ウィンドウで共通のルートスタック
export type RootParams = {
  Main: undefined;
  Status: { id: string };
  User: { screenName: string };
  Compose: { replyTo?: string };
  Settings: undefined;
};

export type SidebarParams = {
  Home: undefined;
  Explorer: undefined;
  Notifications: undefined;
  Contests: undefined;
  Theme: undefined;
  Gallery: undefined;
};

// ネストした Navigator からの navigate は親へ伝搬してルートスタックで処理されるため、ルートの型として扱う
export type RootNavigation = Navigation<RootParams>;

export const navigateToScene = (navigation: RootNavigation, scene: Scene) => {
  switch (scene.type) {
    case "main":
      return navigation.navigate("Main");
    case "status":
      return navigation.navigate("Status", { id: scene.id });
    case "user":
      return navigation.navigate("User", { screenName: scene.screenName });
    case "compose":
      return navigation.navigate("Compose", { replyTo: scene.replyTo });
    case "settings":
      return navigation.navigate("Settings");
  }
};
