import { clientAtom } from "@/models/atoms/credential";
import { useAtomValue } from "jotai";
import { Ref, useCallback } from "react";
import { TimelineBase, TimelineHandle } from "./base";

type Props = {
  ref?: Ref<TimelineHandle>;
}

export const FollowingTimeline = ({ ref }: Props) => {
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

  return <TimelineBase ref={ref} fetcher={fetcher} />;
}