import type { ActivityPubRemoteActor, NotificationActor } from "@/models/sdk-types";

export const isActivityPubRemoteActor = (actor: NotificationActor): actor is ActivityPubRemoteActor =>
  "type" in actor && actor.type === "activitypub-remote-actor";

export const getNotificationActorIconUrl = (actor: NotificationActor): string | null =>
  isActivityPubRemoteActor(actor) ? actor.cachedIconUri : (actor.profile?.iconUrl ?? null);
