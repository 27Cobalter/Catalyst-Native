import type { ExternalBrowserModule } from "./ExternalBrowserModule";

// Web ではブラウザーを指定して開くという概念が無いため、常にフォールバックさせる
export default null as ExternalBrowserModule | null;
