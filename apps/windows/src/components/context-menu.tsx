import { cn } from "cn";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Pressable, Text, View, type LayoutChangeEvent, type PointerEvent } from "react-native";
import { useHover } from "./ui";

export type MenuItem =
  | {
      type?: "item";
      label: string;
      icon?: React.ReactNode;
      shortcut?: string;
      destructive?: boolean;
      onPress: () => void;
    }
  | { type: "separator" };

type MenuRequest = { x: number; y: number; items: MenuItem[] };

type MenuContextValue = {
  show: (request: MenuRequest) => void;
  hide: () => void;
};

const MenuContext = createContext<MenuContextValue>({ show: () => {}, hide: () => {} });

export const useContextMenu = () => useContext(MenuContext);

const MENU_WIDTH = 240;
const EDGE_MARGIN = 8;

// ポインタイベントから、右クリック (button 2) と中クリック (button 1) を判別するための props を作る
export const usePointerButtons = ({
  onContextMenu,
  onMiddleClick,
}: {
  onContextMenu?: (x: number, y: number) => void;
  onMiddleClick?: () => void;
}) => {
  return {
    onPointerUp: (event: PointerEvent) => {
      const native = event.nativeEvent;
      if (native.button === 2 && onContextMenu) onContextMenu(native.pageX, native.pageY);
      if (native.button === 1 && onMiddleClick) onMiddleClick();
    },
  };
};

const MenuRow = ({ item, onDismiss }: { item: Extract<MenuItem, { label: string }>; onDismiss: () => void }) => {
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      accessibilityRole="menuitem"
      focusable
      className={cn(
        "mx-1 h-8 flex-row items-center gap-3 rounded px-2.5",
        hovered && "bg-light-overlay dark:bg-dark-overlay",
      )}
      onPress={() => {
        onDismiss();
        item.onPress();
      }}
      {...hoverProps}
    >
      <View className="size-4 items-center justify-center">{item.icon}</View>
      <Text
        numberOfLines={1}
        className={cn(
          "flex-1 text-sm",
          item.destructive ? "text-light-error dark:text-dark-error" : "text-light-text dark:text-dark-text",
        )}
      >
        {item.label}
      </Text>
      {item.shortcut && (
        <Text className="text-xs text-light-text-subtle dark:text-dark-text-subtle">{item.shortcut}</Text>
      )}
    </Pressable>
  );
};

// WinUI の MenuFlyout 相当。native の island は Fabric の兄弟要素より手前に合成されるため、
// ポップアップはシーン (Page / 別ウィンドウ) ごとのルート内に描画する
export const ContextMenuHost = ({ children }: { children: React.ReactNode }) => {
  const [request, setRequest] = useState<MenuRequest | null>(null);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const [menuHeight, setMenuHeight] = useState(0);

  const hide = useCallback(() => setRequest(null), []);
  const value = useMemo(() => ({ show: setRequest, hide }), [hide]);

  // 画面端ではみ出す場合は Windows のメニューと同じく反対側に開く
  const left = request
    ? request.x + MENU_WIDTH + EDGE_MARGIN > bounds.width
      ? Math.max(EDGE_MARGIN, request.x - MENU_WIDTH)
      : request.x
    : 0;
  const top = request
    ? request.y + menuHeight + EDGE_MARGIN > bounds.height
      ? Math.max(EDGE_MARGIN, request.y - menuHeight)
      : request.y
    : 0;

  return (
    <MenuContext.Provider value={value}>
      <View
        className="flex-1"
        onLayout={(event: LayoutChangeEvent) => setBounds(event.nativeEvent.layout)}
        keyDownEvents={request ? [{ code: "Escape" }] : undefined}
        onKeyDown={(event) => {
          if (request && event.nativeEvent.key === "Escape") hide();
        }}
      >
        {children}
        {request && (
          <Pressable
            accessibilityLabel="メニューを閉じる"
            className="absolute inset-0"
            focusable={false}
            onPress={hide}
          >
            <View
              accessibilityRole="menu"
              className="absolute rounded-lg border-hairline border-light-border bg-light-surface-elevated py-1 shadow-lg dark:border-dark-border dark:bg-dark-surface-elevated"
              style={{ left, top, width: MENU_WIDTH, opacity: menuHeight > 0 ? 1 : 0 }}
              onLayout={(event) => setMenuHeight(event.nativeEvent.layout.height)}
            >
              {request.items.map((item, index) =>
                item.type === "separator" ? (
                  <View key={index} className="my-1 h-hairline bg-light-divider dark:bg-dark-divider" />
                ) : (
                  <MenuRow key={index} item={item} onDismiss={hide} />
                ),
              )}
            </View>
          </Pressable>
        )}
      </View>
    </MenuContext.Provider>
  );
};
