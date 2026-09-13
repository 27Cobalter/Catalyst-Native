import { CatalystDivider, CatalystListItem, CatalystListItemContent, CatalystText } from "@/components/design-system";
import { accountAtom } from "@/models/atoms/account";
import { router, usePathname } from "expo-router";
import { useAtomValue } from "jotai";
import {
  Accessibility,
  Bell,
  Bug,
  ChevronRight,
  FileText,
  Globe2,
  Lock,
  Palette,
  Smile,
  UserCircle,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { cn } from "@/lib/utils";
import { withUniwind } from "uniwind";

type SettingsSection = {
  route: string;
  title: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
};

const UniAccessibility = withUniwind(Accessibility);
const UniBell = withUniwind(Bell);
const UniBug = withUniwind(Bug);
const UniChevronRight = withUniwind(ChevronRight);
const UniFileText = withUniwind(FileText);
const UniGlobe2 = withUniwind(Globe2);
const UniLock = withUniwind(Lock);
const UniPalette = withUniwind(Palette);
const UniSmile = withUniwind(Smile);
const UniUserCircle = withUniwind(UserCircle);

const baseSections: SettingsSection[] = [
  { route: "/settings/account", title: "アカウント", icon: UniUserCircle },
  { route: "/settings/notifications", title: "通知", icon: UniBell },
  { route: "/settings/privacy", title: "プライバシー", icon: UniLock },
  { route: "/settings/display", title: "表示", icon: UniPalette },
  { route: "/settings/accessibility", title: "アクセシビリティ", icon: UniAccessibility },
  { route: "/settings/custom-reactions", title: "カスタムリアクション", icon: UniSmile },
  ...(__DEV__ ? [{ route: "/settings/debug", title: "デバッグ", icon: UniBug }] : []),
  { route: "/settings/legal", title: "法的情報", icon: UniFileText },
];

export function SettingsMenu({ sidebar = false }: { sidebar?: boolean }) {
  const pathname = usePathname();
  const account = useAtomValue(accountAtom);
  const [activityPubSettingsUserId, setActivityPubSettingsUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!account) {
      return;
    }

    let active = true;
    account.credential.client.catalyst.v1.activitypub.settings
      .get({ throwOnError: true })
      .then(({ data }) => {
        if (active) {
          setActivityPubSettingsUserId(
            data.rolloutEligible || data.state === "active" || data.state === "retired" ? account.user.id : null,
          );
        }
      })
      .catch(() => {
        if (active) setActivityPubSettingsUserId(null);
      });

    return () => {
      active = false;
    };
  }, [account]);

  const sections =
    account?.user.id === activityPubSettingsUserId
      ? [
          ...baseSections.slice(0, 3),
          { route: "/settings/activitypub", title: "ActivityPub 連合", icon: UniGlobe2 },
          ...baseSections.slice(3),
        ]
      : baseSections;

  return (
    <ScrollView className="flex-1 bg-light-surface-muted dark:bg-dark-background">
      <View className="bg-light-background dark:bg-dark-surface">
        {sections.map((section, index) => {
          const Icon = section.icon;

          return (
            <View key={section.route}>
              <CatalystListItem
                divided={false}
                accessibilityState={{ selected: sidebar && pathname.startsWith(section.route) }}
                className={cn(
                  "min-h-14 px-5 py-3.5",
                  sidebar && pathname.startsWith(section.route) && "bg-light-surface-muted dark:bg-dark-surface-muted",
                )}
                onPress={() => {
                  if (sidebar) router.replace(section.route as never);
                  else router.push(section.route as never);
                }}
              >
                <Icon className="text-light-icon dark:text-dark-icon" size={22} />
                <CatalystListItemContent className="gap-0">
                  <CatalystText variant="subtitle" className="text-[15px] font-semibold">
                    {section.title}
                  </CatalystText>
                </CatalystListItemContent>
                <UniChevronRight className="text-light-text-subtle dark:text-dark-text-subtle" size={19} />
              </CatalystListItem>
              {index < sections.length - 1 && <CatalystDivider className="ml-14 w-auto" />}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
