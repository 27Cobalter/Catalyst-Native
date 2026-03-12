import { useAsyncEffect } from "@/hooks/use-async-effect";
import { clientAtom } from "@/models/atoms/credential";
import { EgeriaUser } from "@natsuneko-laboratory/catalyst-sdk";
import { FlashList, ListRenderItem } from "@shopify/flash-list";
import { useAtomValue } from "jotai";
import { useCallback, useState } from "react";
import { UserCard } from "./card";

type Props = {
  query: string;
};

export const UserList = ({ query }: Props) => {
  const client = useAtomValue(clientAtom);
  const [users, setUsers] = useState<EgeriaUser[]>([]);

  const onRender = useCallback<ListRenderItem<EgeriaUser>>(({ item }) => {
    return <UserCard user={item} />;
  }, []);

  useAsyncEffect(async () => {
    if (client) {
      const res = await client.egeria.search(query);
      setUsers(res.users);
    }
  }, [query]);

  return <FlashList data={users} keyExtractor={(w) => w.id} renderItem={onRender} />;
};
