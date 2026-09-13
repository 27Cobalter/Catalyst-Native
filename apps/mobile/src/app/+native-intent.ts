import { getAppPathFromUrl } from "@/lib/app-links";

export const redirectSystemPath = ({ path }: { path: string; initial: boolean }): string => getAppPathFromUrl(path);
