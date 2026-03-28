import { useCallback, useState } from "react";
import { LayoutChangeEvent } from "react-native";

type ContainerSize = {
  width: number;
  height: number;
};

const INITIAL_SIZE: ContainerSize = {
  width: 0,
  height: 0,
};

export const useContainerUnits = () => {
  const [containerSize, setContainerSize] = useState<ContainerSize>(INITIAL_SIZE);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    setContainerSize((current) => {
      if (current.width === width && current.height === height) {
        return current;
      }

      return { width, height };
    });
  }, []);

  const cqw = useCallback((value: number) => {
    return (containerSize.width * value) / 100;
  }, [containerSize.width]);

  const cqh = useCallback((value: number) => {
    return (containerSize.height * value) / 100;
  }, [containerSize.height]);

  const cqmin = useCallback((value: number) => {
    return (Math.min(containerSize.width, containerSize.height) * value) / 100;
  }, [containerSize.height, containerSize.width]);

  const cqmax = useCallback((value: number) => {
    return (Math.max(containerSize.width, containerSize.height) * value) / 100;
  }, [containerSize.height, containerSize.width]);

  return {
    containerHeight: containerSize.height,
    containerWidth: containerSize.width,
    cqh,
    cqmax,
    cqmin,
    cqw,
    onLayout,
  };
};
