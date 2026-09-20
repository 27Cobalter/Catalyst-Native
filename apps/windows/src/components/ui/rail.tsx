import { useHover } from "@/hooks/use-hover";
import { cn } from "cn";
import { Pressable, Text, View } from "react-native";
import { Card } from "./card";

type RailCardProps = {
  title: string;
  children: React.ReactNode;
};

export const RailCard = ({ title, children }: RailCardProps) => {
  return (
    <Card>
      <Text
        accessibilityRole="header"
        className="px-4 pt-3 pb-2 text-sm font-semibold text-light-text dark:text-dark-text"
      >
        {title}
      </Text>
      {children}
      <View className="h-2" />
    </Card>
  );
};

export const RailRow = ({ children, label }: { children: React.ReactNode; label: string }) => {
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      focusable
      className={cn(hovered && "bg-light-overlay dark:bg-dark-overlay")}
      {...hoverProps}
    >
      {children}
    </Pressable>
  );
};
