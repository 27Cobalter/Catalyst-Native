import { cn } from "cn";
import { Search } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { withUniwind } from "uniwind";

const UniSearch = withUniwind(Search);

type PressableProps = React.ComponentProps<typeof Pressable>;

// macOS ではホバーが主要なフィードバックになるため、ホバー状態を className に反映できるようにする
export const useHover = () => {
  const [hovered, setHovered] = useState(false);
  return {
    hovered,
    hoverProps: {
      onHoverIn: () => setHovered(true),
      onHoverOut: () => setHovered(false),
    },
  };
};

type AvatarProps = {
  name?: string;
  size?: "sm" | "md";
  className?: string;
};

export const Avatar = ({ name, size = "md", className }: AvatarProps) => {
  return (
    <View
      accessibilityLabel={name}
      className={cn(
        "shrink-0 items-center justify-center overflow-hidden rounded-full bg-light-surface-muted dark:bg-dark-surface-muted",
        size === "sm" && "size-8",
        size === "md" && "size-10",
        className,
      )}
    >
      <Text
        className={cn(
          "font-semibold text-light-text-muted dark:text-dark-text-muted",
          size === "sm" ? "text-xs" : "text-sm",
        )}
      >
        {name?.slice(0, 1) ?? ""}
      </Text>
    </View>
  );
};

type ButtonProps = Omit<PressableProps, "children"> & {
  label: string;
  icon?: React.ReactNode;
  tone?: "accent" | "secondary";
  size?: "sm" | "md" | "lg";
};

export const Button = ({ label, icon, tone = "accent", size = "md", className, disabled, ...props }: ButtonProps) => {
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      focusable
      disabled={disabled}
      className={cn(
        "flex-row items-center justify-center gap-2 rounded-full",
        size === "sm" && "h-7 px-3",
        size === "md" && "h-8 px-4",
        size === "lg" && "h-10 px-5",
        tone === "accent" && "bg-light-accent dark:bg-dark-accent",
        tone === "secondary" && "bg-light-surface-muted dark:bg-dark-surface-muted",
        hovered && !disabled && "opacity-85",
        disabled && "opacity-50",
        className as string,
      )}
      {...hoverProps}
      {...props}
    >
      {icon}
      <Text
        className={cn(
          "font-semibold",
          size === "lg" ? "text-[15px]" : "text-[13px]",
          tone === "accent"
            ? "text-light-accent-foreground dark:text-dark-accent-foreground"
            : "text-light-text dark:text-dark-text",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
};

type IconButtonProps = Omit<PressableProps, "children"> & {
  label: string;
  children: React.ReactNode;
};

export const IconButton = ({ label, children, className, ...props }: IconButtonProps) => {
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      focusable
      className={cn(
        "size-8 items-center justify-center rounded-full",
        hovered && "bg-light-surface-muted dark:bg-dark-surface-muted",
        className as string,
      )}
      {...hoverProps}
      {...props}
    >
      {children}
    </Pressable>
  );
};

export const Skeleton = ({ className }: { className?: string }) => {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn("rounded-md bg-light-skeleton dark:bg-dark-skeleton", className)}
    />
  );
};

export const Divider = ({ className }: { className?: string }) => {
  return <View className={cn("h-px bg-light-divider dark:bg-dark-divider", className)} />;
};

type SearchFieldProps = React.ComponentProps<typeof TextInput>;

export const SearchField = ({ className, ...props }: SearchFieldProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <View
      className={cn(
        "h-9 flex-row items-center gap-2 rounded-full border px-3",
        "bg-light-surface-muted dark:bg-dark-surface-muted",
        focused ? "border-light-accent dark:border-dark-accent" : "border-transparent",
        className,
      )}
    >
      <UniSearch size={16} className="text-light-icon dark:text-dark-icon" />
      <TextInput
        accessibilityLabel={props.placeholder}
        className="flex-1 text-[13px] text-light-text dark:text-dark-text"
        placeholderTextColorClassName="accent-light-text-subtle dark:accent-dark-text-subtle"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
    </View>
  );
};

export type SegmentedTab<T extends string> = { key: T; label: string };

type SegmentedTabsProps<T extends string> = {
  tabs: SegmentedTab<T>[];
  value: T;
  onChange: (value: T) => void;
};

// Twitter / Mastodon のデスクトップ版にならい、ヘッダー下に並ぶ下線インジケーター付きのタブ
export const SegmentedTabs = <T extends string>({ tabs, value, onChange }: SegmentedTabsProps<T>) => {
  return (
    <View accessibilityRole="tablist" className="flex-row">
      {tabs.map((tab) => (
        <SegmentedTabItem key={tab.key} tab={tab} selected={tab.key === value} onPress={() => onChange(tab.key)} />
      ))}
    </View>
  );
};

type SegmentedTabItemProps<T extends string> = {
  tab: SegmentedTab<T>;
  selected: boolean;
  onPress: () => void;
};

const SegmentedTabItem = <T extends string>({ tab, selected, onPress }: SegmentedTabItemProps<T>) => {
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      focusable
      className={cn("flex-1 items-center", hovered && "bg-light-surface dark:bg-dark-surface")}
      onPress={onPress}
      {...hoverProps}
    >
      <View className="h-11 justify-center">
        <Text
          className={cn(
            "text-[13px]",
            selected
              ? "font-bold text-light-text dark:text-dark-text"
              : "font-medium text-light-text-muted dark:text-dark-text-muted",
          )}
        >
          {tab.label}
        </Text>
      </View>
      <View
        className={cn("h-[3px] w-12 rounded-full", selected ? "bg-light-accent dark:bg-dark-accent" : "bg-transparent")}
      />
    </Pressable>
  );
};

type EmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

export const EmptyState = ({ icon, title, description }: EmptyStateProps) => {
  return (
    <View className="items-center gap-3 px-8 py-16">
      <View className="size-14 items-center justify-center rounded-full bg-light-toggle dark:bg-dark-toggle">
        {icon}
      </View>
      <Text className="text-center text-lg font-bold text-light-text dark:text-dark-text">{title}</Text>
      <Text className="max-w-80 text-center text-[13px] leading-5 text-light-text-muted dark:text-dark-text-muted">
        {description}
      </Text>
    </View>
  );
};
