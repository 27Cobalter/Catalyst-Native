import { ScrollView, Text } from "react-native";
import { Contests } from "./right-rails/contests";
import { Trends } from "./right-rails/trends";
import { SearchField } from "./ui";

// トレンドやおすすめを並べる右カラム。幅が足りない / 詳細ペインを開いている間は Page 側で非表示にする
export const RightRail = () => {
  return (
    <ScrollView
      className="w-[320px] grow-0 border-l-hairline border-light-divider dark:border-dark-divider"
      contentContainerClassName="gap-4 px-4 pb-8 pt-4"
    >
      <SearchField placeholder="Catalyst を検索" />
      <Trends />
      <Contests />
      <Text className="px-1 text-[11px] leading-4 text-light-text-subtle dark:text-dark-text-subtle">
        利用規約 · プライバシーポリシー · &copy; Natsuneko Laboratory
      </Text>
    </ScrollView>
  );
};
