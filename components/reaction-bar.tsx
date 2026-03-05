import type { CatalystReaction } from "@/natsuneko-laboratory/catalyst-sdk/packages/nodejs/dist";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const isUnicodeEmoji = (symbol: string): boolean => {
  return /\p{Emoji}/u.test(symbol);
};

type Props = {
  reactions: Record<string, CatalystReaction>;
  onReact: (symbol: string) => void;
  onUnreact: (symbol: string) => void;
};

export const ReactionBar = ({ reactions, onReact, onUnreact }: Props) => {
  const entries = Object.values(reactions);
  if (entries.length === 0) return null;

  return (
    <View style={styles.container}>
      {entries.map((reaction) => (
        <TouchableOpacity
          key={reaction.name}
          onPress={() => (reaction.hasSelfReaction ? onUnreact(reaction.symbol) : onReact(reaction.symbol))}
          style={[styles.chip, reaction.hasSelfReaction && styles.chipActive]}
        >
          {isUnicodeEmoji(reaction.symbol) ? (
            <Text style={styles.symbol}>{reaction.symbol}</Text>
          ) : (
            <Image
              source={{ uri: `https://static.natsuneko.com/images/reactions/${reaction.symbol}.png` }}
              style={styles.image}
              contentFit="contain"
            />
          )}
          <Text style={[styles.count, reaction.hasSelfReaction && styles.countActive]}>{reaction.count}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  chipActive: {
    borderColor: "#007AFF",
  },
  symbol: {
    fontSize: 16,
  },
  image: {
    width: 16,
    height: 16,
  },
  count: {
    fontSize: 13,
    color: "#3C3C43",
  },
  countActive: {
    color: "#007AFF",
  },
});
