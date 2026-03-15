import { cn } from "@/lib/utils";
import { accountAtom } from "@/models/atoms/account";
import { clientAtom } from "@/models/atoms/credential";
import { CatalystStatus } from "@natsuneko-laboratory/catalyst-sdk";
import { useAtomValue } from "jotai";
import { Heart } from "lucide-react-native";
import { useCallback, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";
import { withUniwind } from "uniwind";

const UniHeart = withUniwind(Heart);

type Props = {
  isDefaultFavorited: boolean;
  status: CatalystStatus;
};

export const ActionBar = ({ isDefaultFavorited, status }: Props) => {
  const account = useAtomValue(accountAtom);
  const client = useAtomValue(clientAtom);
  const isLoggedIn = !!account?.user;
  const [isFavorited, setIsFavorited] = useState(isDefaultFavorited);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  const toggleFavorite = useCallback(async () => {
    if (!account?.credential.client || !status.id || isTogglingFavorite) return;
    setIsTogglingFavorite(true);

    try {
      if (isFavorited) {
        await client.catalyst.unfavorite(status.id);
        setIsFavorited(false);
      } else {
        await client.catalyst.favorite(status.id);
        setIsFavorited(true);
      }
    } catch (e) {
      Toast.show({ type: "error", text1: "エラー", text2: "お気に入りの操作に失敗しました" });
      console.error(e);
    } finally {
      setIsTogglingFavorite(false);
    }
  }, [account, client, status.id, isFavorited, isTogglingFavorite]);

  return (
    <View className="flex-row items-center px-1">
      <TouchableOpacity
        onPress={toggleFavorite}
        disabled={isTogglingFavorite || !isLoggedIn}
        className={cn("p-1", (!isLoggedIn || isTogglingFavorite) && "opacity-20")}
      >
        <UniHeart
          size={22}
          className={cn(isFavorited ? "text-[#FF3B30]" : "text-light-text-subtle dark:text-dark-text-subtle")}
          fill={isFavorited ? "#FF3B30" : "none"}
        />
      </TouchableOpacity>
    </View>
  );
};
