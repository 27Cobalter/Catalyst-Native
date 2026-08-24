// memora が依存する exifr は、読み込み時に画像の向き補正の要否を UA から判定しており、
// `navigator.userAgent.includes("iPad")` を無条件に呼ぶ。
// React Native の `navigator` は存在するが `userAgent` を持たないため、そのまま memora を
// import すると `Cannot read property 'includes' of undefined` でアプリごと落ちる。
//
// 空文字を入れておけば判定はすべて false になり、以降の `match` にも到達しない。
// この補正は memora (exifr) より先に評価される必要があるので、副作用モジュールとして切り出し、
// [image-metadata.ts](./image-metadata.ts) の import 順で先に読ませている。
//
// 上流が RN を見るようになったらこのファイルごと消せる。

const target = globalThis.navigator as { userAgent?: string } | undefined;

if (target && target.userAgent === undefined) {
  target.userAgent = "";
}
