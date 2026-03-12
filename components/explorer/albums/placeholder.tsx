import { Images } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";
import { withUniwind } from "uniwind";

const UniImagesIcon = withUniwind(Images);

export const AlbumsPlaceholder = () => {
  return (
    <View className="flex items-center justify-center h-full">
      <View className="flex items-center justify-center">
        <UniImagesIcon size={64} className="text-light-gray dark:text-dark-gray" />
        <Text className="font-semibold text-light-gray dark:text-dark-gray mt-2 text-center">アルバムを検索</Text>
        <Text className="text-sm text-light-gray dark:text-dark-gray mt-2">キーワードを入力して検索</Text>
      </View>
    </View>
  );
};
