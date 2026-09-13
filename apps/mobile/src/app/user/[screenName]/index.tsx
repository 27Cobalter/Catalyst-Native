import { ProfilePage } from "@/components/profile/profile-page";
import { useLocalSearchParams } from "expo-router";

export default function UserProfilePage() {
  const { screenName } = useLocalSearchParams<{ screenName: string }>();

  return <ProfilePage screenName={screenName} />;
}
