// VRChat のワールド情報 (作成者・サムネイル) を、VRChat API を中継する miliastra (`/vrchat/v1/worlds/:id`) から取得する。
//
// 撮影メタデータ (VRChat の XMP / VRCX) にもサーバーの Epiclese メタデータにも作成者やサムネイルは入っていないため、
// Web 版と同じくここから取る。VRChat への問い合わせ結果は miliastra 側でキャッシュされるので、アプリ側では覚えておかない。

const MILIASTRA_VRCHAT_WORLDS = "https://miliastra.natsuneko.com/vrchat/v1/worlds";

const worldUrl = (worldId: string) => `${MILIASTRA_VRCHAT_WORLDS}/${encodeURIComponent(worldId)}`;

/** ワールドの作成者名を返す。非公開・削除済み・通信失敗・中断のときは null */
export const fetchVRChatWorldAuthorName = (worldId: string, signal?: AbortSignal): Promise<string | null> =>
  fetch(worldUrl(worldId), { signal })
    .then(async (res) => (res.ok ? ((await res.json()) as { authorName?: unknown }).authorName : null))
    .then((authorName) => (typeof authorName === "string" && authorName ? authorName : null))
    .catch(() => null);

/** Web 版のワールドカードと同じ、カード向けのサムネイル画像の URL */
export const vrchatWorldThumbnailUrl = (worldId: string) => `${worldUrl(worldId)}/thumbnail?variant=card`;
