export async function speckleFetch(query, state) {
  const token = state.state.token.token;
  if (token) {
    try {
      const url = state.state.selectedServer.url;
      const res = await fetch(`${url}/graphql`, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        // body: `{ query: ${query} }`
        body: JSON.stringify({
          query: query,
        }),
      });
      return await res.json();
    } catch (err) {
      console.error("API cal failed", err);
    }
  } else return Promise.reject("NOT_SIGNED_IN");
}

const APP_NAME = process.env.VUE_APP_SPECKLE_NAME;
const CHALLENGE = `${APP_NAME}.Challenge`;
const TOKEN = `${APP_NAME}.AuthToken`;
const REFRESH_TOKEN = `${APP_NAME}.RefreshToken`;
const SERVER = `${APP_NAME}.Server`;

export function goToSpeckleAuthPage(server) {
  const challenge =
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
  // Save challenge and server JSON string in localStorage for later use
  localStorage.setItem(CHALLENGE, challenge);
  localStorage.setItem(SERVER, JSON.stringify(server));

  // Send user to auth page
  location.href = `${server.url}/authn/verify/${server.speckleId}/${challenge}`;
}

// Log out the current user. This removes the token/refreshToken pair.
export function speckleLogOut() {
  // Remove both token and refreshToken from localStorage
  localStorage.removeItem(TOKEN)
  localStorage.removeItem(REFRESH_TOKEN)
}

export function getServer() {
  //gets server info stored as a JSON string in local storage
  const server = localStorage.getItem(SERVER);
  const serverJson = JSON.parse(server);
  return serverJson;
}

export async function exchangeAccessCode(accessCode, server) {
  const res = await fetch(`${server.url}/auth/token/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      accessCode: accessCode,
      appId: server.speckleId,
      appSecret: server.speckleSecret,
      challenge: localStorage.getItem(CHALLENGE),
    }),
  });
  const data = await res.json();
  if (data.token) {
    // If retrieving the token was successful, remove challenge and set the new token and refresh token
    localStorage.removeItem(CHALLENGE);
    localStorage.setItem(TOKEN, data.token);
    localStorage.setItem(REFRESH_TOKEN, data.refreshToken);
  }
  return data;
}

export const getToken = () => ({
  token: localStorage.getItem(TOKEN),
  refreshToken: localStorage.getItem(REFRESH_TOKEN),
});

export const getUserData = (state) =>
  speckleFetch(
    `query {
    user {
      name
    },
    serverInfo {
      name
      company
    }
  }`,
    state
  );
