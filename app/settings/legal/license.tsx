import { licenses } from "@/lib/licenses";
import { Stack, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LicenseKey } from "./licenses";

export default function LegalLicensesPage() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const insets = useSafeAreaInsets();
  const license = licenses[key as unknown as LicenseKey];

  return (
    <View style={{ paddingBottom: insets.bottom }}>
      <Stack.Screen options={{ title: license.name }} />
      <Text className="text-sm text-light-text dark:text-dark-text">{license.content}</Text>
    </View>
  );
}
