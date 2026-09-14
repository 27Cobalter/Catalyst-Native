// Standalone native styles: consumers do not need a Tailwind/Uniwind pipeline.
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  fill: { flex: 1 },
  absolute: { ...StyleSheet.absoluteFill },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  viewport: { flex: 1, overflow: "hidden" },
  gallery: { width: "100%", aspectRatio: 1 },
  page: { position: "absolute", top: 0, alignItems: "center", justifyContent: "center" },
  black: { ...StyleSheet.absoluteFill, backgroundColor: "#000" },
  indicator: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#0008",
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff", opacity: 0.4 },
  indicatorBelow: { position: "relative", bottom: undefined, marginTop: 8, marginBottom: 8 },
  white: { color: "#fff" },
  close: {
    width: 44,
    height: 44,
    margin: 8,
    alignSelf: "flex-end",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0008",
    borderRadius: 22,
  },
  closeIcon: { color: "#fff", fontSize: 28, lineHeight: 32 },
  chrome: { ...StyleSheet.absoluteFill, justifyContent: "space-between" },
});
