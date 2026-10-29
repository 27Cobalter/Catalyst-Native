// レタッチ前の元画像から読み取った撮影情報を、レタッチ済みの写真へ付与する records に変換する。
//
// Web 版と同じ値を付与するため、teyvat の packages/foreign-model/src/photo-metadata.ts
// (extractCatalystPhotoMetadata) と packages/catalyst.natsuneko.com/src/lib/extractPhotoMetadata.ts を
// 移植している。アプリは foreign-model に依存していないので、移植元の方針が変わったらここも合わせること。

import { abs } from "@/lib/dayjs";
import type { ImportDenormalizedMetadata } from "@natsuneko-laboratory/catalyst-sdk";
import { parseAllImageMetadata, type ImageMetadata } from "@natsuneko-laboratory/memora";
import dayjs from "dayjs";
import * as FileSystem from "expo-file-system";

export type DenormalizedRecords = ImportDenormalizedMetadata["records"];
type DenormalizedRecord = NonNullable<DenormalizedRecords[keyof DenormalizedRecords]>;

export type RecordRow = { key: string; label: string; value: string };

type Reference = { Value: string; ReferenceId: string; ReferenceType: "author" | "world" };
type PhotoMetadata = Record<string, string | number | null | Reference>;

// サーバーの IMPORT_DENORMALIZED_METADATA_SCHEMA の上限。1 つでも超えると付与全体が 400 になる
const MAX_VALUE_LENGTH = 1024;
const MAX_REFERENCE_ID_LENGTH = 256;

// 画像 1 枚ぶんのバイト列をメモリに載せるので、投稿画面 (image-metadata.ts) と同じ上限で諦める
const MAX_ANALYZABLE_BYTES = 64 * 1024 * 1024;

// 移植元 extractCatalystPhotoMetadata と同じ。Resonite を優先し、使えない候補 (不正な日付など) は次を試す
const extractPhotoMetadata = (results: ImageMetadata[]): PhotoMetadata | null => {
  const ordered = [
    ...results.filter((result) => result.type === "ResoniteScreenshotExtensions"),
    ...results.filter((result) => result.type !== "ResoniteScreenshotExtensions"),
  ];

  for (const metadata of ordered) {
    try {
      switch (metadata.type) {
        case "ResoniteScreenshotExtensions":
          return {
            LocationName: metadata.locationName || null,
            TakenAt: metadata.timeTaken ? dayjs(metadata.timeTaken).toISOString() : null,
            TakenBy: metadata.takenBy
              ? { Value: metadata.takenBy.name ?? "", ReferenceId: metadata.takenBy.id ?? "", ReferenceType: "author" }
              : null,
            Platform: "Resonite",
            AppVersion: metadata.appVersion ?? null,
            CameraFOV: metadata.cameraFOV ?? null,
          };
        case "VRCX":
          if (metadata.version !== 1 || !metadata.world || !metadata.author) continue;
          return {
            LocationName: {
              Value: metadata.world.name ?? "",
              ReferenceId: metadata.world.id ?? "",
              ReferenceType: "world",
            },
            TakenBy: {
              Value: metadata.author.displayName ?? "",
              ReferenceId: metadata.author.id ?? "",
              ReferenceType: "author",
            },
            Platform: "VRChat",
            Application: "VRCX",
            Version: "1",
          };
        case "VRChat":
          if (metadata.author?.startsWith("usr_") && metadata.world?.startsWith("wrld_")) {
            return {
              CreatorTool: "VRChat",
              Platform: "VRChat",
              Author: { Value: "", ReferenceId: metadata.author, ReferenceType: "author" },
              World: { Value: "", ReferenceId: metadata.world, ReferenceType: "world" },
              Parser: "2025.07.22-beta.1674",
            };
          }
          if (
            metadata.authorId?.startsWith("usr_") &&
            (metadata.worldId?.startsWith("wrld_") || metadata.worldId === "")
          ) {
            return {
              CreatorTool: "VRChat",
              Platform: "VRChat",
              Author: { Value: metadata.author ?? "", ReferenceId: metadata.authorId, ReferenceType: "author" },
              World: {
                Value: metadata.worldDisplayName || "<Private World>",
                ReferenceId: metadata.worldId,
                ReferenceType: "world",
              },
              Parser: "2025.08.01-beta.1678",
            };
          }
      }
    } catch {
      // 不正なメタデータの候補があっても、後ろの候補は試す
    }
  }

  return null;
};

const truncate = (value: string, max: number) => (value.length > max ? value.slice(0, max) : value);

export const toDenormalizedRecords = (results: ImageMetadata[]): DenormalizedRecords | null => {
  const metadata = extractPhotoMetadata(results);
  if (!metadata) return null;

  const records: Record<string, DenormalizedRecord> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === null) continue;
    records[key] =
      typeof value === "object"
        ? {
            value: truncate(value.Value, MAX_VALUE_LENGTH),
            referenceId: truncate(value.ReferenceId, MAX_REFERENCE_ID_LENGTH),
            referenceType: value.ReferenceType,
          }
        : truncate(String(value), MAX_VALUE_LENGTH);
  }

  return Object.keys(records).length > 0 ? (records as DenormalizedRecords) : null;
};

export const readDenormalizedRecords = async (uri: string): Promise<DenormalizedRecords | null> => {
  const file = new FileSystem.File(uri);
  if (file.size > MAX_ANALYZABLE_BYTES) return null;

  return toDenormalizedRecords(await parseAllImageMetadata(await file.bytes()));
};

// Web 版の globals:metadata.* と同じ呼び方
const labelOf = (key: string, records: DenormalizedRecords) => {
  switch (key) {
    case "Platform":
      return "撮影プラットフォーム";
    case "LocationName":
      return records.Platform === "Resonite" ? "撮影場所" : "撮影ワールド";
    case "World":
      return "撮影ワールド";
    case "TakenBy":
    case "Author":
      return "撮影者";
    case "TakenAt":
      return "撮影日時";
    default:
      return key;
  }
};

export const toRecordRows = (records: DenormalizedRecords): RecordRow[] =>
  Object.entries(records).flatMap(([key, record]) => {
    if (!record) return [];

    // VRChat の旧形式は名前を持たないので、ID を出す
    const value = typeof record === "string" ? record : record.value || record.referenceId;
    return [{ key, label: labelOf(key, records), value: key === "TakenAt" ? abs(value) : value }];
  });
