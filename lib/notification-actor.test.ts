import type { NotificationActor } from "@/models/sdk-types";
import { getNotificationActorIconUrl, isActivityPubRemoteActor } from "./notification-actor";

const remoteActor = {
  type: "activitypub-remote-actor",
  id: "remote-1",
  actorUri: "https://remote.example/users/alice",
  profileUri: "https://remote.example/@alice",
  preferredUsername: "alice",
  displayName: "Alice",
  handle: "@alice@remote.example",
  cachedIconUri: "https://api.natsuneko.com/cached/alice.png",
} satisfies NotificationActor;

describe("notification actor", () => {
  it("ActivityPub のリモート Actor を判別する", () => {
    expect(isActivityPubRemoteActor(remoteActor)).toBe(true);
    expect(getNotificationActorIconUrl(remoteActor)).toBe(remoteActor.cachedIconUri);
  });

  it("Catalyst ユーザーではプロフィール画像を返す", () => {
    const localActor = {
      id: "local-1",
      screenName: "natsuneko",
      displayName: "Natsuneko",
      profile: {
        iconUrl: "https://images.natsuneko.com/local-1/icon.png",
        bannerUrl: "",
        bio: "",
        website: "",
        additionalWebsites: [],
      },
    } satisfies NotificationActor;

    expect(isActivityPubRemoteActor(localActor)).toBe(false);
    expect(getNotificationActorIconUrl(localActor)).toBe(localActor.profile.iconUrl);
  });
});
