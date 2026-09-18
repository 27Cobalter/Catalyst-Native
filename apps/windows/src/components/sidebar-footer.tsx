import type { SidebarFooterProps } from "@natsuneko-laboratory/react-native-desktop-navigation/native";
import { cn } from "cn";
import { LogIn, Settings, SquarePen } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { useOpenScene } from "../scenes/scene-host";
import { SHORTCUTS } from "./shortcut-scope";
import { Avatar, Button, IconButton, useHover, withShortcut } from "./ui";

const UniLogIn = withUniwind(LogIn);
const UniSettings = withUniwind(Settings);
const UniSquarePen = withUniwind(SquarePen);

export type SidebarAccount = {
  displayName: string;
  screenName: string;
};

type Props = SidebarFooterProps & {
  account: SidebarAccount | null;
  onLogin?: () => void;
};

const AccountButton = ({ account, onPress }: { account: SidebarAccount | null; onPress?: () => void }) => {
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={account ? `${account.displayName} のプロフィール` : "アカウント"}
      focusable
      className={cn(
        "flex-1 flex-row items-center gap-2.5 rounded p-1.5",
        hovered && "bg-light-overlay dark:bg-dark-overlay",
      )}
      onPress={onPress}
      {...hoverProps}
    >
      <Avatar name={account?.displayName ?? "?"} size="sm" />
      <View className="flex-1">
        <Text numberOfLines={1} className="text-[13px] font-semibold text-light-text dark:text-dark-text">
          {account?.displayName ?? "ゲスト"}
        </Text>
        <Text numberOfLines={1} className="text-xs text-light-text-muted dark:text-dark-text-muted">
          {account ? `@${account.screenName}` : "ログインしていません"}
        </Text>
      </View>
    </Pressable>
  );
};

// サイドバー下部: 主要 CTA (投稿 / ログイン) とアカウント・設定。
// NavigationView のペインが閉じている (アイコンのみのレール) 間は native 側で非表示になるため、
// 同じ操作は各画面のヘッダーとキーボードショートカットからも行えるようにしている
export const SidebarFooter = ({ account, onLogin }: Props) => {
  const openScene = useOpenScene();

  return (
    <View className="gap-3 px-3 pb-3 pt-2">
      {account ? (
        <Button
          size="lg"
          label="投稿する"
          tooltip={withShortcut("投稿する", SHORTCUTS.compose)}
          icon={<UniSquarePen size={16} className="text-light-accent-foreground dark:text-dark-accent-foreground" />}
          onPress={() => openScene({ type: "compose" })}
        />
      ) : (
        <Button
          size="lg"
          label="ログイン"
          icon={<UniLogIn size={16} className="text-light-accent-foreground dark:text-dark-accent-foreground" />}
          onPress={onLogin}
        />
      )}
      <View className="flex-row items-center gap-1">
        <AccountButton
          account={account}
          onPress={() => account && openScene({ type: "user", screenName: account.screenName }, "stack")}
        />
        <IconButton label="設定" shortcut={SHORTCUTS.settings} onPress={() => openScene({ type: "settings" }, "stack")}>
          <UniSettings size={18} className="text-light-icon dark:text-dark-icon" />
        </IconButton>
      </View>
    </View>
  );
};
