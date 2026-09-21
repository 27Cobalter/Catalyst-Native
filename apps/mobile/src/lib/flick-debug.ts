/**
 * フリック操作の解析用ログ。どのコンポーネントがジェスチャを取ったのか、どの位置で操作されたのかを
 * 追うためだけのもので、リリース前に呼び出しごと削除する。
 * `adb logcat` / Metro のログを `[flick]` で絞ると 1 回のフリックの流れが追える。
 */
export const FLICK_DEBUG = __DEV__;

export function flickLog(component: string, message: string) {
  if (!FLICK_DEBUG) return;
  console.log(`[flick] ${component} ${message}`);
}
