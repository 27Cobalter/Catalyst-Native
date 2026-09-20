import { cn } from "cn";
import { Search } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { withUniwind } from "uniwind";

const UniSearch = withUniwind(Search);

type PressableProps = React.ComponentProps<typeof Pressable> & {
  // react-native-windows の View が持つツールチップ。マウス操作が主体の Windows ではアイコンだけのボタンに必須
  tooltip?: string;
};

// マウス操作ではホバーが主要なフィードバックになるため、ホバー状態を className に反映できるようにする
/** @deprecated */
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

// ショートカットをツールチップに併記する (例: "投稿する (Ctrl+N)")
export const withShortcut = (label: string, shortcut?: string) => (shortcut ? `${label} (${shortcut})` : label);

type AvatarProps = {
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
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
        size === "lg" && "size-12",
        size === "xl" && "size-24 border-4 border-light-background dark:border-dark-background",
        className,
      )}
    >
      <Text
        className={cn(
          "font-semibold text-light-text-muted dark:text-dark-text-muted",
          size === "sm" && "text-xs",
          (size === "md" || size === "lg") && "text-sm",
          size === "xl" && "text-3xl",
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
  tone?: "accent" | "secondary" | "subtle";
  size?: "sm" | "md" | "lg";
  // 分割ボタンの ▼ 側などアイコンだけを表示する場合。label は読み上げとツールチップに使う
  hideLabel?: boolean;
};

// Fluent のボタンにならい、角丸 4px・高さ 32px を基本にする (lg はサイドバーの主要 CTA 用)
export const Button = ({
  label,
  icon,
  tone = "accent",
  size = "md",
  hideLabel = false,
  className,
  disabled,
  ...props
}: ButtonProps) => {
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      tooltip={hideLabel ? label : undefined}
      focusable
      disabled={disabled}
      className={cn(
        "flex-row items-center justify-center gap-2 rounded",
        size === "sm" && "h-7 px-2.5",
        size === "md" && "h-8 px-3",
        size === "lg" && "h-10 rounded-md px-4",
        tone === "accent" && "bg-light-accent dark:bg-dark-accent",
        tone === "secondary" &&
        "border-hairline border-light-border bg-light-surface dark:border-dark-border dark:bg-dark-surface-elevated",
        tone === "subtle" && hovered && "bg-light-overlay dark:bg-dark-overlay",
        tone !== "subtle" && hovered && !disabled && "opacity-90",
        "active:opacity-75",
        disabled && "opacity-40",
        className as string,
      )}
      {...hoverProps}
      {...props}
    >
      {icon}
      {!hideLabel && (
        <Text
          numberOfLines={1}
          className={cn(
            size === "sm" ? "text-[13px]" : "text-sm",
            tone === "accent"
              ? "font-semibold text-light-accent-foreground dark:text-dark-accent-foreground"
              : "text-light-text dark:text-dark-text",
          )}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
};

type IconButtonProps = Omit<PressableProps, "children"> & {
  label: string;
  shortcut?: string;
  children: React.ReactNode;
};

export const IconButton = ({ label, shortcut, children, className, ...props }: IconButtonProps) => {
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      tooltip={withShortcut(label, shortcut)}
      focusable
      className={cn(
        "size-8 items-center justify-center rounded",
        hovered && "bg-light-overlay dark:bg-dark-overlay",
        "active:opacity-70",
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
      className={cn("rounded bg-light-skeleton dark:bg-dark-skeleton", className)}
    />
  );
};

export const Divider = ({ className }: { className?: string }) => {
  return <View className={cn("h-hairline bg-light-divider dark:bg-dark-divider", className)} />;
};

type SearchFieldProps = React.ComponentProps<typeof TextInput>;

// Fluent の TextBox: 角丸 4px の枠 + フォーカス時は下辺だけアクセントカラーの 2px ライン
export const SearchField = ({ className, ...props }: SearchFieldProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <View
      className={cn(
        "h-8 flex-row items-center gap-2 overflow-hidden rounded border-hairline px-2.5",
        focused
          ? "border-light-border bg-light-background dark:border-dark-border dark:bg-dark-background"
          : "border-light-divider bg-light-surface dark:border-dark-divider dark:bg-dark-surface",
        className,
      )}
    >
      <UniSearch size={14} className="text-light-icon dark:text-dark-icon" />
      <TextInput
        accessibilityLabel={props.placeholder}
        className="flex-1 text-sm text-light-text dark:text-dark-text"
        placeholderTextColorClassName="accent-light-text-subtle dark:accent-dark-text-subtle"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {focused && <View className="absolute inset-x-0 bottom-0 h-0.5 bg-light-accent dark:bg-dark-accent" />}
    </View>
  );
};

export type SegmentedTab<T extends string> = { key: T; label: string };

type SegmentedTabsProps<T extends string> = {
  tabs: SegmentedTab<T>[];
  value: T;
  onChange: (value: T) => void;
};

// WinUI の SelectorBar にならった左寄せのタブ。選択中の項目だけ文字の下に短いインジケーターを出す
export const SegmentedTabs = <T extends string>({ tabs, value, onChange }: SegmentedTabsProps<T>) => {
  return (
    <View accessibilityRole="tablist" className="flex-row gap-1 px-3">
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

export const TabItemContent = ({
  label,
  selected,
  hovered,
}: {
  label: string;
  selected: boolean;
  hovered: boolean;
}) => {
  return (
    <View className={cn("items-center rounded px-3", hovered && "bg-light-overlay dark:bg-dark-overlay")}>
      <View className="h-10 justify-center">
        <Text
          className={cn(
            "text-sm",
            selected
              ? "font-semibold text-light-text dark:text-dark-text"
              : "text-light-text-muted dark:text-dark-text-muted",
          )}
        >
          {label}
        </Text>
      </View>
      <View
        className={cn("h-[3px] w-4 rounded-full", selected ? "bg-light-accent dark:bg-dark-accent" : "bg-transparent")}
      />
    </View>
  );
};

const SegmentedTabItem = <T extends string>({ tab, selected, onPress }: SegmentedTabItemProps<T>) => {
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected }} focusable onPress={onPress} {...hoverProps}>
      <TabItemContent label={tab.label} selected={selected} hovered={hovered} />
    </Pressable>
  );
};

type EmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
};

export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => {
  return (
    <View className="items-center gap-3 px-8 py-16">
      <View className="size-14 items-center justify-center rounded-full bg-light-toggle dark:bg-dark-toggle">
        {icon}
      </View>
      <Text className="text-center text-xl font-semibold text-light-text dark:text-dark-text">{title}</Text>
      <Text className="max-w-80 text-center text-sm leading-5 text-light-text-muted dark:text-dark-text-muted">
        {description}
      </Text>
      {action}
    </View>
  );
};

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

// Fluent のカード: 角丸 8px + hairline の枠
/** @deprecated */
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
