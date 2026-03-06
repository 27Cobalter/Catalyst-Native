import { accountAtom } from "@/models/atoms/account";
import { DrawerActions } from "@react-navigation/native";
import { Image } from "expo-image";
import { Drawer } from "expo-router/drawer";
import { useAtomValue } from "jotai";
import { Hamburger } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

export default function TabLayout() {
  const account = useAtomValue(accountAtom);

  return (
    <Drawer
      screenOptions={({ navigation }) => ({
        headerTitle: "",
        headerLeft: () => {
          const openDrawer = () => {
            navigation.dispatch(DrawerActions.openDrawer());
          };

          return (
            <View className="pl-4">
              {account?.user ? (
                <View className="w-8 h-8 rounded-full">
                  <Pressable onPress={openDrawer}>
                    <Image
                      source={{ uri: `${account.user.profile?.iconUrl}/tiny` }}
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
      drawerContent={() => (
        <View>
          <Text>aaa</Text>
        </View>
      )}
    />
  );
}
