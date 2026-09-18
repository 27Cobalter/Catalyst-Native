import { requireOptionalNativeModule } from "expo-modules-core";

type CatalystDownloaderModule = {
  /**
   * @param url ダウンロード元
   * @param relativePath Pictures からの相対パス（例: `Catalyst/Catalyst_20260916_095447_01_original.webp`）
   * @param mimeType 通知タップ時に開くアプリを解決するための MIME タイプ
   */
  enqueueImageDownload(url: string, relativePath: string, mimeType: string): Promise<void>;
};

/** modules/catalyst-downloader の Android 実装。iOS ではネイティブ側が存在しないので null になる */
export const CatalystDownloader = requireOptionalNativeModule<CatalystDownloaderModule>("CatalystDownloader");
