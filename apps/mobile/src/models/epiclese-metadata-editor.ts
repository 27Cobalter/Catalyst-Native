import type {
  CreateMetadata,
  EpiclesePlatformResponse,
  EpicleseStatusMetadataResponse,
} from "@natsuneko-laboratory/catalyst-sdk";

// メタデータの保存 API は投稿の全写真分をまとめて置き換えるため、アプリでまだ編集できない項目も
// 読み込んだ値をそのまま送り返す必要がある。GET と POST は形が違うので、Web 版 EditMetadataForm の
// transform と同じ規則で送信形式に変換して保持する。

export type EditableMediaMetadata = CreateMetadata[number];

export type ApplyToAllField = "privacyMetadata";

type ResponseItem = EpicleseStatusMetadataResponse[string];
type ResponseAuthor = ResponseItem["reference"][number]["author"];

const toAuthor = (author: ResponseAuthor) => ({
  id: author.id,
  platformIdentifier: author.platformIdentifier,
  platform: author.platform?.id ?? "",
  name: author.name,
});

const toWorld = (world: ResponseItem["world"]): EditableMediaMetadata["world"] => {
  if (!world) {
    return undefined;
  }

  return {
    id: world.id,
    platformIdentifier: world.platformIdentifier,
    platform: world.platform?.id ?? "",
    name: world.name,
    author: world.author ? toAuthor(world.author) : null,
  };
};

const toReference = (reference: ResponseItem["reference"]): EditableMediaMetadata["reference"] =>
  reference.map((item) => ({
    x: item.x,
    y: item.y,
    order: item.order,
    reference: item.reference,
    type: item.type,
    name: item.name,
    description: item.description,
    externalUrl: item.externalUrl ?? undefined,
    author: toAuthor(item.author),
  }));

export const toEditableMetadata = (
  medias: { id: string; privacyMetadata?: boolean }[],
  response: EpicleseStatusMetadataResponse,
  platforms: EpiclesePlatformResponse[],
): EditableMediaMetadata[] =>
  medias.map((media) => {
    const item = response[media.id];
    const privacyMetadata = media.privacyMetadata ?? false;

    if (!item) {
      return { id: media.id, reference: [], privacyMetadata };
    }

    return {
      id: media.id,
      platform: platforms.find((platform) => platform.name === item.platform)?.id,
      world: toWorld(item.world),
      users: item.users.map((user) => ({ id: user.id })),
      reference: toReference(item.reference),
      privacyMetadata,
    };
  });

export const isMetadataConfigured = (item: EditableMediaMetadata) =>
  !!item.platform ||
  !!item.world ||
  (item.users?.length ?? 0) > 0 ||
  item.reference.length > 0 ||
  !!item.privacyMetadata;

export const applyToAll = (
  items: EditableMediaMetadata[],
  sourceIndex: number,
  field: ApplyToAllField,
): EditableMediaMetadata[] => {
  const value = items[sourceIndex][field];

  return items.map((item) => ({ ...item, [field]: value }));
};

// どちらも toEditableMetadata から作られるのでキー順が揃い、文字列比較で足りる
export const isMetadataDirty = (initial: EditableMediaMetadata[], current: EditableMediaMetadata[]) =>
  JSON.stringify(initial) !== JSON.stringify(current);
