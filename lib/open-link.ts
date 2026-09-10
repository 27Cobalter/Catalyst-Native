import { getInAppPathFromUrl } from "@/lib/app-links";
import { openUrlWithBrowser } from "@/models/browser-settings";
import { router, type Href } from "expo-router";

/**
 * 本文や通知などに含まれるリンクを開く。
 *
 * Catalyst 自身が App Link として引き受ける URL はアプリ内で遷移する。
 * OS の App Link 解決に任せると一度アプリの外に出てから戻ってくることになり、
 * 遷移が遅いうえ「対応リンクを開く」が無効な端末ではブラウザに出てしまうため、
 * ここで明示的にルーティングして挙動を揃える。
 *
 * 「ブラウザで開く」のようにブラウザを開くこと自体が目的の場合は
 * `openUrlWithBrowser` を直接使うこと。
 */
export const openLink = async (url: string): Promise<void> => {
  const path = getInAppPathFromUrl(url);

  if (path !== null) {
    router.push(path as Href);
    return;
  }

  await openUrlWithBrowser(url);
};
