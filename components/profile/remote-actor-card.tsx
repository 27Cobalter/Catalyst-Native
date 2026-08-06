import { CatalystAvatar, CatalystListItem, CatalystListItemContent, CatalystText } from "@/components/design-system";
import { openUrlWithBrowser } from "@/models/browser-settings";
import type { CatalystRemoteFollower } from "@/models/sdk-types";
import { ExternalLink } from "lucide-react-native";
import { withUniwind } from "uniwind";

const UniExternalLink = withUniwind(ExternalLink);

type Props = {
  actor: CatalystRemoteFollower;
};

export const RemoteActorCard = ({ actor }: Props) => (
  <CatalystListItem
    accessibilityRole="link"
    accessibilityLabel={`${actor.displayName}の外部プロフィールを開く`}
    onPress={() => openUrlWithBrowser(actor.profileUri)}
  >
    <CatalystAvatar alt={actor.displayName} fallback={actor.preferredUsername} size="lg" source={actor.cachedIconUri} />
    <CatalystListItemContent>
      <CatalystText variant="subtitle" numberOfLines={1}>
        {actor.displayName}
      </CatalystText>
      <CatalystText variant="caption" tone="muted" className="font-mono" numberOfLines={1}>
        {actor.handle}
      </CatalystText>
    </CatalystListItemContent>
    <UniExternalLink size={15} className="text-light-icon dark:text-dark-icon" />
  </CatalystListItem>
);
