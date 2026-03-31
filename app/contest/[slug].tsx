import { TimelineBase } from "@/components/timeline/base";
import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { abs } from "@/lib/dayjs";
import { getCdnUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { clientAtom } from "@/models/atoms/credential";
import type { CatalystContest } from "@natsuneko-laboratory/catalyst-sdk";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { ArrowLeft, FileQuestion, Trophy } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

import "@/global.css";

const UniImage = withUniwind(Image);
const UniTrophy = withUniwind(Trophy);
const UniFileQuestion = withUniwind(FileQuestion);
const UniArrowLeft = withUniwind(ArrowLeft);

const STATE_LABEL: Record<string, string> = {
  opening: "作品受付中",
  voting: "投票受付中",
  closing: "投票準備中",
  electing: "結果準備中",
  published: "開催予定",
  closed: "終了",
};

const fmt = (d: string) => abs(d);

const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View className="flex-row py-3 border-b border-light-divider dark:border-dark-divider">
    <Text className="text-sm font-semibold text-light-text dark:text-dark-text w-28 shrink-0">{label}</Text>
    <View className="flex-1">{children}</View>
  </View>
);

const InfoText = ({ value }: { value: string }) => (
  <Text className="text-sm text-light-text dark:text-dark-text">{value}</Text>
);

type HeaderProps = {
  contest: CatalystContest;
  topInset: number;
};

const ContestHeader = ({ contest, topInset }: HeaderProps) => {
  const terms = contest.terms
    ? contest.terms
        .split("\n")
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    : [];

  const imageHeight = topInset + 176; // 176 = h-44

  return (
    <View className="bg-light-background dark:bg-dark-background">
      {/* ヘッダー画像（safe area を含む高さ） */}
      {contest.headerUrl ? (
        <UniImage
          source={{ uri: getCdnUrl({ src: contest.headerUrl, variant: "header", width: 1500 }) }}
          style={{ width: "100%", height: imageHeight }}
          contentFit="cover"
        />
      ) : (
        <View
          className="w-full bg-neutral-200 dark:bg-neutral-800 items-center justify-center"
          style={{ height: imageHeight }}
        >
          <UniTrophy size={56} className="text-neutral-400" />
        </View>
      )}

      {/* タイトル・状態 */}
      <View className="px-4 pt-4 pb-2 gap-2">
        <View
          className={cn(
            "self-start px-2.5 py-1 rounded-full",
            contest.state === "opening" && "bg-light-success-background dark:bg-dark-success-background",
            contest.state === "voting" && "bg-light-info-background dark:bg-dark-info-background",
            (contest.state === "closing" || contest.state === "electing") &&
              "bg-light-warning-background dark:bg-dark-warning-background",
            (contest.state === "published" || contest.state === "closed") &&
              "bg-light-surface-muted dark:bg-dark-surface-muted",
          )}
        >
          <Text
            className={cn(
              "text-xs font-semibold",
              contest.state === "opening" && "text-light-success-foreground dark:text-dark-success-foreground",
              contest.state === "voting" && "text-light-info-foreground dark:text-dark-info-foreground",
              (contest.state === "closing" || contest.state === "electing") &&
                "text-light-warning-foreground dark:text-dark-warning-foreground",
              (contest.state === "published" || contest.state === "closed") &&
                "text-light-text-muted dark:text-dark-text-muted",
            )}
          >
            {STATE_LABEL[contest.state] ?? contest.state}
          </Text>
        </View>

        <Text className="text-xl font-bold text-light-text dark:text-dark-text">{contest.title}</Text>

        {contest.description?.length > 0 && (
          <Text className="text-sm text-light-text-muted dark:text-dark-text-muted leading-relaxed">
            {contest.description}
          </Text>
        )}
      </View>

      {/* 応募要項 */}
      <View className="mx-4 mb-4 mt-2 bg-light-surface dark:bg-dark-surface rounded-xl px-4">
        <Text className="text-base font-bold text-light-text dark:text-dark-text pt-4 pb-2">応募要項</Text>

        {contest.application && (
          <InfoRow label="応募期間">
            <InfoText value={`${fmt(contest.application.since)} ～ ${fmt(contest.application.until)}`} />
          </InfoRow>
        )}

        {contest.theme?.length > 0 && (
          <InfoRow label="テーマ">
            <InfoText value={contest.theme} />
          </InfoRow>
        )}

        {contest.winnersOpenAt && (
          <InfoRow label="結果発表目安">
            <InfoText value={fmt(contest.winnersOpenAt)} />
          </InfoRow>
        )}

        <InfoRow label="審査方法">
          <View className="gap-1">
            <InfoText value="審査員選択" />
            {contest.voting?.isEnable && (
              <InfoText value={`ユーザー投票あり（1人${contest.voting.maxVotes}票まで）`} />
            )}
          </View>
        </InfoRow>

        {contest.voting?.isEnable && (
          <InfoRow label="投票期間">
            <InfoText value={`${fmt(contest.voting.since)} ～ ${fmt(contest.voting.until)}`} />
          </InfoRow>
        )}

        <InfoRow label="賞">
          {contest.ranks.length === 0 ? (
            <InfoText value="賞は設定されていません" />
          ) : (
            <View className="gap-3">
              {contest.ranks.map((rank) => (
                <View key={rank.id}>
                  <Text className="text-sm font-semibold text-light-text dark:text-dark-text">{rank.name}</Text>
                  {rank.description && (
                    <Text className="text-xs text-light-text-muted dark:text-dark-text-muted mt-0.5">
                      {rank.description}
                    </Text>
                  )}
                  {rank.prize.length > 0 && (
                    <Text className="text-xs text-light-text-muted dark:text-dark-text-muted mt-0.5">
                      賞品: {rank.prize}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </InfoRow>

        {terms.length > 0 && (
          <InfoRow label="応募規定">
            <View className="gap-1">
              {terms.map((term, i) => (
                <Text key={`${i}-${term}`} className="text-sm text-light-text dark:text-dark-text">
                  · {term}
                </Text>
              ))}
            </View>
          </InfoRow>
        )}

        <View className="pb-4" />
      </View>

      {/* タイムラインタイトル */}
      <View className="px-4 pb-2 border-b border-light-divider dark:border-dark-divider">
        <Text className="text-base font-bold text-light-text dark:text-dark-text">投稿作品一覧</Text>
      </View>
    </View>
  );
};

export default function ContestDetailPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const client = useAtomValue(clientAtom);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [contest, setContest] = useState<CatalystContest | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  useAsyncOneTimeEffect(async () => {
    if (!client || !slug) return;
    try {
      const res = await client.catalyst.getContestBySlug(slug);
      setContest(res.contest);
    } catch {
      setIsNotFound(true);
    }
  });

  const fetcher = useCallback(
    async (since: string | null, until: string | null) => {
      return (
        (
          await client?.catalyst.contestTimeline(slug, {
            since: since ?? undefined,
            until: until ?? undefined,
          })
        )?.statuses ?? []
      );
    },
    [client, slug],
  );

  const Header = useCallback(
    () => (contest ? <ContestHeader contest={contest} topInset={insets.top} /> : null),
    [contest, insets.top],
  );

  const renderContent = () => {
    if (isNotFound) {
      return (
        <View className="flex-1 items-center justify-center">
          <UniFileQuestion size={64} className="text-light-gray dark:text-dark-gray" />
          <Text className="font-semibold text-light-gray dark:text-dark-gray mt-2 text-center">
            コンテストが見つかりません
          </Text>
          <Text className="text-sm text-light-gray dark:text-dark-gray mt-2 text-center">
            削除されたか、アクセスできないコンテンツです
          </Text>
        </View>
      );
    }

    if (!contest) {
      return (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      );
    }

    return <TimelineBase fetcher={fetcher} ListHeaderComponent={Header} />;
  };

  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      {renderContent()}

      {/* 戻るボタンオーバーレイ */}
      <View
        className="absolute left-0 right-0 top-0"
        style={{ paddingTop: insets.top }}
        pointerEvents="box-none"
      >
        <TouchableOpacity className="p-2 m-2 self-start" onPress={() => router.back()}>
          <View className="w-9 h-9 rounded-full bg-black/75 items-center justify-center">
            <UniArrowLeft size={18} className="text-white" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
