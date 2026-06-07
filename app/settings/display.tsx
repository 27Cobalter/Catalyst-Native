import { cn } from "@/lib/utils";
import {
  type BrowserDefinition,
  type BrowserKey,
  getInstalledBrowsers,
  loadSelectedBrowser,
  saveSelectedBrowser,
} from "@/models/browser-settings";
import { timelineImageQualityAtom, timelineWifiUpgradeAtom } from "@/models/atoms/image-quality";
import {
  type TimelineImageQuality,
  loadTimelineImageQuality,
  loadWifiUpgrade,
  saveTimelineImageQuality,
  saveWifiUpgrade,
} from "@/models/image-quality-settings";
import { Check } from "lucide-react-native";
import { useAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Switch, Text, View, useColorScheme } from "react-native";
import { withUniwind } from "uniwind";

const CheckIcon = withUniwind(Check);

type QualityOption = {
  key: TimelineImageQuality;
  displayName: string;
  description: string;
};

const QUALITY_OPTIONS: QualityOption[] = [
  {
    key: "low",
    displayName: "低画質",
    description: "通信量を節約します",
  },
  {
    key: "medium",
    displayName: "高画質",
    description: "よりきれいな画像を表示します",
  },
];

export default function DisplaySettingsPage() {
  const [browsers, setBrowsers] = useState<BrowserDefinition[]>([]);
  const [selectedBrowser, setSelectedBrowser] = useState<BrowserKey>("systemDefault");
  const [quality, setQuality] = useAtom(timelineImageQualityAtom);
  const [wifiUpgrade, setWifiUpgrade] = useAtom(timelineWifiUpgradeAtom);
  const [isLoading, setIsLoading] = useState(true);
  const colorScheme = useColorScheme() ?? "light";

  useEffect(() => {
    Promise.all([
      getInstalledBrowsers(),
      loadSelectedBrowser(),
      loadTimelineImageQuality(),
      loadWifiUpgrade(),
    ]).then(([installed, selected, q, w]) => {
      setBrowsers(installed);
      setSelectedBrowser(selected);
      setQuality(q);
      setWifiUpgrade(w);
      setIsLoading(false);
    });
  }, []);

  const handleBrowserSelect = useCallback(async (key: BrowserKey) => {
    setSelectedBrowser(key);
    await saveSelectedBrowser(key);
  }, []);

  const handleQualitySelect = useCallback(async (key: TimelineImageQuality) => {
    setQuality(key);
    await saveTimelineImageQuality(key);
  }, []);

  const handleWifiUpgradeChange = useCallback(async (enabled: boolean) => {
    setWifiUpgrade(enabled);
    await saveWifiUpgrade(enabled);
  }, []);

  if (isLoading) {
    return <View className="flex-1" />;
  }

  return (
    <View className="flex-1">
      <View className="mt-4 mx-4">
        <Text className="px-4 pb-1.5 text-xs text-light-gray dark:text-dark-gray uppercase">
          デフォルトブラウザー
        </Text>
        <View className="rounded-xl bg-light-surface dark:bg-dark-surface overflow-hidden">
          {browsers.map((browser, index) => (
            <Pressable
              key={browser.key}
              onPress={() => handleBrowserSelect(browser.key)}
              className={cn(
                "px-4 py-3 flex-row items-center justify-between",
                index < browsers.length - 1 && "border-b border-light-border dark:border-dark-border",
              )}
            >
              <Text className="text-base text-light-text dark:text-dark-text">{browser.displayName}</Text>
              {selectedBrowser === browser.key && (
                <CheckIcon className="text-light-tint dark:text-dark-tint" size={18} />
              )}
            </Pressable>
          ))}
        </View>
        <Text className="px-4 pt-1.5 text-xs text-light-gray dark:text-dark-gray">
          リンクを開く際に使用するブラウザーを選択してください。インストールされているブラウザーのみが表示されます。
        </Text>
      </View>

      <View className="mt-6 mx-4">
        <Text className="px-4 pb-1.5 text-xs text-light-gray dark:text-dark-gray uppercase">
          タイムラインの画像画質
        </Text>
        <View className="rounded-xl bg-light-surface dark:bg-dark-surface overflow-hidden">
          {QUALITY_OPTIONS.map((option, index) => (
            <Pressable
              key={option.key}
              onPress={() => handleQualitySelect(option.key)}
              className={cn(
                "px-4 py-3 flex-row items-center justify-between",
                index < QUALITY_OPTIONS.length - 1 && "border-b border-light-border dark:border-dark-border",
              )}
            >
              <View className="flex-1">
                <Text className="text-base text-light-text dark:text-dark-text">{option.displayName}</Text>
                <Text className="text-xs text-light-text-muted dark:text-dark-text-muted mt-0.5">
                  {option.description}
                </Text>
              </View>
              {quality === option.key && (
                <CheckIcon className="text-light-tint dark:text-dark-tint" size={18} />
              )}
            </Pressable>
          ))}
        </View>
        <Text className="px-4 pt-1.5 text-xs text-light-gray dark:text-dark-gray">
          タイムラインに表示される画像の画質を選択してください。
        </Text>
      </View>

      <View className="mt-6 mx-4">
        <Text className="px-4 pb-1.5 text-xs text-light-gray dark:text-dark-gray uppercase">
          Wi-Fi接続
        </Text>
        <View className="rounded-xl bg-light-surface dark:bg-dark-surface overflow-hidden">
          <View className="px-4 py-3 flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-base text-light-text dark:text-dark-text">Wi-Fi接続時にさらに高画質を使用</Text>
              <Text className="text-xs text-light-text-muted dark:text-dark-text-muted mt-0.5">
                {quality === "low"
                  ? "Wi-Fi 接続時は高画質、それ以外は低画質を使用します"
                  : "Wi-Fi 接続時はさらに高画質、それ以外は高画質を使用します"}
              </Text>
            </View>
            <Switch
              value={wifiUpgrade}
              onValueChange={handleWifiUpgradeChange}
              trackColor={{
                false: colorScheme === "dark" ? "#3a3a3a" : "#d1d1d6",
                true: colorScheme === "dark" ? "#0a84ff" : "#007aff",
              }}
              thumbColor="white"
            />
          </View>
        </View>
        <Text className="px-4 pt-1.5 text-xs text-light-gray dark:text-dark-gray">
          Wi-Fi 接続時は自動的により高い画質で画像を読み込みます。
        </Text>
      </View>
    </View>
  );
}
