import { EgeriaUser } from "@natsuneko-laboratory/catalyst-sdk";
import { Text, View } from "react-native";
import { UserTimeline } from "./timeline";

type Props = {
  tab: { route: string };
  user?: EgeriaUser | null;
};

export const TabContent = ({ tab, user }: Props) => {
  if (user) {
    if (tab.route === "posts") {
      return <UserTimeline user={user} />;
    }

    return (
      <View>
        <Text>{tab.route}</Text>
      </View>
    );
  }

  return null;
};
