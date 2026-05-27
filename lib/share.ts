import twtr from "twitter-text";

const TWITTER_URL_LENGTH = 23;
const TWEET_MAX_LENGTH = 280;
const ELLIPSIS = "...";
const SITE_NAME = "Catalyst";

// twitter-text の重み付き文字数カウントに基づいてスライスするヘルパー
// 全角文字（日本語など）は2としてカウントされるため、raw インデックスで
// スライスすると文字数が超過する
const sliceByTweetLength = (
  text: string,
  maxWeightedLength: number,
): string => {
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

export const buildShareText = (
  text: string,
  username: string,
  url: string,
): string => {
  const textLen = twtr.getTweetLength(text);
  const userLen = twtr.getTweetLength(username);
  const titleLen = twtr.getTweetLength(SITE_NAME);
  const embed = " by ".length + " | ".length + "\n\n".length;

  if (
    textLen + userLen + titleLen + TWITTER_URL_LENGTH + embed <=
    TWEET_MAX_LENGTH
  ) {
    return `${text} by ${username} | ${SITE_NAME} ${url}`;
  }

  const ellipsisLen = twtr.getTweetLength(ELLIPSIS);
  const available =
    TWEET_MAX_LENGTH - userLen - titleLen - TWITTER_URL_LENGTH - embed;
  const truncated = sliceByTweetLength(text, available - ellipsisLen);
  return `${truncated}${ELLIPSIS} by ${username} | ${SITE_NAME}\n\n${url}`.trim();
};
