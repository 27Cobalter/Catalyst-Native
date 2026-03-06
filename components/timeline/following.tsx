import { accountAtom } from "@/models/atoms/account";
import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { TimelineBase } from "./base";

export const FollowingTimeline = () => {
  const account = useAtomValue(accountAtom);

  const fetcher = useCallback(
    async (since: string | null, until: string | null) => {
      return (
        (await account?.credential.client.catalyst.homeTimeline({
          since: since ?? undefined,
          until: until ?? undefined,
        })) ?? []
      );
    },
    [account],
  );

  return <TimelineBase fetcher={fetcher} />;
};
