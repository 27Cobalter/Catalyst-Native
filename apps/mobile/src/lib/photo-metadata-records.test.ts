import type { ImageMetadata } from "@natsuneko-laboratory/memora";

import { toDenormalizedRecords, toRecordRows } from "./photo-metadata-records";

const raw = new Uint8Array();

const resonite = (overrides: object = {}): ImageMetadata =>
  ({
    type: "ResoniteScreenshotExtensions",
    raw,
    locationName: "Home",
    timeTaken: "2026-10-01T12:00:00Z",
    takenBy: { name: "Neko", id: "U-neko" },
    appVersion: "2026.1",
    cameraFOV: 60,
    ...overrides,
  }) as ImageMetadata;

const vrchatNew = (overrides: object = {}): ImageMetadata =>
  ({
    type: "VRChat",
    raw,
    author: "Neko",
    authorId: "usr_1",
    worldId: "wrld_1",
    worldDisplayName: "Home",
    ...overrides,
  }) as ImageMetadata;

describe("toDenormalizedRecords", () => {
  it("Resonite の全項目を Web と同じ records にする", () => {
    expect(toDenormalizedRecords([resonite()])).toEqual({
      LocationName: "Home",
      TakenAt: "2026-10-01T12:00:00.000Z",
      TakenBy: { value: "Neko", referenceId: "U-neko", referenceType: "author" },
      Platform: "Resonite",
      AppVersion: "2026.1",
      CameraFOV: "60",
    });
  });

  it("Resonite で撮影者や場所が無ければ、その項目を落とす", () => {
    const records = toDenormalizedRecords([resonite({ locationName: "", takenBy: undefined })]);

    expect(records).not.toHaveProperty("LocationName");
    expect(records).not.toHaveProperty("TakenBy");
    expect(records?.Platform).toBe("Resonite");
  });

  it("Resonite の日付が解釈できなければ、その候補を飛ばして次の候補を使う", () => {
    const records = toDenormalizedRecords([resonite({ timeTaken: "not a date" }), vrchatNew()]);

    expect(records?.Platform).toBe("VRChat");
    expect(records?.CreatorTool).toBe("VRChat");
  });

  it("VRCX は version 1 で world と author があるときだけ使う", () => {
    const vrcx = {
      type: "VRCX",
      raw,
      version: 1,
      world: { name: "Home", id: "wrld_1" },
      author: { displayName: "Neko", id: "usr_1" },
    } as ImageMetadata;

    expect(toDenormalizedRecords([vrcx])).toEqual({
      LocationName: { value: "Home", referenceId: "wrld_1", referenceType: "world" },
      TakenBy: { value: "Neko", referenceId: "usr_1", referenceType: "author" },
      Platform: "VRChat",
      Application: "VRCX",
      Version: "1",
    });
    expect(toDenormalizedRecords([{ ...vrcx, version: 2 } as ImageMetadata])).toBeNull();
  });

  it("VRChat の旧形式は名前を持たない参照にする", () => {
    expect(toDenormalizedRecords([{ type: "VRChat", raw, author: "usr_1", world: "wrld_1" } as ImageMetadata])).toEqual(
      {
        CreatorTool: "VRChat",
        Platform: "VRChat",
        Author: { value: "", referenceId: "usr_1", referenceType: "author" },
        World: { value: "", referenceId: "wrld_1", referenceType: "world" },
        Parser: "2025.07.22-beta.1674",
      },
    );
  });

  it("VRChat の新形式は名前付きの参照にし、ワールド名が無ければ <Private World>", () => {
    expect(toDenormalizedRecords([vrchatNew()])).toEqual({
      CreatorTool: "VRChat",
      Platform: "VRChat",
      Author: { value: "Neko", referenceId: "usr_1", referenceType: "author" },
      World: { value: "Home", referenceId: "wrld_1", referenceType: "world" },
      Parser: "2025.08.01-beta.1678",
    });

    const privateWorld = toDenormalizedRecords([vrchatNew({ worldId: "", worldDisplayName: undefined })]);
    expect(privateWorld?.World).toEqual({ value: "<Private World>", referenceId: "", referenceType: "world" });
  });

  it("条件を満たす候補が無ければ null", () => {
    expect(toDenormalizedRecords([{ type: "VRChat", raw, author: "Neko" } as ImageMetadata])).toBeNull();
    expect(toDenormalizedRecords([])).toBeNull();
  });

  it("Resonite と VRChat が両方あれば Resonite を使う", () => {
    expect(toDenormalizedRecords([vrchatNew(), resonite()])?.Platform).toBe("Resonite");
  });

  it("サーバーの上限に合わせて値を 1024 文字、referenceId を 256 文字で切る", () => {
    const records = toDenormalizedRecords([
      resonite({ locationName: "a".repeat(1500), takenBy: { name: "Neko", id: "b".repeat(300) } }),
    ]);

    expect(records?.LocationName).toHaveLength(1024);
    expect(records?.TakenBy).toEqual(expect.objectContaining({ referenceId: "b".repeat(256) }));
  });
});

describe("toRecordRows", () => {
  it("Resonite の場所は撮影場所、その他は Web と同じラベルにする", () => {
    const rows = toRecordRows(toDenormalizedRecords([resonite()])!);
    const byLabel = Object.fromEntries(rows.map((row) => [row.label, row.value]));

    expect(byLabel["撮影場所"]).toBe("Home");
    expect(byLabel["撮影者"]).toBe("Neko");
    expect(byLabel["撮影プラットフォーム"]).toBe("Resonite");
    expect(byLabel["撮影日時"]).toBeDefined();
    expect(byLabel.AppVersion).toBe("2026.1");
  });

  it("名前の無い参照は ID を表示する", () => {
    const rows = toRecordRows(
      toDenormalizedRecords([{ type: "VRChat", raw, author: "usr_1", world: "wrld_1" } as ImageMetadata])!,
    );

    expect(rows.find((row) => row.label === "撮影ワールド")?.value).toBe("wrld_1");
    expect(rows.find((row) => row.label === "撮影者")?.value).toBe("usr_1");
  });
});
