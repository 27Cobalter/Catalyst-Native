import { SearchX } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";
import { withUniwind } from "uniwind";

const UniSearchXIcon = withUniwind(SearchX);

export const StatusesEmptyResult = () => {
  return (
    <View className="flex items-center justify-center h-full">
      <View className="flex items-center justify-center">
        <UniSearchXIcon size={64} className="text-light-gray dark:text-dark-gray" />
        <Text className="font-semibold text-light-gray dark:text-dark-gray mt-2 text-center">投稿が見つかりません</Text>
        <Text className="text-sm text-light-gray dark:text-dark-gray mt-2">別のキーワードで検索してみてください</Text>
      </View>
    </View>
  );
};
