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
 * Catalyst の公開 URL を、アプリ内で開けるルートに変換する。
 * アプリが引き受けないホスト・パスの場合は `null` を返す。
 */
export const getInAppPathFromUrl = (path: string): string | null => {
  let url: URL;

  try {
    url = new URL(path);
  } catch {
    return null;
  }

  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.hostname !== CATALYST_HOST) {
    return null;
  }

  let pathname = url.pathname.replace(LOCALE_PREFIX_PATTERN, "");

  if (!APP_LINK_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  if (pathname.startsWith("/themes/")) {
    pathname = pathname.replace("/themes/", "/theme/");
  } else if (pathname.startsWith("/@")) {
    pathname = `/user/${pathname.slice(2)}`;
  }

  return `${pathname}${url.search}${url.hash}`;
};

/**
 * `+native-intent` 用。アプリ内ルートに変換できない場合は入力をそのまま返す。
 */
export const getAppPathFromUrl = (path: string): string => getInAppPathFromUrl(path) ?? path;

/**
 * この URL をアプリ自身が App Link として引き受けるか。
 * Android では検証済み App Link を `Linking.openURL` に渡すと intent が自分自身に戻ってくるため、
 * 「ブラウザで開く」側でこの判定を使って回避する。
 */
export const isSelfHandledAppLink = (path: string): boolean => getInAppPathFromUrl(path) !== null;
