import { accountAtom } from "@/atoms/account";
import { Catalyst } from "@natsuneko-laboratory/catalyst-sdk";
import { SecureStore } from "@natsuneko-laboratory/react-native-credential-store";
import { getDefaultStore } from "jotai";
import Config from "react-native-config";

export type Credential = {
  accessToken: string;
  refreshToken: string;
  client: Catalyst;
};

export const EMPTY_CREDENTIAL = {
  accessToken: "",
  refreshToken: "",
  client: new Catalyst({
    clientId: Config.CATALYST_CLIENT_ID ?? "",
    clientSecret: Config.CATALYST_CLIENT_SECRET ?? "",
    accessToken: "",
    refreshToken: "",
  }),
} satisfies Credential;

const KEYCHAIN_KEY_ACCESS_TOKEN = "access_token";
const KEYCHAIN_KEY_REFRESH_TOKEN = "refresh_token";

export const getCredential = async (): Promise<Credential> => {
  const accessToken = await SecureStore.getItem(KEYCHAIN_KEY_ACCESS_TOKEN);
  const refreshToken = await SecureStore.getItem(KEYCHAIN_KEY_REFRESH_TOKEN);

  if (accessToken && refreshToken) {
    // Catalyst は 401 を検知すると内部で自動的にトークンをリフレッシュして
    // リクエストをリトライする。ここでは、リフレッシュ後のトークンを
    // SecureStore と accountAtom に反映するだけでよい。
    const client = new Catalyst({
      accessToken,
      refreshToken,
      clientId: Config.CATALYST_CLIENT_ID ?? "",
      clientSecret: Config.CATALYST_CLIENT_SECRET ?? "",
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
  await SecureStore.setItem(KEYCHAIN_KEY_ACCESS_TOKEN, credential.accessToken);
  await SecureStore.setItem(KEYCHAIN_KEY_REFRESH_TOKEN, credential.refreshToken);
};

export const clear = async (): Promise<void> => {
  await SecureStore.removeItem(KEYCHAIN_KEY_ACCESS_TOKEN);
  await SecureStore.removeItem(KEYCHAIN_KEY_REFRESH_TOKEN);
};
