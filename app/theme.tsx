import { Tab, Tabs } from "@/components/tabs";
import { WeeklyThemeList } from "@/components/theme/list";
import type { TimelineHandle } from "@/components/timeline/base";
import { useScrollToTop } from "expo-router/react-navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";

const TABS: Tab[] = [
  { key: "open", label: "開催中" },
  { key: "closed", label: "アーカイブ" },
];

export default function ThemeScreen() {
  const [activeTab, setActiveTab] = useState(TABS[0].key);
  const openRef = useRef<TimelineHandle>(null);
  const closedRef = useRef<TimelineHandle>(null);
  const scroller = useRef<{ scrollToTop: () => void }>(null);
  const scrollHandler = useMemo(
    () => ({
      scrollToTop: () => (activeTab === "open" ? openRef.current : closedRef.current)?.scrollToTop(),
    }),
    [activeTab],
  );

  useEffect(() => {
    scroller.current = scrollHandler;
  }, [scrollHandler]);
  useScrollToTop(scroller);

  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      <Tabs
        tabs={TABS}
        onTabChange={(tab) => setActiveTab(tab.key)}
        renderScene={(tab) =>
          tab.key === "open" ? <WeeklyThemeList ref={openRef} state="open" /> : <WeeklyThemeList ref={closedRef} state="closed" />
        }
      />
    </View>
  );
}
