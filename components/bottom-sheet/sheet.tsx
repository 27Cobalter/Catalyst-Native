import { BottomSheetBackdrop, BottomSheetView, BottomSheetModal as OrigBottomSheetModal } from "@gorhom/bottom-sheet";
import { useImperativeHandle, useRef } from "react";
import { useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  ref: React.Ref<BottomSheetModalHandle>;
  children: React.ReactNode;
};

export interface BottomSheetModalHandle {
  present: () => void;
  dismiss: () => void;
}

export const BottomSheetModal = ({ ref, children }: Props) => {
  const bottomSheetRef = useRef<OrigBottomSheetModal>(null);
  const theme = useColorScheme() ?? "light";
  const insets = useSafeAreaInsets();

  useImperativeHandle(ref, () => {
    return {
      present: () => bottomSheetRef.current?.present(),
      dismiss: () => bottomSheetRef.current?.dismiss(),
    };
  });

  return (
    <OrigBottomSheetModal
      ref={bottomSheetRef}
      enableDynamicSizing
      enableDismissOnClose
      enablePanDownToClose
      backdropComponent={(props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}
      backgroundStyle={{ backgroundColor: theme === "light" ? "#fff" : "#1c1c1e" }}
      handleIndicatorStyle={{ backgroundColor: theme === "light" ? "#48484A" : "#c7c7cc" }}
    >
      <BottomSheetView style={{ paddingBottom: insets.bottom, rowGap: 2 }}>{children}</BottomSheetView>
    </OrigBottomSheetModal>
  );
};
