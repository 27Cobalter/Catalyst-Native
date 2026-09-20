// CSS ファイルの side-effect import (import "@/global.css") 用の型宣言
declare module "*.css";

declare module 'react-native-config' {
  export interface NativeConfig {
    CATALYST_CLIENT_ID?: string;
    CATALYST_CLIENT_SECRET?: string;
  }

  export const Config: NativeConfig
  export default Config
}