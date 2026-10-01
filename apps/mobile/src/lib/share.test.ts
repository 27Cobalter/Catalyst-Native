import twtr from "twitter-text";
import { buildShareText, buildWorldShareText } from "./share";

const URL = "https://catalyst.natsuneko.com/status/123";
const SITE_NAME = "Catalyst - VR-SNS 向け写真共有サービス";

describe("buildShareText", () => {
  it("短いテキストはそのまま連結される", () => {
    const result = buildShareText("hello world", "natsuneko", URL);

    expect(result).toBe(`hello world by natsuneko | ${SITE_NAME}\n${URL}`);
  });

  // Web 版から X へ共有したときの実際の出力と一致すること
  it("本文が空でも Web 版と同じ形になる", () => {
    const result = buildShareText("", "natsuneko", URL);

    expect(result).toBe(` by natsuneko | ${SITE_NAME}\n${URL}`);
  });

  it("投稿者が取れないときは by ごと省略する", () => {
    const result = buildShareText("hello", "", URL);

    expect(result).toBe(`hello | ${SITE_NAME}\n${URL}`);
  });

  // iOS の共有シートは URL を別枠で受け取るので、呼び出し元が空文字を渡してくる
  it("URL が空なら末尾に改行を付けない", () => {
    const result = buildShareText("hello", "natsuneko", "");

    expect(result).toBe(`hello by natsuneko | ${SITE_NAME}`);
  });

  it("280 文字 (twitter-text 換算) を超えない場合は省略しない", () => {
    const text = "a".repeat(50);
    const result = buildShareText(text, "user", URL);

    expect(result).not.toContain("...");
    expect(result).toBe(`${text} by user | ${SITE_NAME}\n${URL}`);
  });

  it("収まらない長さのテキストは省略記号付きで切り詰める", () => {
    const text = "a".repeat(400);
    const result = buildShareText(text, "natsuneko", URL);

    expect(result).toContain("...");
    expect(result).toContain(`by natsuneko | ${SITE_NAME}`);
    expect(result.endsWith(URL)).toBe(true);
    expect(twtr.getTweetLength(result)).toBeLessThanOrEqual(280);
  });

  it("全角文字を含む長いテキストでも重み付き文字数で切り詰める (raw index ではない)", () => {
    const text = "あ".repeat(200);
    const result = buildShareText(text, "user", URL);

    expect(result).toContain("...");
    expect(twtr.getTweetLength(result)).toBeLessThanOrEqual(280);
  });

  it("ユーザー名が長い場合でも破綻しない", () => {
    const text = "a".repeat(300);
    const result = buildShareText(text, "a".repeat(50), URL);

    expect(twtr.getTweetLength(result)).toBeLessThanOrEqual(280);
  });
});

describe("buildWorldShareText", () => {
  const WORLD = { name: "星映しの湖", author: "Nekopyo" };
  const LINK = "📷 VR 写真共有サービス Catalyst で見る";
  const USER_LINK = "📷 27Cobalter さんの投稿を VR 写真共有サービス Catalyst で見る";

  it("本文、ワールド名 by 制作者、投稿者入りの Catalyst への誘導、URL を行に分ける", () => {
    const result = buildWorldShareText("#Eku3D", "27Cobalter", URL, WORLD);

    expect(result).toBe(`#Eku3D\n🌐 星映しの湖 by Nekopyo\n${USER_LINK}\n${URL}`);
  });

  it("制作者が取れないときはワールド名だけにする", () => {
    const result = buildWorldShareText("#Eku3D", "27Cobalter", URL, { name: "星映しの湖", author: null });

    expect(result).toBe(`#Eku3D\n🌐 星映しの湖\n${USER_LINK}\n${URL}`);
  });

  it("投稿者が無いときは誘導の行から投稿者を省く", () => {
    const result = buildWorldShareText("#Eku3D", "", URL, WORLD);

    expect(result).toBe(`#Eku3D\n🌐 星映しの湖 by Nekopyo\n${LINK}\n${URL}`);
  });

  it("本文が無いときは 1 行目ごと省く", () => {
    const result = buildWorldShareText("", "27Cobalter", URL, WORLD);

    expect(result).toBe(`🌐 星映しの湖 by Nekopyo\n${USER_LINK}\n${URL}`);
  });

  // iOS の共有シートは URL を別枠で受け取るので、呼び出し元が空文字を渡してくる
  it("URL が空なら誘導の行で終える", () => {
    const result = buildWorldShareText("#Eku3D", "", "", WORLD);

    expect(result).toBe(`#Eku3D\n🌐 星映しの湖 by Nekopyo\n${LINK}`);
  });

  it("長い本文は 280 文字 (twitter-text 換算) に収まるよう切り詰め、ワールドと誘導は残す", () => {
    const result = buildWorldShareText("あ".repeat(200), "27Cobalter", URL, WORLD);

    expect(result).toContain("...");
    expect(result).toContain("🌐 星映しの湖 by Nekopyo");
    expect(result).toContain(USER_LINK);
    expect(twtr.getTweetLength(result)).toBeLessThanOrEqual(280);
  });

  it("収まる本文ならちょうど 280 文字でも切り詰めない", () => {
    const fixed = buildWorldShareText("", "u", URL, WORLD);
    const room = 280 - twtr.getTweetLength(fixed) - "\n".length;
    const text = "a".repeat(room);

    expect(buildWorldShareText(text, "u", URL, WORLD)).toBe(`${text}\n${fixed}`);
  });
});
