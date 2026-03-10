import { EgeriaUser } from "@natsuneko-laboratory/catalyst-sdk";
import React from "react";
import { Text, View } from "react-native";
import { UserTimeline } from "./timeline";

type Props = {
  tab: { route: string };
  user?: EgeriaUser | null;
  ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
  onScroll?: React.ComponentProps<typeof UserTimeline>["onScroll"];
};

export const TabContent = ({ tab, user, ListHeaderComponent, onScroll }: Props) => {
  if (user) {
    if (tab.route === "posts") {
      return <UserTimeline user={user} ListHeaderComponent={ListHeaderComponent} onScroll={onScroll} />;
    }

    return (
      <View>
        <Text>{tab.route}</Text>
      </View>
    );
  }

  return null;
};
