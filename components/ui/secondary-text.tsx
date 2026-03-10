import { cn } from "@/lib/utils";
import { Text } from "react-native";

type Props = {
  className?: string;
  children: React.ReactNode;
};

export const SecondaryText = ({ className, children }: Props) => {
  return <Text className={cn("text-neutral-500", className)}>{children}</Text>;
};
