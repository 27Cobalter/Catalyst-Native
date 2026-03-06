import { emojis } from "@/lib/emojis";
import { cn } from "@/lib/utils";
import type { CatalystReaction } from "@natsuneko-laboratory/catalyst-sdk";
import { Image } from "expo-image";
import { Plus } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";

const isUnicodeCodepoint = (symbol: string): boolean => {
  return /^[0-9a-f]+$/i.test(symbol);
};

type Props = {
  reactions: Record<string, CatalystReaction>;
  onReact: (symbol: string) => void;
  onUnreact: (symbol: string) => void;
  onAddReaction?: () => void;
};

export const ReactionBar = ({ reactions, onReact, onUnreact, onAddReaction }: Props) => {
  const entries = Object.values(reactions);

  return (
    <View className="flex-row flex-wrap gap-2 py-1">
      {entries.map((reaction) => (
        <Pressable
          key={reaction.name}
          onPress={() => (reaction.hasSelfReaction ? onUnreact(reaction.symbol) : onReact(reaction.symbol))}
          className={cn(
            "flex-row items-center gap-1 px-2.5 py-1 rounded-full border",
            reaction.hasSelfReaction ? "border-[#007AFF]" : "border-[#E5E5EA]",
          )}
        >
          {isUnicodeCodepoint(reaction.symbol) ? (
            <Image
              source={emojis[reaction.symbol as keyof typeof emojis]}
              style={{ width: 24, height: 24 }}
              contentFit="contain"
            />
          ) : (
            <Image
              source={{ uri: `https://static.natsuneko.com/images/reactions/${reaction.symbol}.png` }}
              style={{ width: 24, height: 24 }}
              contentFit="contain"
            />
          )}
          <Text className={cn("text-base", reaction.hasSelfReaction ? "text-[#007AFF]" : "text-[#3C3C43]")}>
            {reaction.count}
          </Text>
        </Pressable>
      ))}
      {onAddReaction && (
        <Pressable
          onPress={onAddReaction}
          className="items-center justify-center px-2.5 py-1 rounded-full border border-[#E5E5EA]"
        >
          <Plus size={20} color="#8E8E93" />
        </Pressable>
      )}
    </View>
  );
};
