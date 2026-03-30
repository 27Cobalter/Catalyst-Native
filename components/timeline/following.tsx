import { FleetRing } from "@/components/fleet/ring";
import { FleetViewer } from "@/components/fleet/viewer";
import { clientAtom } from "@/models/atoms/credential";
import { useAtomValue } from "jotai";
import { Ref, useCallback, useState } from "react";
import { TimelineBase, TimelineHandle } from "./base";

type Props = {
  ref?: Ref<TimelineHandle>;
};

export const FollowingTimeline = ({ ref }: Props) => {
  const client = useAtomValue(clientAtom);
  const [viewerUsername, setViewerUsername] = useState<string | null>(null);
  const [fleetUsernames, setFleetUsernames] = useState<string[]>([]);
  const [ringRefreshKey, setRingRefreshKey] = useState(0);

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

  const handleRingPress = useCallback((username: string) => {
    setViewerUsername(username);
  }, []);

  const handleViewerClose = useCallback(() => {
    setViewerUsername(null);
    setRingRefreshKey((k) => k + 1);
  }, []);

  const handleMarkRead = useCallback((_username: string) => {
    // Ring will refresh via ringRefreshKey on viewer close
  }, []);

  const handleUsernamesChange = useCallback((usernames: string[]) => {
    setFleetUsernames(usernames);
  }, []);

  const Header = useCallback(
    () => (
      <FleetRing
        onRingPress={handleRingPress}
        onUsernamesChange={handleUsernamesChange}
        refreshKey={ringRefreshKey}
      />
    ),
    [handleRingPress, handleUsernamesChange, ringRefreshKey],
  );

  return (
    <>
      <TimelineBase ref={ref} fetcher={fetcher} ListHeaderComponent={Header} />
      <FleetViewer
        username={viewerUsername}
        usernames={fleetUsernames}
        visible={!!viewerUsername}
        onClose={handleViewerClose}
        onMarkRead={handleMarkRead}
      />
    </>
  );
};
