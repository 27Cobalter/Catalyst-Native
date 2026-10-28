import { CatalystEmptyState } from "@/components/design-system";
import { Images, SearchX } from "lucide-react-native";
import React from "react";
import { withUniwind } from "uniwind";

const UniImagesIcon = withUniwind(Images);
const UniSearchXIcon = withUniwind(SearchX);

// Web 版の album.search.* と同じ文言
export const AlbumsEmptyResult = ({ query }: { query: string }) => {
  if (!query) {
    return (
      <CatalystEmptyState
        icon={<UniImagesIcon />}
        title="アルバムを検索"
        description="ハッシュタグやキーワードから、公開アルバムやスマートアルバムを探せます。"
      />
    );
  }

  return (
    <CatalystEmptyState
      icon={<UniSearchXIcon />}
      title="アルバムが見つかりませんでした"
      description={`「${query}」に一致するアルバムはありませんでした。別のキーワードでも検索してみてください。`}
    />
  );
};
