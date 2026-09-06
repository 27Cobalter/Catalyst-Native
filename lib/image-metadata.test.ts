import type { ImageMetadata } from "@natsuneko-laboratory/memora";

import { summarizeImageMetadata } from "./image-metadata";

// バイト列の解析は memora 側でテストされているので、ここではアプリ側に残った
// 「解析結果を表示項目へ畳む」部分だけを見る

const raw = new Uint8Array(0);

describe("summarizeImageMetadata", () => {
  describe("VRCX", () => {
    const base: ImageMetadata = {
      type: "VRCX",
      raw,
      application: "VRCX",
      author: { id: "usr_abc", displayName: "27Cobalter", extra: {} },
      world: { id: "wrld_xyz", name: "The Great Pug", extra: {} },
      extra: {},
    };

    it("ワールドと撮影者を取り出す", () => {
      expect(summarizeImageMetadata(base)).toEqual({
        source: "VRCX",
        platform: "VRChat",
        world: { name: "The Great Pug", id: "wrld_xyz" },
        author: { name: "27Cobalter", id: "usr_abc" },
        takenAt: null,
        appVersion: null,
        cameraFov: null,
      });
    });

    it("ワールドや撮影者が無ければ null にする", () => {
      const summary = summarizeImageMetadata({ ...base, author: undefined, world: undefined });

      expect(summary.world).toBeNull();
      expect(summary.author).toBeNull();
    });
  });

  describe("VRChat", () => {
    const base: ImageMetadata = {
      type: "VRChat",
      raw,
      creatorTool: "VRChat",
      author: "27Cobalter",
      authorId: "usr_abc",
      worldId: "wrld_xyz",
      worldDisplayName: "The Great Pug",
      extra: {},
    };

    it("ワールドと撮影者を取り出す", () => {
      expect(summarizeImageMetadata(base)).toEqual({
        source: "VRChat",
        platform: "VRChat",
        world: { name: "The Great Pug", id: "wrld_xyz" },
        author: { name: "27Cobalter", id: "usr_abc" },
        takenAt: null,
        appVersion: null,
        cameraFov: null,
      });
    });

    it("WorldID があるのに表示名が無ければプライベートワールドとして扱う", () => {
      const summary = summarizeImageMetadata({ ...base, worldId: "", worldDisplayName: "" });

      expect(summary.world).toEqual({ name: "<Private World>", id: "" });
    });

    it("旧形式の vrc:World を表示名として使う", () => {
      const summary = summarizeImageMetadata({
        ...base,
        worldId: undefined,
        worldDisplayName: undefined,
        world: "The Great Pug",
      });

      expect(summary.world).toEqual({ name: "The Great Pug", id: "" });
    });

    // WorldID があると <Private World> の判定が先に立ってしまい、旧形式の名前を握り潰していた
    it("WorldID があっても旧形式の vrc:World を優先する", () => {
      const summary = summarizeImageMetadata({
        ...base,
        worldDisplayName: undefined,
        world: "The Great Pug",
      });

      expect(summary.world).toEqual({ name: "The Great Pug", id: "wrld_xyz" });
    });

    it("AuthorID しか無ければ名前は空のまま返す", () => {
      const summary = summarizeImageMetadata({ ...base, author: undefined });

      // 名前が空の行を出さないのは表示側の責務なので、ここでは ID を保持していることだけ見る
      expect(summary.author).toEqual({ name: "", id: "usr_abc" });
    });
  });

  describe("ResoniteScreenshotExtensions", () => {
    const base: ImageMetadata = {
      type: "ResoniteScreenshotExtensions",
      raw,
      cameraManufacturer: "Resonite",
      locationName: "Sunset Beach",
      takenBy: { id: "U-27Cobalter", name: "27Cobalter", extra: {} },
      timeTaken: "2026-08-24T09:00:00Z",
      appVersion: "2026.8.1.1234",
      cameraFOV: 60,
      extra: {},
    };

    it("撮影情報を取り出す", () => {
      expect(summarizeImageMetadata(base)).toEqual({
        source: "Resonite",
        platform: "Resonite",
        world: { name: "Sunset Beach", id: "" },
        author: { name: "27Cobalter", id: "U-27Cobalter" },
        takenAt: "2026-08-24T09:00:00.000Z",
        appVersion: "2026.8.1.1234",
        cameraFov: "60",
      });
    });

    it("TimeTaken が日付として読めなければ表示しない", () => {
      expect(summarizeImageMetadata({ ...base, timeTaken: "not-a-date" }).takenAt).toBeNull();
    });

    it("撮影情報が欠けていても例外にならない", () => {
      const summary = summarizeImageMetadata({
        ...base,
        locationName: undefined,
        takenBy: undefined,
        timeTaken: undefined,
        appVersion: undefined,
        cameraFOV: undefined,
      });

      expect(summary).toEqual({
        source: "Resonite",
        platform: "Resonite",
        world: null,
        author: null,
        takenAt: null,
        appVersion: null,
        cameraFov: null,
      });
    });
  });
});
