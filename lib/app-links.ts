const CATALYST_HOST = "catalyst.natsuneko.com";
const LOCALE_PREFIX_PATTERN = /^\/(?:ja|en)(?=\/)/;

/**
 * Catalyst 自身が検証済み App Link として処理するホストの URL かどうか。
 * Android では該当する URL を暗黙の Intent で開くと Catalyst に戻ってきてしまう。
 */
export const isCatalystUrl = (url: string): boolean => {
  try {
    const { protocol, hostname } = new URL(url);

    return (protocol === "https:" || protocol === "http:") && hostname === CATALYST_HOST;
  } catch {
    return false;
  }
};

export const getAppPathFromUrl = (path: string): string => {
  try {
    const url = new URL(path);

    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.hostname !== CATALYST_HOST) {
      return path;
    }

    let pathname = url.pathname.replace(LOCALE_PREFIX_PATTERN, "");

    if (pathname.startsWith("/themes/")) {
      pathname = pathname.replace("/themes/", "/theme/");
    } else if (pathname.startsWith("/@")) {
      pathname = `/user/${pathname.slice(2)}`;
    }

    return `${pathname}${url.search}${url.hash}`;
  } catch {
    return path;
  }
};
