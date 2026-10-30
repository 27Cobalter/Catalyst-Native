import { CatalystListItem, CatalystListItemContent, CatalystText } from "@/components/design-system";
import { clientAtom, credentialAtom } from "@/models/atoms/credential";
import type { PointBalanceResponse } from "@natsuneko-laboratory/catalyst-sdk";
import { useFocusEffect, useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { ChevronRight, Coins } from "lucide-react-native";
import { useCallback, useState } from "react";
import { withUniwind } from "uniwind";

const UniChevronRight = withUniwind(ChevronRight);
const UniCoins = withUniwind(Coins);

/** お題一覧の上に置く、お題ポイント画面への入口。ログインしていないときは出さない */
export const ThemePointsEntry = () => {
  const router = useRouter();
  const client = useAtomValue(clientAtom);
  const credential = useAtomValue(credentialAtom);
  const [balance, setBalance] = useState<PointBalanceResponse | null>(null);
  const isLoggedIn = !!credential.accessToken;

  // お題ポイントの画面やお題に参加して戻ってきたときに古い値のままにならないよう、画面に戻るたびに読み直す
  useFocusEffect(
    useCallback(() => {
      const points = client?.giftia.v1.points;
      if (!points || !isLoggedIn) {
        // ログアウトしたら前のアカウントの値を残さない
        setBalance(null);
        return;
      }
      let active = true;
      // 読み込めなくても入口としては使えるので、ポイントを出さずに置いておく
      points
        .get()
        .then(({ data }) => {
          if (active && data) setBalance(data);
        })
        .catch((e) => console.error(e));
      return () => {
        active = false;
      };
    }, [client, isLoggedIn]),
  );

  if (!isLoggedIn) return null;

  return (
    <CatalystListItem accessibilityRole="button" onPress={() => router.push("/theme/points")}>
      <UniCoins size={20} className="text-light-tint dark:text-dark-tint" />
      <CatalystListItemContent className="gap-0">
        <CatalystText variant="label">お題ポイント</CatalystText>
      </CatalystListItemContent>
      {balance ? (
        <CatalystText tone="muted">
          {/* 連続参加していないときは 0 週連続と並べず、ポイントだけにする */}
          {balance.streak.current > 0
            ? `${balance.balance} pt ・ ${balance.streak.current} 週連続`
            : `${balance.balance} pt`}
        </CatalystText>
      ) : null}
      <UniChevronRight size={17} className="text-light-text-subtle dark:text-dark-text-subtle" />
    </CatalystListItem>
  );
};
