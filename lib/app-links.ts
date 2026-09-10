import AppLinks from "@/constants/app-links.json";

const LOCALE_PREFIX_PATTERN = /^\/(?:ja|en)(?=\/)/;

/**
 * アプリが App Link / Universal Link として引き受けるホストとパス。
 * app.config.js の intentFilters / associatedDomains と同じ定義を共有しているので、
 * ここでの判定結果は OS がアプリに配送してくる URL の集合と一致する。
 */
const CATALYST_HOST = AppLinks.host;
const APP_LINK_PATH_PREFIXES = AppLinks.pathPrefixes;

/**
 * アプリが画面を持っているルート。
 *
 * App Link の pathPrefix は Web 側の URL 空間に合わせて広めに登録しているため、
 * プレフィックスだけで判定すると Web 専用のサブページ (`/status/{id}/likes` など) まで
 * アプリ内遷移の対象になってしまう。このアプリには `+not-found` が無く、
 * 存在しないルートに push すると何も表示されないため、ここで実在するルートに絞る。
 */
const IN_APP_ROUTE_PATTERNS = [
  /^\/status\/[^/]+$/,
  /^\/album\/[^/]+(?:\/edit)?$/,
  /^\/smart-album\/[^/]+(?:\/edit)?$/,
  /^\/contest\/[^/]+$/,
  /^\/tags\/[^/]+$/,
  /^\/theme\/[^/]+$/,
  /^\/user\/[^/]+(?:\/(?:followers|followings))?$/,
];

type AppLink = {
  pathname: string;
  suffix: string;
};

/**
 * OS が App Link としてアプリに配送する URL を、アプリのルート表記に直す。
 * 引き受けないホスト・パスの場合は `null`。ルートが実在するかどうかは判定しない。
 */
const resolveAppLink = (path: string): AppLink | null => {
  let url: URL;

  try {
    url = new URL(path);
  } catch {
    return null;
  }

  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.hostname !== CATALYST_HOST) {
    return null;
  }

  const pathname = url.pathname.replace(LOCALE_PREFIX_PATTERN, "");

  if (!APP_LINK_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  // 末尾のスラッシュは Web 側の表記ゆれなので、ルート判定の前に落としておく
  let normalized = pathname.replace(/\/+$/, "");

  if (normalized.startsWith("/themes/")) {
    normalized = normalized.replace("/themes/", "/theme/");
  } else if (normalized.startsWith("/@")) {
    normalized = `/user/${normalized.slice(2)}`;
  }

  return { pathname: normalized, suffix: `${url.search}${url.hash}` };
};

/**
 * Catalyst の公開 URL を、アプリ内で開けるルートに変換する。
 * アプリが引き受けないホスト・パスや、アプリに対応する画面が無い場合は `null` を返す。
 */
export const getInAppPathFromUrl = (path: string): string | null => {
  const link = resolveAppLink(path);

  if (link === null || !IN_APP_ROUTE_PATTERNS.some((pattern) => pattern.test(link.pathname))) {
    return null;
  }

  return `${link.pathname}${link.suffix}`;
};

/**
 * `+native-intent` 用。アプリ内ルートに変換できない場合は入力をそのまま返す。
 *
 * OS から配送された時点でアプリが開くことは決まっているため、
 * `getInAppPathFromUrl` と違いルートの実在は問わない。
 */
export const getAppPathFromUrl = (path: string): string => {
  const link = resolveAppLink(path);

  return link === null ? path : `${link.pathname}${link.suffix}`;
};

/**
 * この URL をアプリ自身が App Link として引き受けるか。
 * Android では検証済み App Link を `Linking.openURL` に渡すと intent が自分自身に戻ってくるため、
 * 「ブラウザで開く」側でこの判定を使って回避する。
 *
 * 引き受けるかどうかは OS の intent filter が決めるので、アプリ内ルートの有無とは無関係。
 */
export const isSelfHandledAppLink = (path: string): boolean => resolveAppLink(path) !== null;
