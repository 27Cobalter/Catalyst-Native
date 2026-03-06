import { Drawer } from "expo-router/drawer";
import { Text, View } from "react-native";

export default function TabLayout() {
  return (
    <Drawer
      drawerContent={() => (
        <View>
          <Text>aaa</Text>
        </View>
      )}
    />
  );
}
