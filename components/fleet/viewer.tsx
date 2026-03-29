import { FleetContent, FleetContentData } from "@/components/fleet/content";
import { getCdnUrl, getIdenticonUrl } from "@/lib/media";
import { clientAtom } from "@/models/atoms/credential";
import { CatalystFleet } from "@natsuneko-laboratory/catalyst-sdk";
import { Image } from "expo-image";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const UniImage = withUniwind(Image);

const FLEET_DURATION = 1000 * 6; // 6 seconds

type Props = {
  username: string | null;
  visible: boolean;
  onClose: () => void;
  onMarkRead: (username: string) => void;
};

const toFleetContentData = (fleet: CatalystFleet): FleetContentData => ({
  backgroundColor: fleet.backgroundColor,
  media: fleet.media
    ? {
        url: fleet.media.url,
        alt: fleet.media.alt,
        width: fleet.media.width ?? undefined,
        height: fleet.media.height ?? undefined,
        placement: fleet.media.placement,
      }
    : null,
  stickers: fleet.stickers.map((s) => ({
    emoji: s.emoji,
    id: s.id,
    posX: s.posX,
    posY: s.posY,
    rotation: s.rotation,
    scale: s.scale,
  })),
  texts: fleet.texts.map((t) => ({
    id: t.id,
    body: t.body,
    color: t.color,
    backgroundColor: t.backgroundColor,
    posX: t.posX,
    posY: t.posY,
    rotation: t.rotation,
    scale: t.scale,
    textAlignment: t.textAlignment as "left" | "center" | "right",
    textStyle: t.textStyle as "default" | "bold" | "serif" | "handwriting",
  })),
});

type ProgressBarState = "past" | "current" | "future";

type ProgressBarProps = {
  state: ProgressBarState;
  paused: boolean;
  onComplete: () => void;
};

const ProgressBar = ({ state, paused, onComplete }: ProgressBarProps) => {
  const progress = useSharedValue(state === "past" ? 1 : 0);

  useEffect(() => {
    if (state !== "current") {
      cancelAnimation(progress);
      progress.value = state === "past" ? 1 : 0;
      return;
    }

    if (paused) {
      cancelAnimation(progress);
      return;
    }

    // 現在の進捗から残り時間を計算して再開
    const remaining = FLEET_DURATION * (1 - progress.value);
    progress.value = withTiming(1, { duration: remaining }, (finished) => {
      if (finished) runOnJS(onComplete)();
    });
  }, [state, paused, onComplete, progress]);

  const filledStyle = useAnimatedStyle(() => ({ flex: progress.value }));
  const emptyStyle = useAnimatedStyle(() => ({ flex: 1 - progress.value }));

  return (
    <View className="flex-1 h-[2.5px] flex-row rounded-full overflow-hidden">
      <Animated.View className="bg-white" style={filledStyle} />
      <Animated.View className="bg-white/40" style={emptyStyle} />
    </View>
  );
};

export const FleetViewer = ({ username, visible, onClose, onMarkRead }: Props) => {
  const client = useAtomValue(clientAtom);
  const insets = useSafeAreaInsets();
  const [fleets, setFleets] = useState<CatalystFleet[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMediaLoaded, setIsMediaLoaded] = useState(false);

  useEffect(() => {
    if (!visible || !username || !client) return;
    setIsLoading(true);
    setCurrentIndex(0);
    client.catalyst
      .fleetByUsername(username)
      .then((data) => {
        setFleets(data);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
        onClose();
      });
  }, [visible, username, client]);

  useEffect(() => {
    setIsMediaLoaded(false);
  }, [currentIndex]);

  useEffect(() => {
    if (!visible || isLoading || fleets.length === 0 || !client) return;
    const fleet = fleets[currentIndex];
    if (fleet) {
      client.catalyst.viewFleet(fleet.id).catch(() => {});
    }
  }, [visible, isLoading, currentIndex, fleets, client]);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev + 1 >= fleets.length) {
        if (username) onMarkRead(username);
        onClose();
        return prev;
      }
      return prev + 1;
    });
  }, [fleets.length, username, onClose, onMarkRead]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleMediaLoad = useCallback(() => {
    setIsMediaLoaded(true);
  }, []);

  const currentFleet = fleets[currentIndex];
  const contentData = currentFleet ? toFleetContentData(currentFleet) : null;

  const iconUrl = currentFleet?.user.profile?.iconUrl
    ? getCdnUrl({ src: currentFleet.user.profile.iconUrl, variant: "icon", width: 64 })
    : getIdenticonUrl(currentFleet?.user.id);

  const isPaused = !!(currentFleet?.media && !isMediaLoaded);

  const getProgressBarState = (index: number): ProgressBarState => {
    if (index < currentIndex) return "past";
    if (index === currentIndex) return "current";
    return "future";
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 bg-black">
        {/* Fleet content — full screen */}
        {isLoading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator colorClassName="accent-white" size="large" />
          </View>
        ) : contentData ? (
          <View className="flex-1">
            <FleetContent fleet={contentData} onMediaLoad={currentFleet?.media ? handleMediaLoad : undefined} />
            {/* Media loading overlay */}
            {currentFleet?.media && !isMediaLoaded && (
              <View className="absolute inset-0 justify-center items-center bg-black/30">
                <ActivityIndicator colorClassName="accent-white" size="large" />
              </View>
            )}
          </View>
        ) : null}

        {/* Header overlay: progress bars + user info */}
        {!isLoading && fleets.length > 0 && (
          <View className="absolute left-0 right-0 z-10" style={{ top: insets.top + 8 }} pointerEvents="none">
            <View className="flex-row gap-1 px-3 pb-2">
              {fleets.map((_, i) => (
                <ProgressBar
                  key={i}
                  state={getProgressBarState(i)}
                  paused={i === currentIndex ? isPaused : false}
                  onComplete={goNext}
                />
              ))}
            </View>
            {currentFleet && (
              <View className="flex-row items-center px-3 pb-2">
                <UniImage source={{ uri: iconUrl }} className="w-8 h-8 rounded-full" contentFit="cover" />
                <Text className="text-white ml-2 font-semibold text-sm flex-1" numberOfLines={1}>
                  {currentFleet.user.displayName || currentFleet.user.screenName}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Tap areas: left = prev, right = next */}
        <View className="absolute inset-0 flex-row" pointerEvents="box-none">
          <Pressable className="flex-1" onPress={goPrev} />
          <Pressable className="flex-1" onPress={goNext} />
        </View>

        {/* Close button */}
        <Pressable
          onPress={onClose}
          className="absolute right-4 z-20 w-8 h-8 justify-center items-center"
          style={{ top: insets.top + 48 }}
          hitSlop={16}
        >
          <Text className="text-white text-lg font-semibold">✕</Text>
        </Pressable>
      </View>
    </Modal>
  );
};
