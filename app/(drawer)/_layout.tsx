import { Fonts } from "@/constants/theme";
import { getCdnUrl } from "@/lib/media";
import { accountAtom } from "@/models/atoms/account";
import { DrawerActions } from "@react-navigation/native";
import { router, useSegments } from "expo-router";
import { Image } from "expo-image";
import { Drawer } from "expo-router/drawer";
import { useAtomValue } from "jotai";
import { Cog, Hamburger, Images, Trophy, User } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Route = {
  name: string;
  href: string;
  icon: () => React.ReactNode;
};

const HEADER_ROUTES: Route[] = [
  { name: "プロフィール", href: "/profile", icon: () => <User size={32} /> },
  { name: "コンテスト", href: "/contest", icon: () => <Trophy size={32} /> },
  { name: "ギャラリー", href: "/gallery", icon: () => <Images size={32} /> },
];

const FOOTER_ROUTES: Route[] = [
  { name: "設定とプライバシー", href: "/settings", icon: () => <Cog size={32} /> },
];

export default function DrawerLayout() {
  const account = useAtomValue(accountAtom);
  const segments = useSegments();

  const isProfileTab = segments.includes("profile" as never);

  return (
    <Drawer
      screenOptions={({ navigation }) => ({
        headerTitle: "",
        headerShadowVisible: false,
        headerShown: !isProfileTab,
        swipeEnabled: !isProfileTab,
        headerLeft: () => {
          const openDrawer = () => {
            navigation.dispatch(DrawerActions.openDrawer());
          };

          return (
            <View className="pl-4">
              {account?.user.profile ? (
                <View className="w-8 h-8 rounded-full">
                  <Pressable onPress={openDrawer}>
                    <Image
                      source={{ uri: getCdnUrl({ src: account.user.profile.iconUrl, variant: "icon", width: 64 }) }}
                      style={{ width: 32, height: 32, borderRadius: 16 }}
                    />
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={openDrawer}>
                  <Hamburger />
                </Pressable>
              )}
            </View>
          );
        },
      })}
      drawerContent={({ navigation }) => (
        <SafeAreaView>
          <View className="flex flex-col">
            <View className="pt-4">
              {account?.user.profile != null && (
                <View className="border-b dark:border-gray-700 border-gray-300 pb-4">
                  <View className="pl-8">
                    <View className="w-24 h-24 rounded-full overflow-hidden">
                      <Image
                        source={getCdnUrl({ src: account.user.profile.iconUrl, variant: "icon", width: 96 })}
                        style={{ width: 96, height: 96 }}
                      />
                    </View>

                    <View className="mt-2">
                      <Text className="text-lg font-bold mt-2">{account.user.displayName}</Text>

                      <Text className="text-sm text-gray-500" style={{ fontFamily: Fonts.mono }}>
                        @{account.user.screenName}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
              <View>
                <View className="border-b dark:border-gray-700 border-gray-300 py-2">
                  {HEADER_ROUTES.map((route) => (
                    <Pressable
                      key={route.name}
                      className="pl-8 px-4 py-2"
                      onPress={() => {
                        navigation.dispatch(DrawerActions.closeDrawer());
                        router.push(route.href as never);
                      }}
                    >
                      <View className="flex-row items-center">
                        <View className="pr-2">{route.icon()}</View>
                        <Text>{route.name}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
                <View className="border-b dark:border-gray-700 border-gray-300 py-2">
                  {FOOTER_ROUTES.map((route) => (
                    <Pressable
                      key={route.name}
                      className="pl-8 px-4 py-2"
                      onPress={() => {
                        navigation.dispatch(DrawerActions.closeDrawer());
                        router.push(route.href as never);
                      }}
                    >
                      <View className="flex-row items-center">
                        <View className="pr-2">{route.icon()}</View>
                        <Text>{route.name}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>
      )}
    />
  );
}
