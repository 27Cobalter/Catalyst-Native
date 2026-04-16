import { cn } from "@/lib/utils";
import {
  type BrowserDefinition,
  type BrowserKey,
  getInstalledBrowsers,
  loadSelectedBrowser,
  saveSelectedBrowser,
} from "@/models/browser-settings";
import { Check } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { withUniwind } from "uniwind";

const CheckIcon = withUniwind(Check);

export default function DisplaySettingsPage() {
  const [browsers, setBrowsers] = useState<BrowserDefinition[]>([]);
  const [selectedBrowser, setSelectedBrowser] = useState<BrowserKey>("systemDefault");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [installed, selected] = await Promise.all([getInstalledBrowsers(), loadSelectedBrowser()]);
      setBrowsers(installed);
      setSelectedBrowser(selected);
      setIsLoading(false);
    })();
  }, []);

  const handleSelect = useCallback(async (key: BrowserKey) => {
    setSelectedBrowser(key);
    await saveSelectedBrowser(key);
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
              onPress={() => handleSelect(browser.key)}
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
    </View>
  );
}
