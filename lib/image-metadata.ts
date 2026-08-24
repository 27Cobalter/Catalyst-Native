// VRChat / Resonite のスクリーンショットに埋め込まれた撮影メタデータを、投稿前に端末内で読み取る。
//
// 解析そのものは [memora](https://github.com/mika-f/memora) に任せている。形式の判定条件を
// アプリ側で持ち直すとサーバー側 (steambird) と食い違うため、認識とフィールドの取り出しは
// 共有パッケージへ寄せ、ここでは画面に出す項目だけへ畳む。

// memora より先に評価される必要がある (理由は memora-polyfill.ts を参照)
import "./memora-polyfill";

import { parseImageMetadata, type ImageMetadata } from "@natsuneko-laboratory/memora";
import * as FileSystem from "expo-file-system";

/** メタデータを書き込んだツール。ResoniteScreenshotExtensions は表示上 Resonite と呼ぶ */
export type ImageMetadataSource = "VRCX" | "VRChat" | "Resonite";

export type ImageMetadataReference = {
  name: string;
  id: string;
};

/** memora の解析結果のうち、投稿画面に表示する項目だけを抜き出したもの */
export type ImageMetadataSummary = {
  source: ImageMetadataSource;
  /** 撮影プラットフォーム */
  platform: "VRChat" | "Resonite";
  world: ImageMetadataReference | null;
  author: ImageMetadataReference | null;
  /** ISO8601。Resonite のみ */
  takenAt: string | null;
  /** Resonite のみ */
  appVersion: string | null;
  /** Resonite のみ */
  cameraFov: string | null;
};

const reference = (name: string | undefined, id: string | undefined): ImageMetadataReference | null =>
  name || id ? { name: name ?? "", id: id ?? "" } : null;

// 表示は dayjs に任せるので、日付として解釈できない文字列はそもそも渡さない
const toIsoStringOrNull = (value: string | undefined) => {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** memora の解析結果を、投稿画面に出す項目だけへ畳む */
export const summarizeImageMetadata = (metadata: ImageMetadata): ImageMetadataSummary => {
  switch (metadata.type) {
    case "VRCX":
      return {
        source: "VRCX",
        platform: "VRChat",
        world: reference(metadata.world?.name, metadata.world?.id),
        author: reference(metadata.author?.displayName, metadata.author?.id),
        takenAt: null,
        appVersion: null,
        cameraFov: null,
      };

    case "VRChat": {
      // 新形式は WorldDisplayName に、旧形式は vrc:World に名前が入る
      const worldName = metadata.worldDisplayName || metadata.world;

      return {
        source: "VRChat",
        platform: "VRChat",
        // WorldID はあるのにどちらにも名前が無いのは、プライベートワールドで撮られた画像
        world:
          !worldName && metadata.worldId !== undefined
            ? { name: "<Private World>", id: metadata.worldId }
            : reference(worldName, metadata.worldId),
        author: reference(metadata.author, metadata.authorId),
        takenAt: null,
        appVersion: null,
        cameraFov: null,
      };
    }

    case "ResoniteScreenshotExtensions":
      return {
        source: "Resonite",
        platform: "Resonite",
        world: reference(metadata.locationName, undefined),
        author: reference(metadata.takenBy?.name, metadata.takenBy?.id),
        takenAt: toIsoStringOrNull(metadata.timeTaken),
        appVersion: metadata.appVersion ?? null,
        cameraFov: metadata.cameraFOV === undefined ? null : String(metadata.cameraFOV),
      };
  }
};

// memora はバイト列全体を要求するので、解析には最低でもファイルサイズぶんのメモリを使う。
// VRChat の 4K PNG が 10MB 前後、8K でも 50MB を超えることは稀なので、これを上限とし、
// 超えるものは低メモリ端末を落とさないよう解析せずに諦める
const MAX_ANALYZABLE_BYTES = 64 * 1024 * 1024;

/**
 * ローカル画像から撮影メタデータを読み取る。対象外・上限超過・メタデータ無しはいずれも null。
 *
 * 読み込んだバイト列も解析結果が抱える `raw` も ImageMetadataSummary へ畳んだ時点で捨てられるため、
 * 画面が保持するのは表示に使う項目だけになる。
 */
export const readImageMetadata = async (uri: string): Promise<ImageMetadataSummary | null> => {
  const file = new FileSystem.File(uri);
  if (file.size > MAX_ANALYZABLE_BYTES) return null;

  const bytes = await file.bytes();
  const metadata = await parseImageMetadata(bytes);

  return metadata ? summarizeImageMetadata(metadata) : null;
};
