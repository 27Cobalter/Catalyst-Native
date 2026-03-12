import { Search } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";
import { withUniwind } from "uniwind";

const UniSearchIcon = withUniwind(Search);

export const StatusesPlaceholder = () => {
  return (
    <View className="flex items-center justify-center h-full">
      <View className="flex items-center justify-center">
        <UniSearchIcon size={64} className="text-light-gray dark:text-dark-gray" />
        <Text className="font-semibold text-light-gray dark:text-dark-gray mt-2 text-center">投稿を検索</Text>
        <Text className="text-sm text-light-gray dark:text-dark-gray mt-2">
          キーワードもしくはハッシュタグを入力して検索
        </Text>
      </View>
    </View>
  );
};
