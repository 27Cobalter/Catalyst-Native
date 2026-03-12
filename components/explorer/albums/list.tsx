import { AlbumCard } from "@/components/album/card";
import { useAsyncEffect } from "@/hooks/use-async-effect";
import { clientAtom } from "@/models/atoms/credential";
import { CatalystSmartAlbum } from "@natsuneko-laboratory/catalyst-sdk";
import { FlashList, ListRenderItem } from "@shopify/flash-list";
import { useAtomValue } from "jotai";
import { useCallback, useState } from "react";

import "@/global.css";

type Props = {
  query: string;
};

export const AlbumList = ({ query }: Props) => {
  const client = useAtomValue(clientAtom);
  const [albums, setAlbums] = useState<CatalystSmartAlbum[]>([]);

  const onRender = useCallback<ListRenderItem<CatalystSmartAlbum>>(({ item }) => {
    return <AlbumCard album={item} />;
  }, []);

  useAsyncEffect(async () => {
    if (client) {
      const res = await client.catalyst.searchAlbums(query, true);
      setAlbums(res.albums);
    }
  }, [query]);

  return <FlashList data={albums} keyExtractor={(w) => w.id} renderItem={onRender} />;
};
