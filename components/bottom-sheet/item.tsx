import { cn } from "@/lib/utils";
import { Pressable, Text } from "react-native";

type Props = {
  onPress?: () => void;
  title: string;
  prefixIcon?: React.ComponentType<{ size?: number; color?: string; className?: string }>;
  suffixIcon?: React.ComponentType<{ size?: number; color?: string; className?: string }>;
  className?: string;
  highlight?: boolean;
  destructive?: boolean;
};

export const BottomSheetItem = ({
  onPress,
  title,
  prefixIcon: PrefixIcon,
  suffixIcon: SuffixIcon,
  className,
  highlight,
  destructive,
}: Props) => {
  return (
    <Pressable
      className="flex flex-row items-center gap-3 mx-2 px-3 py-4 rounded-lg bg-light-surface dark:bg-dark-surface"
      onPress={onPress}
    >
      {PrefixIcon && (
        <PrefixIcon
          size={20}
          className={cn(
            "text-light-text dark:text-dark-text",
            highlight && "text-light-accent dark:text-dark-accent",
            destructive && "text-light-error dark:text-dark-error",
            className,
          )}
        />
      )}
      <Text
        className={cn(
          "text-light-text dark:text-dark-text",
          destructive && "text-light-error dark:text-dark-error",
          className,
        )}
      >
        {title}
      </Text>
      {SuffixIcon && (
        <SuffixIcon
          size={20}
          className={cn(
            "text-light-text dark:text-dark-text",
            highlight && "text-light-accent dark:text-dark-accent",
            destructive && "text-light-error dark:text-dark-error",
            className,
          )}
        />
      )}
    </Pressable>
  );
};
