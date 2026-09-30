// VRChat のワールド制作者を、ワールド ID から VRChat API に問い合わせて取得する。
//
// 撮影メタデータ (VRChat の XMP / VRCX) にもサーバーの Epiclese メタデータにも制作者は入っていないため、
// 共有テキストに載せたいときはクライアントから直接引く。`/api/1/worlds/:id` は認証なしで引けるが、
// 非公式 API なので取れなかったときは黙って諦め、呼び出し元は制作者なしで扱う。

// 共有シートを出すのを待たせすぎないよう、これを過ぎたら制作者なしで進める
const TIMEOUT_MS = 3000;

// 同じワールドを続けて共有しても問い合わせ直さないよう、アプリ起動中は結果を覚えておく
const cache = new Map<string, Promise<string | null>>();

/** ワールドの制作者名を返す。ID が不正・非公開・削除済み・通信失敗・タイムアウトのときは null */
export const fetchVRChatWorldAuthorName = (worldId: string): Promise<string | null> => {
  if (!worldId.startsWith("wrld_")) return Promise.resolve(null);

  const request =
    cache.get(worldId) ??
    fetch(`https://api.vrchat.cloud/api/1/worlds/${worldId}`, {
      // VRChat API は RN Android 既定の User-Agent (okhttp/x.y.z) を 403 で弾くので、汎用的なものを明示する
      headers: { "User-Agent": "Mozilla/5.0" },
    })
      .then(async (res) => (res.ok ? ((await res.json()) as { authorName?: string }).authorName || null : null))
      .catch(() => null);
  cache.set(worldId, request);

  return Promise.race([request, new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS))]);
};
