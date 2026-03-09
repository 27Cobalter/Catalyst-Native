import { Fonts } from "@/constants/theme";
import { getCdnUrl } from "@/lib/media";
import { accountAtom } from "@/models/atoms/account";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { DrawerActions } from "@react-navigation/native";
import { Image } from "expo-image";
import { router, useSegments } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useAtomValue } from "jotai";
import { Cog, Hamburger, Images, Trophy, User } from "lucide-react-native";
import { useCallback, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

type Route = {
  name: string;
  href: string;
  icon: () => React.ReactNode;
};

const DrawerMenu = ({
  route,
  navigation,
}: {
  route: Route;
  navigation: DrawerContentComponentProps["navigation"];
}) => {
  const onPress = useCallback(() => {
    navigation.dispatch(DrawerActions.closeDrawer());
    router.push(route.href as never);
  }, [route, navigation]);

  return (
    <Pressable className="pl-8 px-4 py-2 my-1" onPress={onPress}>
      <View className="flex-row items-center">
        <View className="pr-2">{route.icon()}</View>
        <Text className="text-black dark:text-white">{route.name}</Text>
      </View>
    </Pressable>
  );
};

const UniImage = withUniwind(Image);
const UniUser = withUniwind(User);
const UniTrophy = withUniwind(Trophy);
const UniImages = withUniwind(Images);
const UniCog = withUniwind(Cog);

export default function DrawerLayout() {
  const account = useAtomValue(accountAtom);
  const segments = useSegments();
  const headers: Route[] = useMemo(() => {
    return [
      account?.user.profile && {
        name: "プロフィール",
        href: `/user/${account.user.screenName ?? ""}`,
        icon: () => (
          <UniUser className="text-black dark:text-white" size={32} />
        ),
      },
      {
        name: "コンテスト",
        href: "/contest",
        icon: () => (
          <UniTrophy className="text-black dark:text-white" size={32} />
        ),
      },
      {
        name: "ギャラリー",
        href: "/gallery",
        icon: () => (
          <UniImages className="text-black dark:text-white" size={32} />
        ),
      },
    ].filter(Boolean) as Route[];
  }, [account]);

  const footers: Route[] = useMemo(() => {
    return [
      {
        name: "設定とプライバシー",
        href: "/settings",
        icon: () => <UniCog className="text-black dark:text-white" size={32} />,
      },
    ].filter(Boolean) as Route[];
  }, []);

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
                    <UniImage
                      source={{
                        uri: getCdnUrl({
                          src: account.user.profile.iconUrl,
                          variant: "icon",
                          width: 64,
                        }),
                      }}
                      className="w-8 h-8 rounded-full"
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
          <View className="flex flex-col pt-4">
            {account?.user.profile != null && (
              <Pressable
                onPress={() => {
                  navigation.dispatch(DrawerActions.closeDrawer());
                  router.push(`/user/${account.user.screenName}`);
                }}
              >
                <View className="border-b dark:border-neutral-700 border-neutral-300 pb-4">
                  <View className="pl-8">
                    <UniImage
                      source={getCdnUrl({
                        src: account.user.profile.iconUrl,
                        variant: "icon",
                        width: 96,
                      })}
                      className="h-24 w-24 rounded-full"
                      style={{ width: 96, height: 96 }}
                    />

                    <View className="mt-2">
                      <Text className="text-lg font-bold mt-2 text-black dark:text-white">
                        {account.user.displayName}
                      </Text>

                      <Text
                        className="text-sm text-neutral-500"
                        style={{ fontFamily: Fonts.mono }}
                      >
                        @{account.user.screenName}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            )}
            <View>
              <View className="border-b dark:neutral-gray-700 border-neutral-300 py-2">
                {headers.map((route) => (
                  <DrawerMenu
                    key={route.name}
                    route={route}
                    navigation={navigation}
                  />
                ))}
              </View>
              <View className="border-b dark:neutral-gray-700 border-neutral-300 py-2">
                {footers.map((route) => (
                  <DrawerMenu
                    key={route.name}
                    route={route}
                    navigation={navigation}
                  />
                ))}
              </View>
            </View>
          </View>
        </SafeAreaView>
      )}
    />
  );
}
