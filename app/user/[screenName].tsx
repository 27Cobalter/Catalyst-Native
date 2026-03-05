import { Text, View } from "react-native";

type Props = {
  screenName: string;
};

export default function UserPage({ screenName }: Props) {
  return (
    <View>
      <Text>User: {screenName}</Text>
    </View>
  );
}
