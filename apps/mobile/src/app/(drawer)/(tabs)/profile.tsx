import { ProfilePage } from "@/components/profile/profile-page";
import { accountAtom } from "@/models/atoms/account";
import { useAtomValue } from "jotai";

export default function ProfileScreen() {
  const account = useAtomValue(accountAtom);

  if (!account?.user.screenName) {
    return null;
  }

  return <ProfilePage screenName={account.user.screenName} showBackButton={false} />;
}
