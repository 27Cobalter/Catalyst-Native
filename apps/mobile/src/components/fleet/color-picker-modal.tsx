import { CatalystButton, CatalystButtonText, CatalystText } from "@/components/design-system";
import { Palette, X } from "lucide-react-native";
import { Modal, Pressable, View, useColorScheme, useWindowDimensions } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ColorPicker, { HueSlider, InputWidget, Panel1, Preview, Swatches } from "reanimated-color-picker";
import { withUniwind } from "uniwind";

const UniX = withUniwind(X);
const UniPalette = withUniwind(Palette);

export type FleetColorPickerButtonProps = {
  /** 現在の色。`transparent` のときは中身なしの破線で表す。 */
  color: string;
  accessibilityLabel: string;
  size?: number;
  onPress: () => void;
};

/**
 * カラーピッカーを開くボタン。現在の色の丸 + パレットのバッジで、
 * 「これを押すと色を選べる」ことを背景色・文字色・テキスト背景色で共通に表す。
 */
export const FleetColorPickerButton = ({
  color,
  accessibilityLabel,
  size = 32,
  onPress,
}: FleetColorPickerButtonProps) => (
  <Pressable accessibilityLabel={accessibilityLabel} onPress={onPress} className="active:opacity-80">
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color === "transparent" ? undefined : color,
        borderColor: "rgba(128,128,128,0.4)",
        borderStyle: color === "transparent" ? "dashed" : "solid",
        borderWidth: 1,
      }}
    />
    <View className="absolute -bottom-1 -right-1 rounded-full bg-light-surface-elevated p-0.5 dark:bg-dark-surface-elevated">
      <UniPalette size={12} className="text-light-text-muted dark:text-dark-text-muted" />
    </View>
  </Pressable>
);

/** サーバーは `#rrggbb` (6桁) のみ受け付けるため、アルファ付きで返ってきた場合は切り落とす。 */
const toHex6 = (hex: string) => {
  "worklet";
  return hex.slice(0, 7);
};

export type FleetColorPickerModalProps = {
  /** 表示中の色。`transparent` の場合はピッカー上では黒として扱う。 */
  value: string;
  title: string;
  visible: boolean;
  /** プリセットのカラーパレット。省略時はスウォッチを出さない。 */
  swatches?: readonly string[];
  /**
   * ドラッグ中の色を UI スレッドから直接書き込む先。
   * React の再描画を挟まないので、プレビューが指の動きに遅れず追従する。
   */
  liveColor: SharedValue<string>;
  /** 「なし」(transparent) を選べるようにする場合に渡す。 */
  onSelectTransparent?: () => void;
  onChange: (color: string) => void;
  onClose: () => void;
};

export const FleetColorPickerModal = ({
  value,
  title,
  visible,
  swatches,
  liveColor,
  onSelectTransparent,
  onChange,
  onClose,
}: FleetColorPickerModalProps) => {
  const theme = useColorScheme() ?? "light";
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const textColor = theme === "dark" ? "#FFFFFF" : "#11181C";
  const borderColor = theme === "dark" ? "#48484A" : "#C7C7CC";

  // 小さい端末でもシート全体が画面に収まるよう、彩度・明度パネルの高さを画面基準にする
  const panelHeight = Math.min(180, windowHeight * 0.2);

  // visible の間だけマウントすることで、開くたびに現在の色でピッカーを初期化する
  if (!visible) return null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      {/* Modal 内では GestureHandlerRootView を張り直さないとジェスチャーが効かない */}
      <GestureHandlerRootView className="flex-1">
        <Pressable className="flex-1" onPress={onClose} />
        <View
          className="gap-3 rounded-t-2xl bg-light-surface-elevated p-4 dark:bg-dark-surface-elevated"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <View className="flex-row items-center justify-between">
            <CatalystText variant="subtitle">{title}</CatalystText>
            <Pressable onPress={onClose} hitSlop={8}>
              <UniX size={20} className="text-light-text dark:text-dark-text" />
            </Pressable>
          </View>

          <ColorPicker
            value={value === "transparent" ? "#000000" : value}
            onChange={({ hex }) => {
              "worklet";
              liveColor.value = toHex6(hex);
            }}
            onCompleteJS={({ hex }) => onChange(toHex6(hex))}
            style={{ gap: 12 }}
          >
            {/* 色はバーを見れば分かるので hex は出さない (数値指定は下の HEX 入力で) */}
            <Preview hideInitialColor hideText style={{ height: 28 }} />
            <Panel1 style={{ height: panelHeight }} />
            <HueSlider />
            {/* 入力欄が 1 つだけなので "HEX" の見出しラベルは出さない */}
            <InputWidget
              formats={["HEX"]}
              disableAlphaChannel
              iconColor={textColor}
              inputStyle={{ borderColor, color: textColor }}
              inputTitleStyle={{ display: "none" }}
            />
            {swatches && (
              <Swatches
                colors={[...swatches]}
                style={{ flexWrap: "nowrap" }}
                swatchStyle={{ width: 28, height: 28, borderRadius: 14, marginBottom: 0, marginHorizontal: 0 }}
              />
            )}
          </ColorPicker>

          {/* 他のポップアップと同じく「完了」で閉じられるようにしておく */}
          <View className="flex-row gap-3">
            {onSelectTransparent && (
              <CatalystButton
                className="flex-1"
                tone={value === "transparent" ? "primary" : "secondary"}
                onPress={onSelectTransparent}
              >
                <CatalystButtonText>なし (透明)</CatalystButtonText>
              </CatalystButton>
            )}
            <CatalystButton className="flex-1" tone="primary" onPress={onClose}>
              <CatalystButtonText>完了</CatalystButtonText>
            </CatalystButton>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};
