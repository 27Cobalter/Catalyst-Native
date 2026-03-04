import { API_KEY } from "@/constants/apikey";
import * as CredentialStore from "@/models/credential-store";
import type { EgeriaUser } from "@/natsuneko-laboratory/catalyst-sdk/packages/nodejs/dist";
import { PKCE } from "@/natsuneko-laboratory/catalyst-sdk/packages/nodejs/dist";
import * as WebBrowser from "expo-web-browser";
import { v4 } from "uuid";

let _currentUser: EgeriaUser | undefined = undefined;

export const init = async (): Promise<{
  credential: CredentialStore.Credential;
  isLoggedIn: boolean;
}> => {
  const credential = await CredentialStore.getCredential();

  if (credential.accessToken && credential.refreshToken) {
    try {
      const me = await credential.client.egeria.me();

      if (me?.user) {
        _currentUser = me.user;
        return { credential, isLoggedIn: true };
      }
    } catch {
      const newTokens = await credential.client.refresh();
      const me = await credential.client.egeria.me();

      if (me?.user) {
        _currentUser = me.user;
        await CredentialStore.saveCredential({
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
        });

        return {
          credential: { ...credential, accessToken: newTokens.accessToken, refreshToken: newTokens.refreshToken },
          isLoggedIn: true,
        };
      }
    }
  }

  await logout();

  const pcke = await PKCE.create();
  const state = v4();
  const redirect = credential.client.oauth.getAuthorizeURL(API_KEY.redirectUri, pcke, state);
  const result = await WebBrowser.openAuthSessionAsync(redirect.toString(), API_KEY.redirectUri);

  if (result.type === "success" && result.url) {
    const url = new URL(result.url);
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");

    if (code && returnedState === state) {
      const token = await credential.client.oauth.getAccessTokenByCode(code, API_KEY.redirectUri, pcke);
      await CredentialStore.saveCredential({ ...token });

      const me = await credential.client.egeria.me();
      if (me?.user) {
        _currentUser = me.user;
        return {
          credential: { ...credential, accessToken: token.accessToken, refreshToken: token.refreshToken },
          isLoggedIn: true,
        };
      }
    }
  }

  return { credential: CredentialStore.EMPTY_CREDENTIAL, isLoggedIn: false };
};

export const logout = async (): Promise<void> => {
  await CredentialStore.clear();
  _currentUser = undefined;
};

export const currentUser = () => {
  return _currentUser;
};
