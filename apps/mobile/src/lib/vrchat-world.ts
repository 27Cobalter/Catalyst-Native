// VRChat のワールド制作者を、ワールド ID から取得する。
//
// 撮影メタデータ (VRChat の XMP / VRCX) にもサーバーの Epiclese メタデータにも制作者は入っていないため、
// Web 版と同じく VRChat API を中継する miliastra (`/vrchat/v1/worlds/:id`) に問い合わせる。
// VRChat への問い合わせ結果は miliastra 側でキャッシュされるので、アプリ側では覚えておかない。
// 取れなかったときは黙って諦め、呼び出し元は制作者なしで扱う。

// 共有シートを出すのを待たせすぎないよう、これを過ぎたら制作者なしで進める
const TIMEOUT_MS = 10000;

/** ワールドの制作者名を返す。VRChat 以外のワールド・非公開・削除済み・通信失敗・タイムアウトのときは null */
export const fetchVRChatWorldAuthorName = (worldId: string): Promise<string | null> => {
  // Resonite など VRChat 以外のワールドは問い合わせても見つからない
  if (!worldId.startsWith("wrld_")) return Promise.resolve(null);

  const request = fetch(`https://miliastra.natsuneko.com/vrchat/v1/worlds/${encodeURIComponent(worldId)}`)
    .then(async (res) => (res.ok ? ((await res.json()) as { authorName?: unknown }).authorName : null))
    .then((authorName) => (typeof authorName === "string" && authorName ? authorName : null))
    .catch(() => null);

  return Promise.race([request, new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS))]);
};
