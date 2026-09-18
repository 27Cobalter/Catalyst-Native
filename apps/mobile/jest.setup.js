// expo の winter ランタイムは globalThis.structuredClone を遅延ゲッターとして
// @ungap/structured-clone から解決するが、@ungap/structured-clone 自身が読み込み中に
// structuredClone を参照するため、最初のアクセスがそのモジュール経由だと循環 require で失敗する。
// テスト開始前にゲッターを評価して解決を済ませておく
void globalThis.structuredClone;
