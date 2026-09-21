/**
 * フリック操作の解析用ログ。どのコンポーネントがジェスチャを取ったのか、どの位置で操作されたのかを
 * 追うためだけのもので、リリース前に呼び出しごと削除する。
 * `adb logcat` / Metro のログを `[flick]` で絞ると 1 回のフリックの流れが追える。
 *
 * 有効にするときはこの 1 行を `__DEV__` に戻す（このコミットを revert するのでもよい）。
 */
export const FLICK_DEBUG = false;

export function flickLog(component: string, message: string) {
  if (!FLICK_DEBUG) return;
  console.log(`[flick] ${component} ${message}`);
}
