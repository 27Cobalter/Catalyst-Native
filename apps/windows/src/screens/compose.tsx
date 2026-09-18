import { BarChart3, ChevronDown, EyeOff, Globe, Image, MapPin, Smile } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { withUniwind } from "uniwind";
import { Avatar, Button, Divider, IconButton, Skeleton } from "../components/ui";
import { useDismissScene } from "../scenes/scene-host";

const UniBarChart3 = withUniwind(BarChart3);
const UniChevronDown = withUniwind(ChevronDown);
const UniEyeOff = withUniwind(EyeOff);
const UniGlobe = withUniwind(Globe);
const UniImage = withUniwind(Image);
const UniMapPin = withUniwind(MapPin);
const UniSmile = withUniwind(Smile);

const MAX_LENGTH = 500;
const TOOL_ICON = "text-light-link dark:text-dark-link";

type Props = {
  replyTo?: string;
};

// 投稿作成。メールアプリの「新しいウィンドウで作成」と同じく、既定では別ウィンドウで開いてタイムラインを見ながら書けるようにする
export const Compose = ({ replyTo }: Props) => {
  const dismiss = useDismissScene();
  const [text, setText] = useState("");
  const remaining = MAX_LENGTH - text.length;

  const submit = () => {
    if (text.length === 0 || remaining < 0) return;
    dismiss();
  };

  return (
    <View
      className="flex-1 bg-light-background dark:bg-dark-background"
      keyDownEvents={[{ code: "Enter", ctrlKey: true }, { code: "Escape" }]}
      onKeyDown={(event) => {
        if (event.nativeEvent.code === "Enter" && event.nativeEvent.ctrlKey) submit();
        if (event.nativeEvent.code === "Escape") dismiss();
      }}
    >
      <ScrollView className="flex-1" contentContainerClassName="gap-3 p-5">
        {replyTo && (
          <View className="flex-row gap-3 rounded-lg border-hairline border-light-divider p-3 dark:border-dark-divider">
            <Skeleton className="size-8 rounded-full" />
            <View className="flex-1 gap-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-full" />
            </View>
          </View>
        )}
        <View className="flex-row gap-3">
          <Avatar />
          <View className="flex-1 gap-2">
            <Button
              tone="secondary"
              size="sm"
              label="公開"
              className="self-start"
              icon={<UniGlobe size={14} className="text-light-icon dark:text-dark-icon" />}
            />
            <TextInput
              autoFocus
              multiline
              // 本文欄は常に入力対象なので、システムのフォーカス枠は出さない (ボタン類のキーボード操作時は表示される)
              enableFocusRing={false}
              accessibilityLabel="投稿の本文"
              placeholder={replyTo ? "返信を入力" : "いまどうしてる？"}
              placeholderTextColorClassName="accent-light-text-subtle dark:accent-dark-text-subtle"
              className="min-h-40 text-base leading-6 text-light-text dark:text-dark-text"
              value={text}
              onChangeText={setText}
            />
          </View>
        </View>
        {/* 添付のプレースホルダー: ドラッグ & ドロップ / クリップボードからの貼り付けを受け付ける領域 */}
        <View className="h-24 items-center justify-center rounded-lg border-hairline border-dashed border-light-border dark:border-dark-border">
          <Text className="text-[13px] text-light-text-subtle dark:text-dark-text-subtle">
            画像をドロップ、または Ctrl+V で貼り付け
          </Text>
        </View>
      </ScrollView>
      <Divider />
      {/* Fluent の CommandBar: 左に添付系、右に送信系 */}
      <View className="flex-row items-center gap-1 px-3 py-2">
        <IconButton label="画像を追加">
          <UniImage size={18} className={TOOL_ICON} />
        </IconButton>
        <IconButton label="絵文字を追加" shortcut="Win+.">
          <UniSmile size={18} className={TOOL_ICON} />
        </IconButton>
        <IconButton label="投票を追加">
          <UniBarChart3 size={18} className={TOOL_ICON} />
        </IconButton>
        <IconButton label="注意書きを追加">
          <UniEyeOff size={18} className={TOOL_ICON} />
        </IconButton>
        <IconButton label="位置情報を追加">
          <UniMapPin size={18} className={TOOL_ICON} />
        </IconButton>
        <View className="flex-1" />
        <Text
          className={
            remaining < 0
              ? "px-2 text-xs text-light-error dark:text-dark-error"
              : "px-2 text-xs text-light-text-muted dark:text-dark-text-muted"
          }
        >
          {remaining}
        </Text>
        <Button tone="subtle" label="キャンセル" onPress={dismiss} />
        <View className="flex-row">
          <Button
            label={replyTo ? "返信" : "投稿"}
            tooltip="投稿 (Ctrl+Enter)"
            disabled={text.length === 0 || remaining < 0}
            className="rounded-r-none"
            onPress={submit}
          />
          <Button
            hideLabel
            label="予約投稿・下書きに保存"
            icon={
              <UniChevronDown size={14} className="text-light-accent-foreground dark:text-dark-accent-foreground" />
            }
            className="ml-px w-8 rounded-l-none px-0"
          />
        </View>
      </View>
    </View>
  );
};
