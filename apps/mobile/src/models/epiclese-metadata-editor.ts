import type {
  CreateMetadata,
  EpiclesePlatformResponse,
  EpicleseStatusMetadataResponse,
  EpicleseWorldResponse,
  UserResponse,
} from "@natsuneko-laboratory/catalyst-sdk";

import { getCdnUrl } from "@/lib/media";

// メタデータの保存 API は投稿の全写真分をまとめて置き換えるため、アプリでまだ編集できない項目も
// 読み込んだ値をそのまま送り返す必要がある。GET と POST は形が違うので、Web 版 EditMetadataForm の
// transform と同じ規則で送信形式に変換して保持する。

export type EditableMediaMetadata = CreateMetadata[number];

export type EditableWorld = NonNullable<EditableMediaMetadata["world"]>;

export type ApplyToAllField = "privacyMetadata" | "platformAndWorld" | "users";

// 送信形式の users は id しか持たないため、表示用の情報は別に持つ
export type UserProfile = { displayName: string; screenName: string; iconUrl: string | null };

// サーバーの METADATA_SCHEMA の上限。超えると保存ごと 400 になる
export const MAX_USERS = 10;

type ResponseItem = EpicleseStatusMetadataResponse[string];
type ResponseAuthor = ResponseItem["reference"][number]["author"];

const toAuthor = (author: ResponseAuthor) => ({
  id: author.id,
  platformIdentifier: author.platformIdentifier,
  platform: author.platform?.id ?? "",
  name: author.name,
});

export const toEditableWorld = (world: EpicleseWorldResponse): EditableWorld => ({
  id: world.id,
  platformIdentifier: world.platformIdentifier,
  platform: world.platform?.id ?? "",
  name: world.name,
  author: world.author ? toAuthor(world.author) : null,
});

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
      world: item.world ? toEditableWorld(item.world) : undefined,
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
  const source = items[sourceIndex];

  switch (field) {
    // ワールドはプラットフォームに属するので、必ず組でコピーする
    case "platformAndWorld":
      return items.map((item) => ({ ...item, platform: source.platform, world: source.world }));
    case "users":
      return items.map((item) => ({ ...item, users: source.users }));
    case "privacyMetadata":
      return items.map((item) => ({ ...item, privacyMetadata: source.privacyMetadata }));
  }
};

// ワールドはプラットフォームに属するので、別のプラットフォームに変えたらワールドを外す (Web 版と同じ)
export const setPlatform = (item: EditableMediaMetadata, platformId: string | undefined): EditableMediaMetadata => ({
  ...item,
  platform: platformId,
  world: platformId !== undefined && item.platform === platformId ? item.world : undefined,
});

export const toggleUser = (users: { id: string }[], userId: string): { users: { id: string }[]; limited: boolean } => {
  if (users.some((user) => user.id === userId)) {
    return { users: users.filter((user) => user.id !== userId), limited: false };
  }

  if (users.length >= MAX_USERS) {
    return { users, limited: true };
  }

  return { users: [...users, { id: userId }], limited: false };
};

export const toUserProfile = (user: Pick<UserResponse, "displayName" | "screenName" | "profile">): UserProfile => ({
  displayName: user.displayName,
  screenName: user.screenName,
  // アイコンは元画像のままでは表示できないので、他の画面と同じく CDN のアイコン用の URL にする
  iconUrl: user.profile?.iconUrl ? getCdnUrl({ src: user.profile.iconUrl, variant: "icon", width: 96 }) : null,
});

export const collectUserProfiles = (response: EpicleseStatusMetadataResponse): Record<string, UserProfile> =>
  Object.fromEntries(
    Object.values(response).flatMap((item) => item.users.map((user) => [user.id, toUserProfile(user)] as const)),
  );

// どちらも toEditableMetadata から作られるのでキー順が揃い、文字列比較で足りる
export const isMetadataDirty = (initial: EditableMediaMetadata[], current: EditableMediaMetadata[]) =>
  JSON.stringify(initial) !== JSON.stringify(current);
