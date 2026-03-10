import { selectAtom } from "jotai/utils";
import { accountAtom } from "./account";

export const credentialAtom = selectAtom(accountAtom, (w) => w?.credential);
export const clientAtom = selectAtom(accountAtom, (w) => w?.credential?.client);
