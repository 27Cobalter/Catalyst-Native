import { EgeriaUser } from "@natsuneko-laboratory/catalyst-sdk";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useCallback } from "react";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const UniAnimatedView = withUniwind(Animated.View);
const UniArrowLeft = withUniwind(ArrowLeft);

type Props = {
  user: EgeriaUser | null;
  scrollY: Animated.Value;
  showBackButton?: boolean;
};

export const ProfileOverlay = ({ user, scrollY, showBackButton = true }: Props) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const overlayHeight = insets.top + 44;
  const overlayOpacity = scrollY.interpolate({
    inputRange: [0, 32],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const handleBack = useCallback(() => router.back(), [router]);

  return (
    <View
      className="absolute left-0 right-0 top-0 flex-row w-full"
      style={{ height: overlayHeight, paddingTop: insets.top }}
    >
      <UniAnimatedView
        className="bg-light-background dark:bg-dark-background"
        style={[StyleSheet.absoluteFill, { opacity: overlayOpacity }]}
      />
      <View className="relative flex-row flex-1 items-center">
        <Animated.Text
          className="flex-1 text-base font-semibold text-center text-light-text dark:text-dark-text"
          style={{ opacity: overlayOpacity }}
          numberOfLines={1}
        >
          {user?.displayName}
        </Animated.Text>

        {showBackButton && (
          <TouchableOpacity className="absolute p-2 m-2" onPress={handleBack}>
            <View className="w-9 h-9 rounded-full bg-black/75 items-center justify-center">
              <UniArrowLeft size={18} className="text-white" />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
