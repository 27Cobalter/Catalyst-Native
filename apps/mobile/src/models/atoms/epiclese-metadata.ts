import { atom } from "jotai";
import { atomFamily } from "jotai-family";

// 投稿ごとのメタデータのリビジョン。編集画面で保存したら進め、投稿詳細はこれを見て再取得する
export const metadataRevisionAtomFamily = atomFamily((_statusId: string) => atom(0));
