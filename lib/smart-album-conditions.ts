export type ConditionType = "hashtag" | "reaction" | "takenBy" | "contest" | "user";

export type SmartAlbumCondition = {
  id: string;
  type: ConditionType;
  value: string;
  isExclude: boolean;
};

export function hashtagsToConditions(hashtags: string[]): SmartAlbumCondition[] {
  return hashtags
    .map((raw, index) => {
      const trimmed = raw.trim();
      if (!trimmed) return null;

      const isExclude = trimmed.startsWith("-");
      const without = isExclude ? trimmed.slice(1) : trimmed;

      let type: ConditionType = "hashtag";
      let value = without;

      if (without.startsWith("takenBy:")) {
        type = "takenBy";
        value = without.slice("takenBy:".length);
      } else if (without.startsWith("reaction:")) {
        type = "reaction";
        value = without.slice("reaction:".length);
      } else if (without.startsWith("contest:")) {
        type = "contest";
        value = without.slice("contest:".length);
      } else if (without.startsWith("user:")) {
        type = "user";
        value = without.slice("user:".length);
      }

      if (!value) return null;

      return {
        id: `${isExclude ? "ex-" : ""}${type}-init-${index}`,
        type,
        value,
        isExclude,
      } satisfies SmartAlbumCondition;
    })
    .filter((condition): condition is SmartAlbumCondition => condition !== null);
}

export function conditionToHashtag(condition: SmartAlbumCondition): string {
  const prefix = condition.isExclude ? "-" : "";
  if (condition.type === "takenBy") return `${prefix}takenBy:${condition.value}`;
  if (condition.type === "reaction") return `${prefix}reaction:${condition.value}`;
  if (condition.type === "contest") return `${prefix}contest:${condition.value}`;
  if (condition.type === "user") return `${prefix}user:${condition.value}`;
  return `${prefix}${condition.value}`;
}
