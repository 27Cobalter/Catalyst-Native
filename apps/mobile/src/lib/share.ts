import twtr from "twitter-text";

const TWITTER_URL_LENGTH = 23;
const TWEET_MAX_LENGTH = 280;
const ELLIPSIS = "...";

// Web 版の SITE_NAME と同じ表記。X などに流したときに Web からの共有と見た目が揃うようにしている
// (Web 版には SITE_NAME_SHORT = "Catalyst" もあるが、共有テキストでは使われていない)
const SITE_NAME = "Catalyst - VR-SNS 向け写真共有サービス";

// 本文の後ろに必ず付く " | " と、URL の前の改行のぶん
const SEPARATOR_LENGTH = " | ".length + "\n".length;

// twitter-text の重み付き文字数カウントに基づいてスライスするヘルパー
// 全角文字（日本語など）は2としてカウントされるため、raw インデックスで
// スライスすると文字数が超過する
const sliceByTweetLength = (text: string, maxWeightedLength: number): string => {
  let weightedLen = 0;
  for (let i = 0; i < text.length; i++) {
    const charWeight = twtr.getTweetLength(text[i]);
    if (weightedLen + charWeight > maxWeightedLength) {
      return text.slice(0, i);
    }
    weightedLen += charWeight;
  }
  return text;
};

/**
 * 共有先へ流すテキストを組み立てる。組み立て方は Web 版の `buildShareText` に合わせてある。
 *
 * `url` は空文字を渡してもよい。iOS の共有シートのように URL を別枠で受け取る呼び出し元が
 * あるためで、その場合は末尾の改行ごと省く。長さの見積もりでは URL のぶんを常に確保する
 * (呼び出し元が後から URL を繋ぐため)。
 */
export const buildShareText = (text: string, username: string, url: string): string => {
  // Web 版は投稿者が取れないときは " by ..." ごと省略する
  const author = username ? ` by ${username}` : "";
  const reserved = twtr.getTweetLength(author) + twtr.getTweetLength(SITE_NAME) + TWITTER_URL_LENGTH + SEPARATOR_LENGTH;

  const body =
    twtr.getTweetLength(text) + reserved <= TWEET_MAX_LENGTH
      ? text
      : `${sliceByTweetLength(text, TWEET_MAX_LENGTH - reserved - twtr.getTweetLength(ELLIPSIS))}${ELLIPSIS}`;

  const head = `${body}${author} | ${SITE_NAME}`;

  return url ? `${head}\n${url}` : head;
};

export type ShareWorld = {
  name: string;
  /** ワールド制作者。取れなかったときは null */
  author: string | null;
};

// 自分のツイートにぶら下げて撮影ワールドを紹介する用途なので、Web 版とは揃えず読みやすさを優先して行を分ける。
// 投稿者は「〇〇 さんの投稿を」として誘導の行に入れ、ワールド制作者は Created by で書き分ける。
// Catalyst を知らない人にもリンク先が分かるよう、サービス名には肩書きを添える
const CATALYST_LABEL = "VR 写真共有サービス Catalyst で見る";

/**
 * 撮影ワールドを添えた共有テキストを組み立てる。
 *
 * ```
 * 本文
 * 🌐 ワールド名 (Created by 制作者)
 * 📷 投稿者 さんの投稿を VR 写真共有サービス Catalyst で見る
 * URL
 * ```
 *
 * 本文が無ければ 1 行目ごと、投稿者が無ければ「投稿者 さんの投稿を」を省く。
 * `url` の扱いと長さの見積もりは `buildShareText` と同じ。
 */
export const buildWorldShareText = (text: string, username: string, url: string, world: ShareWorld): string => {
  const worldLine = `🌐 ${world.name}${world.author ? ` (Created by ${world.author})` : ""}`;
  const linkLine = `📷 ${username ? `${username} さんの投稿を ` : ""}${CATALYST_LABEL}`;
  const tail = `${worldLine}\n${linkLine}`;
  // tail の前後の改行
  const reserved = twtr.getTweetLength(tail) + TWITTER_URL_LENGTH + 2;

  const body =
    twtr.getTweetLength(text) + reserved <= TWEET_MAX_LENGTH
      ? text
      : `${sliceByTweetLength(text, TWEET_MAX_LENGTH - reserved - twtr.getTweetLength(ELLIPSIS))}${ELLIPSIS}`;

  return [body, tail, url].filter(Boolean).join("\n");
};
