import { Bell, CheckCheck, Settings2 } from "lucide-react-native";
import { useState } from "react";
import { withUniwind } from "uniwind";
import { Page, PageHeader } from "../components/page";
import { Button, EmptyState, IconButton, SegmentedTabs, type SegmentedTab } from "../components/ui";
import { useOpenScene } from "../scenes/scene-host";

const UniBell = withUniwind(Bell);
const UniCheckCheck = withUniwind(CheckCheck);
const UniSettings2 = withUniwind(Settings2);

type Filter = "all" | "mentions" | "reactions";

const FILTERS: SegmentedTab<Filter>[] = [
  { key: "all", label: "すべて" },
  { key: "mentions", label: "メンション" },
  { key: "reactions", label: "リアクション" },
];

export const NotificationsScreen = () => {
  const [filter, setFilter] = useState<Filter>("all");
  const openScene = useOpenScene();

  return (
    <Page
      header={({ compact }) => (
        <PageHeader
          title="通知"
          compact={compact}
          actions={
            <>
              <IconButton label="すべて既読にする">
                <UniCheckCheck size={16} className="text-light-icon dark:text-dark-icon" />
              </IconButton>
              <IconButton label="通知の設定" onPress={() => openScene({ type: "settings" }, "stack")}>
                <UniSettings2 size={16} className="text-light-icon dark:text-dark-icon" />
              </IconButton>
            </>
          }
        >
          <SegmentedTabs tabs={FILTERS} value={filter} onChange={setFilter} />
        </PageHeader>
      )}
    >
      <EmptyState
        icon={<UniBell size={24} className="text-light-toggle-icon dark:text-dark-toggle-icon" />}
        title="通知はまだありません"
        description="フォローやリアクション、メンションがあるとここに表示されます。Windows の通知をオンにすると、アプリを閉じていても受け取れます。"
        action={
          <Button
            tone="secondary"
            label="Windows の通知を設定"
            onPress={() => openScene({ type: "settings" }, "stack")}
          />
        }
      />
    </Page>
  );
};
