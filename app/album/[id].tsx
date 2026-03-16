import { AlbumDetailPage } from "@/components/album/detail-page";
import { useLocalSearchParams } from "expo-router";

export default function AlbumPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AlbumDetailPage id={id} albumType="album" />;
}
