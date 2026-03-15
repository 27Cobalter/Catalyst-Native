import { cn } from "@/lib/utils";
import { openUrlWithBrowser } from "@/models/browser-settings";
import { router } from "expo-router";
import { ChevronRight, ExternalLink } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { withUniwind } from "uniwind";

type LinkItem = {
  title: string;
  url: string;
};

type NavigationItem = {
  title: string;
  route: string;
};

const linkItems: LinkItem[] = [
  { title: "広告ポリシー", url: "https://docs.natsuneko.com/ja-jp/catalyst/ads/" },
  { title: "Cookie ポリシー", url: "https://docs.natsuneko.com/ja-jp/catalyst/cookies/" },
  { title: "プライバシーポリシー", url: "https://docs.natsuneko.com/ja-jp/catalyst/privacy/" },
  { title: "利用規約", url: "https://docs.natsuneko.com/ja-jp/catalyst/terms/" },
];

const navigationItems: NavigationItem[] = [{ title: "オープンソースソフトウェア", route: "/settings/legal/licenses" }];

const UniExternalLink = withUniwind(ExternalLink);
const UniChevronRight = withUniwind(ChevronRight);

export default function LegalSettingsPage() {
  const allItems = [
    ...linkItems.map((item) => ({ ...item, type: "link" as const })),
    ...navigationItems.map((item) => ({ ...item, type: "navigation" as const })),
  ];

  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      <View className="mt-4 mx-4 rounded-xl bg-white dark:bg-neutral-800 overflow-hidden">
        {allItems.map((item, index) => (
          <Pressable
            key={item.title}
            className={cn(
              "px-4 py-3.5 flex-row items-center",
              index < allItems.length - 1 && "border-b border-light-border dark:border-dark-border",
            )}
            onPress={async () => {
              if (item.type === "link") {
                await openUrlWithBrowser(item.url);
              } else {
                router.push(item.route as never);
              }
            }}
          >
            <Text className="flex-1 text-base text-light-text dark:text-dark-text">{item.title}</Text>
            {item.type === "link" ? (
              <UniExternalLink className="text-light-icon dark:text-dark-icon" size={18} />
            ) : (
              <UniChevronRight className="text-light-icon dark:text-dark-icon" size={20} />
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}
