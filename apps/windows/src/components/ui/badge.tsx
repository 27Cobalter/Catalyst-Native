import { cn } from "cn";
import { View } from "react-native";

type Props = {
  children: ({ textClassName }: { textClassName: string }) => React.ReactNode;
  variant: "success" | "info" | "error" | "warning" | "default";
}

export const toVariantClassName = (variant: "success" | "info" | "error" | "warning" | "default") => {
  // Tailwind (UniWind) の JIT コンパイラに認識してもらうため、1度 `className` に格納してから返す
  const className = cn(
    variant === "success" && "text-light-success-foreground dark:text-dark-success-foreground",
    variant === "info" && "text-light-info-foreground dark:text-dark-info-foreground",
    variant === "error" && "text-light-error-foreground dark:text-dark-error-foreground",
    variant === "warning" && "text-light-warning-foreground dark:text-dark-warning-foreground",
    variant === "default" && "text-light-text dark:text-dark-text"
  );

  return className;
};

export const Badge = ({ children, variant }: Props) => {
  return <View className={cn(
    "rounded border px-1 py-0.5",
    variant === "success" && "border-light-success bg-light-success-background dark:border-dark-success dark:bg-dark-success-background",
    variant === "info" && "border-light-info bg-light-info-background dark:border-dark-info dark:bg-dark-info-background",
    variant === "error" && "border-light-error bg-light-error-background dark:border-dark-error dark:bg-dark-error-background",
    variant === "warning" && "border-light-warning bg-light-warning-background dark:border-dark-warning dark:bg-dark-warning-background",
    variant === "default" && "border-light-border dark:border-dark-border",
  )}>
    {children({ textClassName: toVariantClassName(variant) })}
  </View>
};