import type { NativeAppearance, NavigationTheme } from "@natsuneko-laboratory/react-native-desktop-navigation/native";

// ネイティブ境界は #RRGGBB しか受け取れないため、global.css の oklch を hex 化した値を使う
export const NavigationThemes: Record<"light" | "dark", NavigationTheme> = {
  light: {
    dark: false,
    colors: {
      background: "#ffffff",
      surface: "#f9fafb",
      text: "#11181c",
      mutedText: "#646a6e",
      border: "#d7d7da",
      accent: "#f3b3cf",
      selectedBackground: "#f7eff4",
    },
  },
  dark: {
    dark: true,
    colors: {
      background: "#151718",
      surface: "#1f2122",
      text: "#ecedee",
      mutedText: "#b3b8bc",
      border: "#3d3d3f",
      accent: "#ff88b8",
      selectedBackground: "#392831",
    },
  },
};

// サイドバーは OS のマテリアル・アクセントカラー・ラベル色に任せ、ネイティブアプリらしい見た目にする
export const SidebarAppearance: NativeAppearance = {
  sidebarBackgroundColor: null,
  foregroundColor: null,
  accentColor: null,
};
