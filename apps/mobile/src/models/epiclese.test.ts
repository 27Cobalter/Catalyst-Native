import { getEpicleseWorld, type EpicleseMediaMetadata } from "./epiclese";

const meta = (overrides: Partial<EpicleseMediaMetadata>): EpicleseMediaMetadata => ({
  platform: null,
  world: null,
  users: [],
  reference: [],
  ...overrides,
});

describe("getEpicleseWorld", () => {
  it("名前と ID がそろっていればそのまま返す", () => {
    expect(getEpicleseWorld(meta({ world: { name: "Home", platformIdentifier: "wrld_1" } }))).toEqual({
      name: "Home",
      platformIdentifier: "wrld_1",
    });
  });

  it("足りない名前と ID は additionalData から補う", () => {
    const result = getEpicleseWorld(
      meta({ world: { name: "", platformIdentifier: "" }, additionalData: { World: "Home" }, additionalData2: { World: { ref: "wrld_1" } } }),
    );

    expect(result).toEqual({ name: "Home", platformIdentifier: "wrld_1" });
  });

  it("ID が無くても名前があれば返す", () => {
    expect(getEpicleseWorld(meta({ additionalData: { World: "Home" } }))).toEqual({ name: "Home", platformIdentifier: "" });
  });

  it("ID しか無いワールドは返さない", () => {
    expect(getEpicleseWorld(meta({ additionalData2: { World: { ref: "wrld_1" } } }))).toBeNull();
    expect(getEpicleseWorld(meta({ world: { name: "", platformIdentifier: "wrld_1" } }))).toBeNull();
  });

  it("非公開ワールドの仮の名前はワールド名として扱わない", () => {
    expect(
      getEpicleseWorld(meta({ additionalData: { World: "<Private World>" }, additionalData2: { World: { ref: "wrld_1" } } })),
    ).toBeNull();
  });

  it("片方が非公開ワールドの仮の名前なら、もう片方の名前を使う", () => {
    const result = getEpicleseWorld(
      meta({ world: { name: "<Private World>", platformIdentifier: "wrld_1" }, additionalData: { World: "Home" } }),
    );

    expect(result).toEqual({ name: "Home", platformIdentifier: "wrld_1" });
  });
});
