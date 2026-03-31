import { ContestList } from "@/components/explorer/contests/list";
import { Tab, Tabs } from "@/components/tabs";
import { TimelineHandle } from "@/components/timeline/base";
import { useScrollToTop } from "@react-navigation/native";
import { Search, X } from "lucide-react-native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { withUniwind } from "uniwind";
import { v4 } from "uuid";

const UniSearchIcon = withUniwind(Search);
const UniTimesIcon = withUniwind(X);

const TABS: Tab[] = [
  { key: "current", label: "開催中" },
  { key: "upcoming", label: "開催予定" },
  { key: "archive", label: "アーカイブ" },
];

const CURRENT_STATES = ["opening", "voting", "closing", "electing"];
const UPCOMING_STATES = ["published"];
const ARCHIVE_STATES = ["closed"];

export default function ContestScreen() {
  const [inputState, setInputState] = useState("");
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState(TABS[0].key);
  const [focused, setFocused] = useState(false);
  const [stateKey, setStateKey] = useState(v4());

  const currentRef = useRef<TimelineHandle>(null);
  const upcomingRef = useRef<TimelineHandle>(null);
  const archiveRef = useRef<TimelineHandle>(null);

  const runQuery = useCallback(() => {
    setQuery(inputState);
    setStateKey(v4());
  }, [inputState]);

  const scroller = useRef<{ scrollToTop: () => void }>(null);
  const scrollHandler = useMemo(
    () => ({
      scrollToTop: () => {
        if (activeTab === "current") currentRef.current?.scrollToTop();
        else if (activeTab === "upcoming") upcomingRef.current?.scrollToTop();
        else if (activeTab === "archive") archiveRef.current?.scrollToTop();
      },
    }),
    [activeTab],
  );

  scroller.current = scrollHandler;
  useScrollToTop(scroller);

  return (
    <View className="flex-col flex-1 bg-light-background dark:bg-dark-background">
      <View className="px-4">
        <View className="flex flex-row items-center px-2 mt-1 gap-x-2 rounded-lg bg-neutral-200 dark:bg-neutral-800">
          <UniSearchIcon size={24} className="text-light-icon dark:text-dark-icon" />
          <TextInput
            className="w-full h-8 shrink-0 android:h-10 text-black dark:text-white placeholder-light-icon dark:placeholder-dark-icon"
            value={inputState}
            onChangeText={setInputState}
            onFocus={() => setFocused(true)}
            onSubmitEditing={runQuery}
            placeholder="コンテストを検索..."
          />
          {focused && (
            <UniTimesIcon
              size={24}
              className="text-light-icon dark:text-dark-icon"
              onPress={() => {
                setInputState("");
                setFocused(false);
              }}
            />
          )}
        </View>
      </View>
      <View className="flex-1">
        <Tabs
          tabs={TABS}
          onTabChange={(w) => setActiveTab(w.key)}
          renderScene={(w) => {
            switch (w.key) {
              case "current":
                return (
                  <ContestList
                    ref={currentRef}
                    key={stateKey}
                    states={CURRENT_STATES}
                    query={query || undefined}
                  />
                );
              case "upcoming":
                return (
                  <ContestList
                    ref={upcomingRef}
                    key={stateKey}
                    states={UPCOMING_STATES}
                    query={query || undefined}
                  />
                );
              case "archive":
                return (
                  <ContestList
                    ref={archiveRef}
                    key={stateKey}
                    states={ARCHIVE_STATES}
                    query={query || undefined}
                  />
                );
            }
          }}
        />
      </View>
    </View>
  );
}
