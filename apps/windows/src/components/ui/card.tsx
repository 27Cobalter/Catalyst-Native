import { cn } from "cn";
import { View } from "react-native";

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export const Card = ({ children, className }: CardProps) => {
  return (
    <View
      className={cn(
        "overflow-hidden rounded-lg border-hairline border-light-divider bg-light-surface dark:border-dark-divider dark:bg-dark-surface",
        className,
      )}
    >
      {children}
    </View>
  );
};

