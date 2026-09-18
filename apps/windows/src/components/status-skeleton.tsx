import { cn } from "cn";
import {
  AppWindow,
  Copy,
  Ellipsis,
  Flag,
  Heart,
  Link,
  MessageCircle,
  Repeat2,
  Share,
  VolumeX,
} from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { isMultiWindowSupported } from "../scenes/window-manager";
import { useOpenScene, useSceneHost } from "../scenes/scene-host";
import { useContextMenu, usePointerButtons, type MenuItem } from "./context-menu";
import { Divider, IconButton, Skeleton, useHover } from "./ui";

const UniAppWindow = withUniwind(AppWindow);
const UniCopy = withUniwind(Copy);
const UniEllipsis = withUniwind(Ellipsis);
const UniFlag = withUniwind(Flag);
const UniHeart = withUniwind(Heart);
const UniLink = withUniwind(Link);
const UniMessageCircle = withUniwind(MessageCircle);
const UniRepeat2 = withUniwind(Repeat2);
const UniShare = withUniwind(Share);
const UniVolumeX = withUniwind(VolumeX);

const ICON = "text-light-icon dark:text-dark-icon";

type ActionProps = {
  label: string;
  icon: React.ReactNode;
  count?: string;
};

const StatusAction = ({ label, icon, count }: ActionProps) => {
  return (
    <View className="flex-row items-center">
      <IconButton label={label}>{icon}</IconButton>
      {count && <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">{count}</Text>}
    </View>
  );
};

export const StatusActions = ({ className }: { className?: string }) => {
  return (
    <View className={cn("-ml-2 flex-row items-center gap-6", className)}>
      <StatusAction label="返信" icon={<UniMessageCircle size={16} className={ICON} />} count="12" />
      <StatusAction label="リポスト" icon={<UniRepeat2 size={16} className={ICON} />} count="3" />
      <StatusAction label="リアクション" icon={<UniHeart size={16} className={ICON} />} count="48" />
      <StatusAction label="共有" icon={<UniShare size={16} className={ICON} />} />
    </View>
  );
};

// 投稿の右クリックメニューと「…」ボタンで共通の項目
export const useStatusMenu = (id: string) => {
  const openScene = useOpenScene();

  return (): MenuItem[] => [
    ...(isMultiWindowSupported
      ? [
          {
            label: "新しいウィンドウで開く",
            icon: <UniAppWindow size={14} className={ICON} />,
            onPress: () => openScene({ type: "status", id }, "window"),
          },
          { type: "separator" } as const,
        ]
      : []),
    { label: "リンクをコピー", icon: <UniLink size={14} className={ICON} />, onPress: () => {} },
    { label: "本文をコピー", icon: <UniCopy size={14} className={ICON} />, shortcut: "Ctrl+C", onPress: () => {} },
    { type: "separator" },
    { label: "このユーザーをミュート", icon: <UniVolumeX size={14} className={ICON} />, onPress: () => {} },
    {
      label: "通報する",
      icon: <UniFlag size={14} className="text-light-error dark:text-dark-error" />,
      destructive: true,
      onPress: () => {},
    },
  ];
};

type Props = {
  id?: string;
  media?: boolean;
};

// タイムラインの 1 投稿分のワイヤーフレーム。
// クリックで詳細 (幅があれば右ペイン)、中クリックで別ウィンドウ、右クリックでコンテキストメニュー
export const StatusSkeleton = ({ id = "placeholder", media = false }: Props) => {
  const openScene = useOpenScene();
  const { paneScene } = useSceneHost();
  const menu = useContextMenu();
  const items = useStatusMenu(id);
  const { hovered, hoverProps } = useHover();
  const selected = paneScene?.type === "status" && paneScene.id === id;

  const pointer = usePointerButtons({
    onContextMenu: (x, y) => menu.show({ x, y, items: items() }),
    onMiddleClick: () => openScene({ type: "status", id }, "window"),
  });

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="投稿を開く"
        accessibilityState={{ selected }}
        focusable
        className={cn(
          "flex-row gap-3 px-5 pb-2 pt-3",
          hovered && "bg-light-surface dark:bg-dark-surface",
          selected && "bg-light-toggle dark:bg-dark-toggle",
        )}
        onPress={() => openScene({ type: "status", id })}
        {...pointer}
        {...hoverProps}
      >
        {/* 詳細ペインに表示中の投稿を示す、リスト左端の選択インジケーター (Fluent の ListView と同じ位置) */}
        {selected && (
          <View className="absolute bottom-3 left-0 top-3 w-[3px] rounded-full bg-light-accent dark:bg-dark-accent" />
        )}
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="プロフィールを開く"
          focusable
          onPress={() => openScene({ type: "user", screenName: `user${id}` })}
        >
          <Skeleton className="size-10 rounded-full" />
        </Pressable>
        <View className="flex-1 gap-2">
          <View className="flex-row items-center gap-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-16" />
            <View className="flex-1" />
            <IconButton
              label="その他の操作"
              className="-my-1 size-7"
              onPress={(event) => menu.show({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY, items: items() })}
            >
              <UniEllipsis size={16} className={ICON} />
            </IconButton>
          </View>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          {media && <Skeleton className="mt-1 aspect-video w-full rounded-lg" />}
          <StatusActions />
        </View>
      </Pressable>
      <Divider />
    </View>
  );
};

export const TimelineSkeleton = ({ count = 6, prefix = "status" }: { count?: number; prefix?: string }) => {
  return (
    <View>
      {Array.from({ length: count }, (_, index) => (
        <StatusSkeleton key={index} id={`${prefix}-${index}`} media={index % 3 === 1} />
      ))}
    </View>
  );
};
