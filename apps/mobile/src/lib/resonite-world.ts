// Resonite のワールドのサムネイルを、Resonite の API を中継する miliastra (`/resonite/v1/worlds/:ownerId/:id`) から取る。
// Web 版のワールドページと同じ URL。Resonite のワールドはオーナー ID (`G-…` / `U-…`) とワールド ID (`R-…`) の組で引く。

const MILIASTRA_RESONITE_WORLDS = "https://miliastra.natsuneko.com/resonite/v1/worlds";

/** Resonite のワールドか。ほかのプラットフォームの ID を問い合わせないよう、プラットフォーム名と ID の形で見分ける */
export const isResoniteWorld = (platformName: string | null | undefined, id: string) =>
  platformName?.toLowerCase() === "resonite" && id.startsWith("R-");

/** Web 版のワールドカードと同じ、カード向けのサムネイル画像の URL */
export const resoniteWorldThumbnailUrl = (ownerId: string, worldId: string) =>
  `${MILIASTRA_RESONITE_WORLDS}/${encodeURIComponent(ownerId)}/${encodeURIComponent(worldId)}/thumbnail?variant=card`;
