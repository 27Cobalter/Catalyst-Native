import type { EgeriaUser } from "@/natsuneko-laboratory/catalyst-sdk/packages/nodejs/dist";
import { atom } from "jotai";
import { Credential } from "../credential-store";

type Account = {
  user: EgeriaUser;
  credential: Credential;
};

export const accountAtom = atom<Account | null>(null);
