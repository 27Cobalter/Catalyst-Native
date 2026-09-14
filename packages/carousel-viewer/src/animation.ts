import { ReduceMotion, useReducedMotion } from "react-native-reanimated";

export const spring = { damping: 28, stiffness: 280, mass: 1, reduceMotion: ReduceMotion.System };

export function useMotion(override?: boolean) {
  const system = useReducedMotion();
  const reduced = override ?? system;
  return {
    reduced,
    spring:
      override === undefined ? spring : { ...spring, reduceMotion: reduced ? ReduceMotion.Always : ReduceMotion.Never },
  };
}
