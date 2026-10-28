import { useAsyncEffect } from "@/hooks/use-async-effect";
import { clientAtom } from "@/models/atoms/credential";
import { useAtomValue } from "jotai";
import { useState } from "react";

export type ArchiveMonth = { year: number; month: number; count: number };

export const formatArchiveMonth = ({ year, month }: Pick<ArchiveMonth, "year" | "month">) => `${year}年${month}月`;

/** 投稿のある月の一覧を新しい順で返す */
export const useArchiveMonths = () => {
  const client = useAtomValue(clientAtom);
  const [months, setMonths] = useState<ArchiveMonth[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useAsyncEffect(async () => {
    if (!client) return;

    setIsLoading(true);
    try {
      const { data } = await client.catalyst.v1.timeline.archive.months.get({ throwOnError: true });
      setMonths(
        data.months.filter((w) => w.count > 0).sort((a, b) => b.year - a.year || b.month - a.month),
      );
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  return { months, isLoading };
};
