import { createContext, useCallback, useContext, useState } from "react";
import type { LayoutChangeEvent } from "react-native";

// WinUI の NavigationView (CompactModeThresholdWidth = 641 / ExpandedModeThresholdWidth = 1008) と同じ閾値。
// 値はすべて effective pixel (DIP) なので、拡大率 125% / 150% のディスプレイでも同じ見た目の段階で切り替わる
export const WINDOW_BREAKPOINTS = {
  medium: 641,
  expanded: 1008,
} as const;

export type WindowClass = "compact" | "medium" | "expanded";

export const getWindowClass = (width: number): WindowClass => {
  if (width >= WINDOW_BREAKPOINTS.expanded) return "expanded";
  if (width >= WINDOW_BREAKPOINTS.medium) return "medium";
  return "compact";
};

// useWindowDimensions は React Native のインスタンスに 1 つで、別ウィンドウ (同じ JS ランタイムの別 island) の大きさを表せない。
// そのためウィンドウごとのルートで計測した幅を Context で配る (AppShell の WindowSizeProvider)
export const WindowWidthContext = createContext(0);

// ウィンドウ全体の幅から決まるサイズクラス。サイドバーの開閉などシェル単位の判断に使う
export const useWindowClass = () => getWindowClass(useContext(WindowWidthContext));

// ページ内のカラム構成はサイドバーの開閉でも変わるため、ウィンドウ幅ではなく実際に割り当てられた幅で判断する
export const CONTENT_BREAKPOINTS = {
  // メインカラム (600) + 右カラム (320) + 余白
  rightRail: 960,
  // メインカラム (600) + 詳細ペイン (最低 520)
  detailPane: 1120,
} as const;

export const MAIN_COLUMN_WIDTH = 600;

export const useContainerWidth = () => {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    // リサイズ中は小数点以下の揺れで何度も再レンダリングされるため丸める
    const next = Math.round(event.nativeEvent.layout.width);
    setWidth((current) => (current === next ? current : next));
  }, []);

  return { width, onLayout };
};
