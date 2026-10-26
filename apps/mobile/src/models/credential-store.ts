import { API_KEY } from "@/constants/apikey";
import { Catalyst } from "@natsuneko-laboratory/catalyst-sdk";
import * as SecureStore from "expo-secure-store";
import { getDefaultStore } from "jotai";
import { accountAtom } from "@/models/atoms/account";

export type Credential = {
  accessToken: string;
  refreshToken: string;
  client: Catalyst;
};

export const EMPTY_CREDENTIAL = {
  accessToken: "",
  refreshToken: "",
  client: new Catalyst({
    clientId: API_KEY.clientId ?? "",
    clientSecret: API_KEY.clientSecret ?? "",
    accessToken: "",
    refreshToken: "",
  }),
} satisfies Credential;

const KEYCHAIN_KEY_ACCESS_TOKEN = "access_token";
const KEYCHAIN_KEY_REFRESH_TOKEN = "refresh_token";

export const getCredential = async (): Promise<Credential> => {
  const accessToken = await SecureStore.getItemAsync(KEYCHAIN_KEY_ACCESS_TOKEN);
  const refreshToken = await SecureStore.getItemAsync(KEYCHAIN_KEY_REFRESH_TOKEN);

  if (accessToken && refreshToken) {
    // Catalyst は 401 を検知すると内部で自動的にトークンをリフレッシュして
    // リクエストをリトライする。ここでは、リフレッシュ後のトークンを
    // SecureStore と accountAtom に反映するだけでよい。
    const client = new Catalyst({
      accessToken,
      refreshToken,
      clientId: API_KEY.clientId ?? "",
      clientSecret: API_KEY.clientSecret ?? "",
      onTokenRefreshed: async (token) => {
        await saveCredential({ accessToken: token.accessToken, refreshToken: token.refreshToken });

        const store = getDefaultStore();
        const account = store.get(accountAtom);
        if (account) {
          store.set(accountAtom, {
            ...account,
            credential: {
              ...account.credential,
              accessToken: token.accessToken,
              refreshToken: token.refreshToken,
            },
          });
        }
      },
    });

    return {
      client,
      accessToken,
      refreshToken,
    };
  }

  return EMPTY_CREDENTIAL;
};

export const saveCredential = async (credential: Omit<Credential, "client">): Promise<void> => {
  await SecureStore.setItemAsync(KEYCHAIN_KEY_ACCESS_TOKEN, credential.accessToken);
  await SecureStore.setItemAsync(KEYCHAIN_KEY_REFRESH_TOKEN, credential.refreshToken);
};

export const clear = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(KEYCHAIN_KEY_ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(KEYCHAIN_KEY_REFRESH_TOKEN);
};
