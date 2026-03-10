import { accountAtom } from "@/models/atoms/account";
import { EgeriaUser } from "@natsuneko-laboratory/catalyst-sdk";
import { useAtomValue } from "jotai";
import { memo, useCallback } from "react";
import { TimelineBase } from "../timeline/base";

type Props = {
  user?: EgeriaUser | null;
};

export const UserTimeline = memo(
  ({ user }: Props) => {
    const account = useAtomValue(accountAtom);
    const fetcher = useCallback(
      async (since: string | null, until: string | null) => {
        if (!account?.credential.client || !user) {
          return [];
        }

        return (
          await account.credential.client.catalyst.userTimeline(user.screenName, {
            since: since ?? undefined,
            until: until ?? undefined,
          })
        ).statuses;
      },
      [account, user],
    );

    return <TimelineBase fetcher={fetcher} />;
  },
  (a, b) => a.user?.id === b.user?.id,
);
UserTimeline.displayName = "UserTimeline";
