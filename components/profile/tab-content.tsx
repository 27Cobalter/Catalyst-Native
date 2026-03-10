import { EgeriaUser } from "@natsuneko-laboratory/catalyst-sdk";
import React from "react";
import { Text, View } from "react-native";
import { UserTimeline, UserTimelineHandle } from "./timeline";

type Props = {
  tab: { route: string };
  user?: EgeriaUser | null;
};

export const TabContent = React.forwardRef<UserTimelineHandle, Props>(({ tab, user }, ref) => {
  if (user) {
    if (tab.route === "posts") {
      return <UserTimeline ref={ref} user={user} />;
    }

    return (
      <View>
        <Text>{tab.route}</Text>
      </View>
    );
  }

  return null;
});
TabContent.displayName = "TabContent";
