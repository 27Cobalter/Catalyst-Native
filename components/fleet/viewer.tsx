import { FleetContent, FleetContentData } from "@/components/fleet/content";
import { getCdnUrl, getIdenticonUrl } from "@/lib/media";
import { clientAtom } from "@/models/atoms/credential";
import { CatalystFleet } from "@natsuneko-laboratory/catalyst-sdk";
import { Image } from "expo-image";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FLEET_DURATION = 6000;

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
  onComplete: () => void;
};

const ProgressBar = ({ state, onComplete }: ProgressBarProps) => {
  const progress = useSharedValue(state === "past" ? 1 : 0);

  useEffect(() => {
    if (state === "current") {
      progress.value = 0;
      progress.value = withTiming(1, { duration: FLEET_DURATION }, (finished) => {
        if (finished) runOnJS(onComplete)();
      });
    } else {
      cancelAnimation(progress);
      progress.value = state === "past" ? 1 : 0;
    }
  }, [state]);

  const filledStyle = useAnimatedStyle(() => ({ flex: progress.value }));
  const emptyStyle = useAnimatedStyle(() => ({ flex: 1 - progress.value }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFilled, filledStyle]} />
      <Animated.View style={[styles.progressEmpty, emptyStyle]} />
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

  // Load fleets when viewer opens
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

  // Reset media loaded state on fleet change
  useEffect(() => {
    setIsMediaLoaded(false);
  }, [currentIndex]);

  // Mark current fleet as viewed
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

  const getProgressBarState = (index: number): ProgressBarState => {
    if (index < currentIndex) return "past";
    if (index === currentIndex) return "current";
    return "future";
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Progress bars */}
        {!isLoading && fleets.length > 0 && (
          <View
            style={[
              styles.progressContainer,
              { paddingTop: insets.top + 8 },
            ]}
          >
            {fleets.map((_, i) => (
              <ProgressBar
                key={i}
                state={getProgressBarState(i)}
                onComplete={goNext}
              />
            ))}
          </View>
        )}

        {/* User header */}
        {!isLoading && currentFleet && (
          <View style={styles.userHeader}>
            <Image
              source={{ uri: iconUrl }}
              style={styles.avatar}
              contentFit="cover"
            />
            <Text style={styles.displayName} numberOfLines={1}>
              {currentFleet.user.displayName || currentFleet.user.screenName}
            </Text>
          </View>
        )}

        {/* Fleet content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="white" size="large" />
          </View>
        ) : contentData ? (
          <View style={styles.contentContainer}>
            <FleetContent
              fleet={contentData}
              onMediaLoad={currentFleet?.media ? handleMediaLoad : undefined}
            />
            {/* Media loading overlay */}
            {currentFleet?.media && !isMediaLoaded && (
              <View style={styles.mediaLoadingOverlay}>
                <ActivityIndicator color="white" size="large" />
              </View>
            )}
          </View>
        ) : null}

        {/* Tap areas: left = prev, right = next */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <View style={styles.tapRow} pointerEvents="box-none">
            <Pressable style={styles.tapArea} onPress={goPrev} />
            <Pressable style={styles.tapArea} onPress={goNext} />
          </View>
        </View>

        {/* Close button */}
        <Pressable
          onPress={onClose}
          style={[styles.closeButton, { top: insets.top + 48 }]}
          hitSlop={16}
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  progressContainer: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 12,
    paddingBottom: 8,
    zIndex: 10,
  },
  progressTrack: {
    flex: 1,
    height: 2.5,
    flexDirection: "row",
    borderRadius: 1.25,
    overflow: "hidden",
  },
  progressFilled: {
    backgroundColor: "white",
  },
  progressEmpty: {
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
    zIndex: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  displayName: {
    color: "white",
    marginLeft: 8,
    fontWeight: "600",
    fontSize: 14,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
  },
  mediaLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  tapRow: {
    flex: 1,
    flexDirection: "row",
  },
  tapArea: {
    flex: 1,
  },
  closeButton: {
    position: "absolute",
    right: 16,
    zIndex: 20,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});
