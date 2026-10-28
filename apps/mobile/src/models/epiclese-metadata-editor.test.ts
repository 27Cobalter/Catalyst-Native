import type { EpicleseStatusMetadataResponse } from "@natsuneko-laboratory/catalyst-sdk";

import {
  applyToAll,
  isMetadataConfigured,
  isMetadataDirty,
  toEditableMetadata,
  type EditableMediaMetadata,
} from "./epiclese-metadata-editor";

type ResponseItem = EpicleseStatusMetadataResponse[string];

const platforms = [
  { id: "p-vrchat", name: "VRChat", description: "", url: null, startAt: null },
  { id: "p-resonite", name: "Resonite", description: "", url: null, startAt: null },
];
const platformObj = platforms[0];
const author = { id: "a-1", platformIdentifier: "usr_1", platform: platformObj, name: "Author" };

const responseItem = (overrides: Partial<ResponseItem>): ResponseItem => ({
  platform: null,
  world: null,
  users: [],
  reference: [],
  ...overrides,
});

const empty = (id: string): EditableMediaMetadata => ({ id, reference: [], privacyMetadata: false });

describe("toEditableMetadata", () => {
  it("Web 版 transform と同じ送信内容になる (往復)", () => {
    const response: EpicleseStatusMetadataResponse = {
      m1: {
        platform: "VRChat",
        world: { id: "w-1", platformIdentifier: "wrld_1", platform: platformObj, name: "Home", author },
        users: [{ id: "u-1", screenName: "a", displayName: "A", profile: null }],
        reference: [
          {
            type: "avatar",
            name: "Avatar",
            description: "desc",
            externalUrl: "https://booth.pm/ja/items/1",
            imageUrl: "x",
            author,
            x: 0.25,
            y: 0.5,
            order: 0,
            reference: "i-1",
          },
          {
            type: "cloth",
            name: "Cloth",
            description: "",
            externalUrl: null,
            imageUrl: null,
            author: { ...author, platform: null },
            x: 0.75,
            y: 0.1,
            order: 1,
            reference: "i-2",
          },
        ],
        additionalData: { World: "Home" },
      },
    };

    const result = toEditableMetadata([{ id: "m1", privacyMetadata: true }], response, platforms);

    expect(result).toEqual([
      {
        id: "m1",
        platform: "p-vrchat",
        world: {
          id: "w-1",
          platformIdentifier: "wrld_1",
          platform: "p-vrchat",
          name: "Home",
          author: { id: "a-1", platformIdentifier: "usr_1", platform: "p-vrchat", name: "Author" },
        },
        users: [{ id: "u-1" }],
        reference: [
          {
            x: 0.25,
            y: 0.5,
            order: 0,
            reference: "i-1",
            type: "avatar",
            name: "Avatar",
            description: "desc",
            externalUrl: "https://booth.pm/ja/items/1",
            author: { id: "a-1", platformIdentifier: "usr_1", platform: "p-vrchat", name: "Author" },
          },
          {
            x: 0.75,
            y: 0.1,
            order: 1,
            reference: "i-2",
            type: "cloth",
            name: "Cloth",
            description: "",
            externalUrl: undefined,
            author: { id: "a-1", platformIdentifier: "usr_1", platform: "", name: "Author" },
          },
        ],
        privacyMetadata: true,
      },
    ]);
    expect(result[0].reference).toHaveLength(2);
    expect(result[0].reference[0]).not.toHaveProperty("imageUrl");
    expect(result[0]).not.toHaveProperty("additionalData");
  });

  it('world が null なら undefined、world.platform が null なら ""', () => {
    const [nullWorld] = toEditableMetadata([{ id: "m1" }], { m1: responseItem({ world: null }) }, platforms);
    expect(nullWorld.world).toBeUndefined();

    const [noPlatform] = toEditableMetadata(
      [{ id: "m1" }],
      {
        m1: responseItem({
          world: { id: "w-1", platformIdentifier: "wrld_1", platform: null, name: "Home", author: null },
        }),
      },
      platforms,
    );
    expect(noPlatform.world?.platform).toBe("");
    expect(noPlatform.world?.author).toBeNull();
  });

  it("プラットフォーム名が一覧に無ければ platform は undefined", () => {
    const [unknown] = toEditableMetadata([{ id: "m1" }], { m1: responseItem({ platform: "Unknown" }) }, platforms);
    expect(unknown.platform).toBeUndefined();

    const [none] = toEditableMetadata([{ id: "m1" }], { m1: responseItem({ platform: null }) }, platforms);
    expect(none.platform).toBeUndefined();
  });

  it("メタデータが無い写真は空で補い、投稿の写真順に並べる", () => {
    const result = toEditableMetadata(
      [{ id: "m1" }, { id: "m2" }, { id: "m3" }],
      { m3: responseItem({ platform: "Resonite" }), m1: responseItem({ platform: "VRChat" }) },
      platforms,
    );

    expect(result.map((item) => item.id)).toEqual(["m1", "m2", "m3"]);
    expect(result[1]).toEqual({ id: "m2", reference: [], privacyMetadata: false });
  });

  it("投稿に無い写真のメタデータは捨てる", () => {
    const result = toEditableMetadata(
      [{ id: "m1" }],
      { m1: responseItem({}), "m-deleted": responseItem({ platform: "VRChat" }) },
      platforms,
    );

    expect(result).toHaveLength(1);
    expect(result.map((item) => item.id)).not.toContain("m-deleted");
  });

  it("privacyMetadata は投稿の medias から読み、未定義なら false", () => {
    const result = toEditableMetadata(
      [{ id: "m1", privacyMetadata: true }, { id: "m2" }],
      { m1: responseItem({}), m2: responseItem({}) },
      platforms,
    );

    expect(result.map((item) => item.privacyMetadata)).toEqual([true, false]);
  });
});

describe("isMetadataConfigured", () => {
  it("何も無ければ false", () => {
    expect(isMetadataConfigured(empty("m1"))).toBe(false);
    expect(isMetadataConfigured({ ...empty("m1"), users: [] })).toBe(false);
  });

  it("いずれかの項目があれば true", () => {
    const world = { platformIdentifier: "wrld_1", platform: "p-vrchat", name: "Home", author: null };
    const pin = { x: 0, y: 0, type: "avatar" as const, name: "Avatar" };

    expect(isMetadataConfigured({ ...empty("m1"), platform: "p-vrchat" })).toBe(true);
    expect(isMetadataConfigured({ ...empty("m1"), world })).toBe(true);
    expect(isMetadataConfigured({ ...empty("m1"), users: [{ id: "u-1" }] })).toBe(true);
    expect(isMetadataConfigured({ ...empty("m1"), reference: [pin] })).toBe(true);
    expect(isMetadataConfigured({ ...empty("m1"), privacyMetadata: true })).toBe(true);
  });
});

describe("applyToAll", () => {
  it("privacyMetadata だけを全写真にコピーし、他の項目と元配列は変えない", () => {
    const items: EditableMediaMetadata[] = [
      { ...empty("m1"), platform: "p-vrchat" },
      { ...empty("m2"), privacyMetadata: true },
      {
        ...empty("m3"),
        world: { platformIdentifier: "wrld_1", platform: "p-vrchat", name: "Home", author: null },
        reference: [{ x: 0, y: 0, type: "avatar", name: "Avatar" }],
      },
    ];
    const snapshot = structuredClone(items);

    const result = applyToAll(items, 1, "privacyMetadata");

    expect(result.map((item) => item.privacyMetadata)).toEqual([true, true, true]);
    expect(result.map(({ privacyMetadata: _privacyMetadata, ...rest }) => rest)).toEqual(
      snapshot.map(({ privacyMetadata: _privacyMetadata, ...rest }) => rest),
    );
    expect(items).toEqual(snapshot);
  });
});

describe("isMetadataDirty", () => {
  it("同じ内容なら false、privacyMetadata が変われば true", () => {
    const initial = [empty("m1"), empty("m2")];

    expect(isMetadataDirty(initial, [empty("m1"), empty("m2")])).toBe(false);
    expect(isMetadataDirty(initial, [empty("m1"), { ...empty("m2"), privacyMetadata: true }])).toBe(true);
  });
});
