import { API_KEY } from "@/constants/apikey";
import { CatalystTS } from "@natsuneko-laboratory/catalyst-sdk";
import * as SecureStore from "expo-secure-store";

export type Credential = {
  accessToken: string;
  refreshToken: string;
  client: CatalystTS;
};

export const EMPTY_CREDENTIAL = {
  accessToken: "",
  refreshToken: "",
  client: new CatalystTS({
    clientId: API_KEY.clientId,
    clientSecret: API_KEY.clientSecret,
    accessToken: "",
    refreshToken: "",
  }),
} satisfies Credential;

const KEYCHAIN_KEY_ACCESS_TOKEN = "access_token";
const KEYCHAIN_KEY_REFRESH_TOKEN = "refresh_token";

export const getCredential = async (): Promise<Credential> => {
  const accessToken = await SecureStore.getItemAsync(KEYCHAIN_KEY_ACCESS_TOKEN);
  const refreshToken = await SecureStore.getItemAsync(
    KEYCHAIN_KEY_REFRESH_TOKEN,
  );

  if (accessToken && refreshToken) {
    const client = new CatalystTS({
      accessToken,
      refreshToken,
      clientId: API_KEY.clientId,
      clientSecret: API_KEY.clientSecret,
    });

    return {
      client,
      accessToken,
      refreshToken,
    };
  }

  return EMPTY_CREDENTIAL;
};

export const saveCredential = async (
  credential: Omit<Credential, "client">,
): Promise<void> => {
  await SecureStore.setItemAsync(
    KEYCHAIN_KEY_ACCESS_TOKEN,
    credential.accessToken,
  );
  await SecureStore.setItemAsync(
    KEYCHAIN_KEY_REFRESH_TOKEN,
    credential.refreshToken,
  );
};

export const clear = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(KEYCHAIN_KEY_ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(KEYCHAIN_KEY_REFRESH_TOKEN);
};
