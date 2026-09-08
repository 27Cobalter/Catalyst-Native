import { SettingsMenu } from "@/components/settings/menu";
import { isIPad } from "@/lib/device-layout";
import { Redirect } from "expo-router";
import { useWindowDimensions } from "react-native";

export default function SettingsPage() {
  const { width } = useWindowDimensions();
  return isIPad && width >= 768 ? <Redirect href="/settings/account" /> : <SettingsMenu />;
}
