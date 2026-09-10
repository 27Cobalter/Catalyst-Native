import { requireOptionalNativeModule } from "expo";

export type ExternalBrowserModule = {
  /**
   * 指定したパッケージのブラウザーで URL を開く。
   * 起動できなかった場合や、ネイティブモジュールを含まないビルドでは false を返す。
   */
  openUrl(url: string, packageName?: string | null): Promise<boolean>;
};

// ネイティブモジュールを含まないビルド (Expo Go や旧ビルド) では null になる
export default requireOptionalNativeModule<ExternalBrowserModule>("ExternalBrowser");
