import { Image, ListFilter, RefreshCw, Smile, SquarePen } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { Page, PageHeader } from "../components/page";
import { SHORTCUTS } from "../components/shortcut-scope";
import { TimelineSkeleton } from "../components/status-skeleton";
import {
  Avatar,
  Button,
  Divider,
  IconButton,
  SegmentedTabs,
  useHover,
  withShortcut,
  type SegmentedTab,
} from "../components/ui";
import { useWindowClass } from "../layout/breakpoints";
import { useOpenScene } from "../scenes/scene-host";

const UniImage = withUniwind(Image);
const UniSmile = withUniwind(Smile);
const UniListFilter = withUniwind(ListFilter);
const UniRefreshCw = withUniwind(RefreshCw);
const UniSquarePen = withUniwind(SquarePen);

type Timeline = "recommended" | "following";

const TIMELINES: SegmentedTab<Timeline>[] = [
  { key: "recommended", label: "おすすめ" },
  { key: "following", label: "フォロー中" },
];

// タイムライン先頭の投稿欄。クリックすると投稿作成 (別ウィンドウ) を開く
const Composer = () => {
  const openScene = useOpenScene();
  const { hovered, hoverProps } = useHover();

  return (
    <View>
      <View className="flex-row gap-3 px-5 py-4">
        <Avatar />
        <View className="flex-1 gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="投稿を作成"
            tooltip={withShortcut("投稿を作成", SHORTCUTS.compose)}
            focusable
            className="min-h-10 justify-center"
            onPress={() => openScene({ type: "compose" })}
            {...hoverProps}
          >
            <Text
              className={
                hovered
                  ? "text-lg text-light-text-muted dark:text-dark-text-muted"
                  : "text-lg text-light-text-subtle dark:text-dark-text-subtle"
              }
            >
              いまどうしてる？
            </Text>
          </Pressable>
          <Divider />
          <View className="flex-row items-center">
            <IconButton label="画像を追加">
              <UniImage size={18} className="text-light-link dark:text-dark-link" />
            </IconButton>
            <IconButton label="絵文字を追加">
              <UniSmile size={18} className="text-light-link dark:text-dark-link" />
            </IconButton>
            <View className="flex-1" />
            <Button label="投稿" disabled />
          </View>
        </View>
      </View>
      <Divider />
    </View>
  );
};

export const HomeScreen = () => {
  const [timeline, setTimeline] = useState<Timeline>("recommended");
  const openScene = useOpenScene();
  // サイドバーがレールに畳まれるとフッターの「投稿する」が見えなくなるため、ヘッダーに代わりのボタンを出す
  const sidebarCollapsed = useWindowClass() !== "expanded";

  return (
    <Page
      header={({ compact }) => (
        <PageHeader
          title="ホーム"
          compact={compact}
          actions={
            <>
              <IconButton label="更新" shortcut={SHORTCUTS.refresh}>
                <UniRefreshCw size={16} className="text-light-icon dark:text-dark-icon" />
              </IconButton>
              <IconButton label="表示設定">
                <UniListFilter size={16} className="text-light-icon dark:text-dark-icon" />
              </IconButton>
              {sidebarCollapsed && (
                <IconButton
                  label="投稿する"
                  shortcut={SHORTCUTS.compose}
                  onPress={() => openScene({ type: "compose" })}
                >
                  <UniSquarePen size={16} className="text-light-icon dark:text-dark-icon" />
                </IconButton>
              )}
            </>
          }
        >
          <SegmentedTabs tabs={TIMELINES} value={timeline} onChange={setTimeline} />
        </PageHeader>
      )}
    >
      {/* 狭いウィンドウではタイムラインを優先し、投稿はヘッダーのボタンから行う */}
      {!sidebarCollapsed && <Composer />}
      <TimelineSkeleton prefix={timeline} />
    </Page>
  );
};
