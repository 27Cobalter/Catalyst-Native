import { TimelineBase } from "@/components/timeline/base";
import { clientAtom } from "@/models/atoms/credential";
import { Stack, useLocalSearchParams } from "expo-router";
import { useAtomValue } from "jotai";
import { useCallback } from "react";

export default function SearchPage() {
  const params = useLocalSearchParams<{ tab?: string; q?: string }>();
  const client = useAtomValue(clientAtom);
  const hashtag = params.q ?? "";
  const fetcher = useCallback(
    async (since: string | null, until: string | null) => {
      if (!client || !hashtag) {
        return [];
      }

      const statuses = await client.catalyst.searchTimeline({
        q: hashtag,
        exact: true,
        since: since ?? undefined,
        until: until ?? undefined,
      });
      return statuses.statuses;
    },
    [client, hashtag],
  );

  return (
    <>
      <Stack.Screen options={{ title: hashtag }} />
      <TimelineBase fetcher={fetcher} />
    </>
  );
}
