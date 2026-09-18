import type { Scene } from "../scenes/scene";
import { Compose } from "./compose";
import { Settings } from "./settings";
import { StatusDetail } from "./status";
import { UserProfile } from "./user";

// 詳細ペイン・スタック・別ウィンドウのいずれからでも同じ中身を表示する
export const SceneContent = ({ scene }: { scene: Scene }) => {
  switch (scene.type) {
    case "status":
      return <StatusDetail id={scene.id} />;
    case "user":
      return <UserProfile screenName={scene.screenName} />;
    case "compose":
      return <Compose replyTo={scene.replyTo} />;
    case "settings":
      return <Settings />;
    case "main":
      return null;
  }
};
