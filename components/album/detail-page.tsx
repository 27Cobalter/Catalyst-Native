import { TimelineBase } from "@/components/timeline/base";
import { getCdnUrl } from "@/lib/media";
import { accountAtom } from "@/models/atoms/account";
import type {
  CatalystAlbum,
  CatalystSmartAlbum,
  CatalystStatus,
  EgeriaUser,
} from "@natsuneko-laboratory/catalyst-sdk";
import dayjs from "dayjs";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { Calendar, Pencil } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { withUniwind } from "uniwind";

import "@/global.css";

const UniCalendar = withUniwind(Calendar);
const UniImage = withUniwind(Image);
const UniPencil = withUniwind(Pencil);

type AlbumType = "album" | "smartAlbum";

type AlbumInfo = {
  title: string;
  description: string;
  user?: EgeriaUser;
  since?: string;
  until?: string;
};

type Props = {
  id: string;
  albumType: AlbumType;
};

const formatPeriod = (since?: string, until?: string): string => {
  if (!since && !until) return "";

  const fmt = (d: string) => dayjs(d).format("YYYY/MM/DD");

  if (since && until) return `${fmt(since)} - ${fmt(until)}`;
  if (since) return `${fmt(since)} から`;
  if (until) return `${fmt(until)} まで`;
  return "";
};

const AlbumHeader = ({ info }: { info: AlbumInfo }) => {
  const router = useRouter();
  const { user, description, since, until } = info;
  const period = formatPeriod(since, until);

  const hasContent = user || description.length > 0 || period.length > 0;
  if (!hasContent) return null;

  return (
    <View className="px-4 py-3 bg-light-background dark:bg-dark-background">
      {user && (
        <TouchableOpacity
          className="flex-row items-center mb-2"
          activeOpacity={0.7}
          onPress={() => router.push(`/user/${user.screenName}`)}
        >
          {user.profile?.iconUrl ? (
            <UniImage
              source={{ uri: getCdnUrl({ src: user.profile.iconUrl, variant: "icon", width: 64 }) }}
              className="w-8 h-8 rounded-full"
              contentFit="cover"
            />
          ) : (
            <View className="w-8 h-8 rounded-full bg-light-skeleton dark:bg-dark-skeleton" />
          )}
          <View className="ml-2">
            <Text className="text-sm font-semibold text-light-text dark:text-dark-text">
              {user.displayName}
            </Text>
            <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
              @{user.screenName}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {description.length > 0 && (
        <Text
          className="text-sm text-light-text-muted dark:text-dark-text-muted mb-1"
          numberOfLines={3}
        >
          {description}
        </Text>
      )}

      {period.length > 0 && (
        <View className="flex-row items-center gap-1">
          <UniCalendar size={12} className="text-light-text-muted dark:text-dark-text-muted" />
          <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">{period}</Text>
        </View>
      )}
    </View>
  );
};

export const AlbumDetailPage = ({ id, albumType }: Props) => {
  const account = useAtomValue(accountAtom);
  const [albumInfo, setAlbumInfo] = useState<AlbumInfo | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const canEdit =
    albumInfo?.user && account?.user ? albumInfo.user.id === account.user.id : false;

  useEffect(() => {
    if (!account?.credential.client || !id) return;

    const fetchInfo = async () => {
      try {
        if (albumType === "album") {
          const album: CatalystAlbum = await account.credential.client.catalyst.getAlbum(id);
          setAlbumInfo({
            title: album.name,
            description: album.description,
            user: album.user,
          });
        } else {
          const album: CatalystSmartAlbum =
            await account.credential.client.catalyst.getSmartAlbum(id);
          setAlbumInfo({
            title: album.name,
            description: album.description,
            user: album.user,
            since: album.since,
            until: album.until,
          });
        }
      } catch (e) {
        console.error("Failed to fetch album info:", e);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchInfo();
  }, [id, account, albumType]);

  const fetcher = useCallback(
    async (since: string | null, until: string | null): Promise<CatalystStatus[]> => {
      if (!account?.credential.client) return [];

      const opts: { since?: string; until?: string } = {};
      if (since) opts.since = since;
      if (until) opts.until = until;

      if (albumType === "album") {
        const album = await account.credential.client.catalyst.getAlbum(id, opts);
        return album.statuses;
      }
      const album = await account.credential.client.catalyst.getSmartAlbum(id, opts);
      return album.statuses;
    },
    [account, id, albumType],
  );

  if (isInitialLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "" }} />
        <View className="flex-1 bg-light-background dark:bg-dark-background items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: albumInfo?.title ?? "",
          headerRight: canEdit
            ? () => (
                <TouchableOpacity style={{ padding: 8 }}>
                  <UniPencil size={20} className="text-light-tint dark:text-dark-tint" />
                </TouchableOpacity>
              )
            : undefined,
        }}
      />

      <View className="flex-1 bg-light-background dark:bg-dark-background">
        {albumInfo && <AlbumHeader info={albumInfo} />}
        {albumInfo && (
          <View className="h-px bg-light-divider dark:bg-dark-divider" />
        )}
        <TimelineBase fetcher={fetcher} />
      </View>
    </>
  );
};
