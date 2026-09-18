import { cn } from "cn";
import {
  Accessibility,
  Bell,
  ChevronLeft,
  ChevronRight,
  Globe,
  Info,
  Monitor,
  Shield,
  Smile,
  User,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { Avatar, Button, Card, IconButton, SearchField, Skeleton, useHover } from "../components/ui";
import { useContainerWidth } from "../layout/breakpoints";

type Category =
  "account" | "display" | "notifications" | "privacy" | "accessibility" | "reactions" | "activitypub" | "about";

// withUniwind はレンダリングのたびに呼ぶとコンポーネントが作り直されるため、モジュールの読み込み時にまとめて包む
const CATEGORIES = [
  { key: "account", label: "アカウント", icon: withUniwind(User) },
  { key: "display", label: "表示", icon: withUniwind(Monitor) },
  { key: "notifications", label: "通知", icon: withUniwind(Bell) },
  { key: "privacy", label: "プライバシーとセキュリティ", icon: withUniwind(Shield) },
  { key: "accessibility", label: "アクセシビリティ", icon: withUniwind(Accessibility) },
  { key: "reactions", label: "カスタムリアクション", icon: withUniwind(Smile) },
  { key: "activitypub", label: "ActivityPub", icon: withUniwind(Globe) },
  { key: "about", label: "Catalyst について", icon: withUniwind(Info) },
] satisfies { key: Category; label: string; icon: unknown }[];

type SettingRow = { title: string; description?: string; control: "switch" | "select" | "link" };

// 各カテゴリの項目は apps/mobile/src/app/settings/* に対応する
const ROWS: Record<Category, SettingRow[]> = {
  account: [
    { title: "プロフィールを編集", description: "表示名・自己紹介・アイコン", control: "link" },
    { title: "メールアドレス", control: "link" },
    { title: "連携中のアプリ", control: "link" },
    { title: "ログアウト", control: "link" },
  ],
  display: [
    { title: "テーマ", description: "Windows の設定に従う / ライト / ダーク", control: "select" },
    { title: "文字サイズ", description: "Windows のテキストサイズ設定に加えて調整します", control: "select" },
    { title: "センシティブなメディアを表示", control: "switch" },
    {
      title: "投稿を詳細ペインで開く",
      description: "ウィンドウ幅が足りない場合は画面を切り替えて表示します",
      control: "switch",
    },
  ],
  notifications: [
    { title: "Windows の通知を使用", description: "アクションセンターにトーストを表示します", control: "switch" },
    { title: "メンション", control: "switch" },
    { title: "リアクション", control: "switch" },
    { title: "フォロー", control: "switch" },
    { title: "タスクバーのバッジ", description: "未読の件数をアイコンに表示します", control: "switch" },
  ],
  privacy: [
    { title: "非公開アカウント", control: "switch" },
    { title: "ミュートしたユーザー", control: "link" },
    { title: "ブロックしたユーザー", control: "link" },
  ],
  accessibility: [
    {
      title: "アニメーションを減らす",
      description: "Windows の「アニメーション効果」の設定にも従います",
      control: "switch",
    },
    { title: "画像の代替テキストを必須にする", control: "switch" },
  ],
  reactions: [{ title: "リアクションを管理", control: "link" }],
  activitypub: [
    { title: "ActivityPub 連携", control: "switch" },
    { title: "リモートフォローを承認制にする", control: "switch" },
  ],
  about: [
    { title: "バージョン", description: "0.0.1", control: "link" },
    { title: "利用規約", control: "link" },
    { title: "オープンソースライセンス", control: "link" },
  ],
};

const ICON = "text-light-icon dark:text-dark-icon";

const CategoryItem = ({
  item,
  selected,
  onPress,
}: {
  item: (typeof CATEGORIES)[number];
  selected: boolean;
  onPress: () => void;
}) => {
  const { hovered, hoverProps } = useHover();
  const Icon = item.icon;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      focusable
      className={cn(
        "h-9 flex-row items-center gap-3 rounded px-3",
        (hovered || selected) && "bg-light-overlay dark:bg-dark-overlay",
      )}
      onPress={onPress}
      {...hoverProps}
    >
      {selected && <View className="absolute left-0 h-4 w-[3px] rounded-full bg-light-accent dark:bg-dark-accent" />}
      <Icon size={16} className={ICON} />
      <Text numberOfLines={1} className="flex-1 text-sm text-light-text dark:text-dark-text">
        {item.label}
      </Text>
    </Pressable>
  );
};

// Windows 11 の設定アプリにならった SettingsCard: タイトル・説明を左に、操作を右に置く
const SettingCard = ({ row }: { row: SettingRow }) => {
  const [value, setValue] = useState(false);
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      accessibilityRole={row.control === "switch" ? "switch" : "button"}
      focusable
      className={cn(
        "min-h-16 flex-row items-center gap-4 rounded-md border-hairline border-light-divider px-4 py-3 dark:border-dark-divider",
        hovered ? "bg-light-surface-elevated dark:bg-dark-surface-elevated" : "bg-light-surface dark:bg-dark-surface",
      )}
      onPress={() => row.control === "switch" && setValue((current) => !current)}
      {...hoverProps}
    >
      <View className="flex-1 gap-0.5">
        <Text className="text-sm text-light-text dark:text-dark-text">{row.title}</Text>
        {row.description && (
          <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">{row.description}</Text>
        )}
      </View>
      {row.control === "switch" && <Switch value={value} onValueChange={setValue} />}
      {row.control === "select" && <Button tone="secondary" label="Windows の設定に従う" />}
      {row.control === "link" && <ChevronRightIcon />}
    </Pressable>
  );
};

const UniChevronRight = withUniwind(ChevronRight);
const UniChevronLeft = withUniwind(ChevronLeft);
const ChevronRightIcon = () => <UniChevronRight size={16} className={ICON} />;

const CategoryPage = ({ category, onBack }: { category: Category; onBack?: () => void }) => {
  const label = CATEGORIES.find((item) => item.key === category)?.label;

  return (
    <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-[1000px] gap-1 px-6 pb-10 pt-4">
      <View className="mb-4 flex-row items-center gap-2">
        {onBack && (
          <IconButton label="戻る" onPress={onBack}>
            <UniChevronLeft size={18} className={ICON} />
          </IconButton>
        )}
        <Text accessibilityRole="header" className="text-[28px] font-semibold text-light-text dark:text-dark-text">
          {label}
        </Text>
      </View>
      {category === "account" && (
        <Card className="mb-3 flex-row items-center gap-4 p-4">
          <Avatar size="lg" />
          <View className="flex-1 gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </View>
        </Card>
      )}
      {ROWS[category].map((row) => (
        <SettingCard key={row.title} row={row} />
      ))}
    </ScrollView>
  );
};

const CategoryList = ({ value, onChange }: { value: Category | null; onChange: (value: Category) => void }) => {
  return (
    <ScrollView contentContainerClassName="gap-0.5 px-3 pb-6 pt-4">
      <SearchField placeholder="設定を検索" className="mb-3" />
      {CATEGORIES.map((item) => (
        <CategoryItem key={item.key} item={item} selected={item.key === value} onPress={() => onChange(item.key)} />
      ))}
    </ScrollView>
  );
};

// 幅があれば左にカテゴリ・右に項目の 2 ペイン、狭ければカテゴリ一覧 → 項目へ切り替える
export const Settings = () => {
  const { width, onLayout } = useContainerWidth();
  const [category, setCategory] = useState<Category | null>(null);
  const twoPane = width >= 720;

  return (
    <View className="flex-1 flex-row bg-light-background dark:bg-dark-background" onLayout={onLayout}>
      {width > 0 &&
        (twoPane ? (
          <>
            <View className="w-[280px] border-r-hairline border-light-divider dark:border-dark-divider">
              <CategoryList value={category ?? "account"} onChange={setCategory} />
            </View>
            <CategoryPage category={category ?? "account"} />
          </>
        ) : category ? (
          <CategoryPage category={category} onBack={() => setCategory(null)} />
        ) : (
          <View className="flex-1">
            <CategoryList value={null} onChange={setCategory} />
          </View>
        ))}
    </View>
  );
};
