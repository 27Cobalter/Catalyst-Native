// VRChat のワールド制作者を、ワールド ID から VRChat API に問い合わせて取得する。
//
// 撮影メタデータ (VRChat の XMP / VRCX) にもサーバーの Epiclese メタデータにも制作者は入っていないため、
// 共有テキストに載せたいときはクライアントから直接引く。`/api/1/worlds/:id` は認証なしで引けるが、
// 非公式 API なので取れなかったときは黙って諦め、呼び出し元は制作者なしで扱う。

// 同じワールドの写真を続けて開いても問い合わせないよう、アプリ起動中は結果を覚えておく。
// 失敗 (null) も覚えるのは、プライベートワールドや削除済みワールドを開くたびに叩き直さないため。
// 通信失敗も覚えてしまうが、アプリを起動し直せば問い合わせ直す
const cache = new Map<string, Promise<string | null>>();

/** ワールドの制作者名を返す。ID が不正・非公開・削除済み・通信失敗のときは null */
export const fetchVRChatWorldAuthorName = (worldId: string): Promise<string | null> => {
  if (!worldId.startsWith("wrld_")) return Promise.resolve(null);

  const cached = cache.get(worldId);
  if (cached) return cached;

  const request = fetch(`https://api.vrchat.cloud/api/1/worlds/${worldId}`, {
    // VRChat API は RN Android 既定の User-Agent (okhttp/x.y.z) を 403 で弾くので、汎用的なものを明示する
    headers: { "User-Agent": "Mozilla/5.0" },
  })
    .then(async (res) => (res.ok ? ((await res.json()) as { authorName?: string }).authorName || null : null))
    .catch(() => null);

  cache.set(worldId, request);
  return request;
};
