import { Trophy } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";
import { withUniwind } from "uniwind";

const UniTrophyIcon = withUniwind(Trophy);

export const ContestsPlaceholder = () => {
  return (
    <View className="flex items-center justify-center h-full">
      <View className="flex items-center justify-center">
        <UniTrophyIcon size={64} className="text-light-gray dark:text-dark-gray" />
        <Text className="font-semibold text-light-gray dark:text-dark-gray mt-2 text-center">コンテストを検索</Text>
        <Text className="text-sm text-light-gray dark:text-dark-gray mt-2">キーワードを入力して検索</Text>
      </View>
    </View>
  );
};
