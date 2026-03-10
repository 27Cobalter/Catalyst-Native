import { clientAtom } from "@/models/atoms/credential";
import { EgeriaUser } from "@natsuneko-laboratory/catalyst-sdk";
import { useAtomValue } from "jotai";
import React, { memo, useCallback } from "react";
import { TimelineBase } from "../timeline/base";

type Props = {
  user?: EgeriaUser | null;
  ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
  onScroll?: React.ComponentProps<typeof TimelineBase>["onScroll"];
};

export const UserTimeline = memo(
  ({ user, ListHeaderComponent, onScroll }: Props) => {
    const client = useAtomValue(clientAtom);
    const fetcher = useCallback(
      async (since: string | null, until: string | null) => {
        if (!client || !user) {
          return [];
        }

        return (
          await client.catalyst.userTimeline(user.screenName, {
            since: since ?? undefined,
            until: until ?? undefined,
          })
        ).statuses;
      },
      [client, user],
    );

    return <TimelineBase fetcher={fetcher} ListHeaderComponent={ListHeaderComponent} onScroll={onScroll} />;
  },
  (a, b) => a.user?.id === b.user?.id,
);
UserTimeline.displayName = "UserTimeline";
