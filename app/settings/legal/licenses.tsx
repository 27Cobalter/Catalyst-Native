import { licenses } from "@/lib/licenses";
import { cn } from "@/lib/utils";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const UniChevronRight = withUniwind(ChevronRight);

export type LicenseKey = keyof typeof licenses;

export const LICENSES = Object.keys(licenses)
  .map((w) => {
    const license = licenses[w as unknown as LicenseKey];
    return { id: license.id, name: license.name };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

export default function LegalLicensesPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <FlashList
      data={LICENSES}
      keyExtractor={(w) => w.id}
      className="mt-4 mx-4 rounded-xl bg-white dark:bg-neutral-800 overflow-hidden "
      style={{ paddingBottom: insets.bottom }}
      renderItem={({ item, index }) => {
        return (
          <Pressable
            className={cn(
              "flex-1 flex-row px-4 py-2.5",
              index < LICENSES.length && "border-b border-light-border dark:border-dark-border",
            )}
            onPress={() => router.push(`/settings/legal/license?key=${item.id}`)}
          >
            <Text className="flex-1 text-base text-light-text dark:text-dark-text" numberOfLines={1}>
              {item.name}
            </Text>
            <UniChevronRight className="text-light-icon dark:text-dark-icon" size={20} />
          </Pressable>
        );
      }}
    />
  );
}
