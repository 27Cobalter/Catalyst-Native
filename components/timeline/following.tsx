import { clientAtom } from "@/models/atoms/credential";
import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { TimelineBase } from "./base";

export const FollowingTimeline = () => {
  const client = useAtomValue(clientAtom);

  const fetcher = useCallback(
    async (since: string | null, until: string | null) => {
      return (
        (await client?.catalyst.homeTimeline({
          since: since ?? undefined,
          until: until ?? undefined,
        })) ?? []
      );
    },
    [client],
  );

  return <TimelineBase fetcher={fetcher} />;
};
