import { View } from "react-native";
import { Divider, Skeleton } from "./ui";

type Props = {
  media?: boolean;
};

// タイムライン読み込み中に表示する投稿の骨組み
export const StatusSkeleton = ({ media = false }: Props) => {
  return (
    <View>
      <View className="flex-row gap-3 px-5 py-4">
        <Skeleton className="size-10 rounded-full" />
        <View className="flex-1 gap-2">
          <View className="flex-row items-center gap-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-16" />
          </View>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          {media && <Skeleton className="mt-1 aspect-video w-full rounded-2xl" />}
          <View className="mt-1 flex-row gap-8">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-8" />
          </View>
        </View>
      </View>
      <Divider />
    </View>
  );
};

export const TimelineSkeleton = ({ count = 6 }: { count?: number }) => {
  return (
    <View>
      {Array.from({ length: count }, (_, index) => (
        <StatusSkeleton key={index} media={index % 3 === 1} />
      ))}
    </View>
  );
};
