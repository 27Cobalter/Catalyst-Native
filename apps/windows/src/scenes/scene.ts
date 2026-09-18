// メインウィンドウのスタック・詳細ペイン・別ウィンドウのどこにでも表示できる画面の単位。
// 別ウィンドウへは native 境界を越えて渡すため、シリアライズ可能な値だけを持たせる
export type Scene =
  | { type: "main" }
  | { type: "status"; id: string }
  | { type: "user"; screenName: string }
  | { type: "compose"; replyTo?: string }
  | { type: "settings" };

export const serializeScene = (scene: Scene) => JSON.stringify(scene);

export const parseScene = (value: unknown): Scene => {
  if (typeof value !== "string") return { type: "main" };

  try {
    const scene = JSON.parse(value) as Scene;
    return typeof scene?.type === "string" ? scene : { type: "main" };
  } catch {
    return { type: "main" };
  }
};

export const getSceneTitle = (scene: Scene) => {
  switch (scene.type) {
    case "main":
      return "Catalyst";
    case "status":
      return "投稿";
    case "user":
      return `@${scene.screenName}`;
    case "compose":
      return scene.replyTo ? "返信する" : "新規投稿";
    case "settings":
      return "設定";
  }
};

// 別ウィンドウで開くときの初期サイズ (DIP)。native 側でモニターの拡大率を掛けて物理ピクセルに変換する
export const getSceneWindowSize = (scene: Scene) => {
  switch (scene.type) {
    case "main":
      return { width: 1280, height: 820 };
    case "compose":
      return { width: 560, height: 480 };
    case "settings":
      return { width: 960, height: 720 };
    default:
      return { width: 600, height: 820 };
  }
};
