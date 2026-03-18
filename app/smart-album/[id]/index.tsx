import { AlbumDetailPage } from "@/components/album/detail-page";
import { useLocalSearchParams } from "expo-router";

export default function SmartAlbumPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AlbumDetailPage id={id} albumType="smartAlbum" />;
}
