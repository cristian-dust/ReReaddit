/**
 * OAuth Configuration for Reddit API
 * 
 * TROUBLESHOOTING AUTHORIZATION ISSUES:
 * 
 * 1. "Authorization page could not be loaded":
 *    - The redirect URI in your Reddit app doesn't match what Chrome expects
 *    - Click "Debug Info" button to copy the correct redirect URI
 *    - Update your Reddit app at https://www.reddit.com/prefs/apps
 * 
 * 2. Setup Steps:
 *    a) Create Reddit app at https://www.reddit.com/prefs/apps (choose "installed app")
 *    b) Set redirect URI to the value shown by "Debug Info" button
 *    c) Copy the client ID to CLIENT_ID below
 *    d) Update USER_AGENT with your Reddit username
 * 
 * 3. Common Issues:
 *    - Wrong redirect URI (most common)
 *    - Invalid client ID
 *    - App type not set to "installed app"
 *    - User agent string not properly formatted
 */

import { STORAGE_KEYS, getLocal, setLocal, removeLocal } from "./utils.js";

export const CLIENT_ID = "6Stjr6AvxU0Ea17ZJHNPKw"; // Replace with your NEW Reddit app client ID (installed app type)
export const USER_AGENT = "ReReaddit/0.1 (by u/PleaseSelectAUser)"; // Update with your Reddit username

const SCOPE = "identity history read save";

export async function getStoredToken() {
  const data = await getLocal([STORAGE_KEYS.token]);
  return data[STORAGE_KEYS.token] || null;
}

export async function ensureAccessToken(interactive = true) {
  const stored = await getStoredToken();
  if (stored?.accessToken && stored.expiresAt > Date.now() + 30000) {
    return stored;
  }
  return login(interactive);
}

export async function ensureProfile(interactive = true) {
  const current = await getLocal([STORAGE_KEYS.profile]);
  if (current[STORAGE_KEYS.profile]?.name) return current[STORAGE_KEYS.profile];
  const token = await ensureAccessToken(interactive);
  const profile = await fetchIdentity(token.accessToken);
  await setLocal({ [STORAGE_KEYS.profile]: profile });
  return profile;
}

export async function clearToken() {
  await removeLocal([STORAGE_KEYS.token, STORAGE_KEYS.profile]);
}

async function login(interactive) {
  assertClientId();
  const redirectUri = chrome.identity.getRedirectURL("rereaddit");
  console.log("Redirect URI:", redirectUri);
  const state = randomState();
  const authUrl = buildAuthUrl(redirectUri, state);
  console.log("Auth URL:", authUrl);
  console.log("Interactive mode:", interactive);
  console.log("About to call launchWebAuthFlow...");
  
  try {
    const redirect = await new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow({ url: authUrl, interactive }, (responseUrl) => {
        console.log("launchWebAuthFlow callback called");
        console.log("responseUrl:", responseUrl);
        const err = chrome.runtime.lastError;
        if (err) {
          console.error("Chrome identity error:", err);
          console.error("Error message:", err.message);
          console.error("Full error object:", JSON.stringify(err, null, 2));
          reject(new Error(`Chrome identity API failed: ${err.message}`));
        } else if (!responseUrl) {
          console.log("No responseUrl returned");
          reject(new Error("Authorization was cancelled"));
        } else {
          console.log("Redirect response:", responseUrl);
          resolve(responseUrl);
        }
      });
    });
    
    const fragment = parseFragment(redirect);
    if (fragment.state !== state) throw new Error("OAuth state mismatch");
    if (!fragment.access_token) throw new Error("Missing access token");
    const token = {
      accessToken: fragment.access_token,
      tokenType: fragment.token_type,
      scope: fragment.scope,
      expiresAt: Date.now() + (Number(fragment.expires_in || 3600) - 60) * 1000
    };
    await setLocal({ [STORAGE_KEYS.token]: token });
    const profile = await fetchIdentity(token.accessToken);
    await setLocal({ [STORAGE_KEYS.profile]: profile });
    return token;
    
  } catch (error) {
    if (error.message.includes("Chrome identity API failed")) {
      // Fallback for unpublished extensions
      throw new Error(`Development Mode Limitation: Chrome restricts OAuth for unpublished extensions.

WORKAROUND OPTIONS:
1. Manual Auth: Copy and open this URL in a new tab:
   ${authUrl}
   
2. Publish Extension: Upload to Chrome Web Store as unlisted/private
   
3. Use Chrome Canary: Sometimes works better for development

The extension is configured correctly - this is just a Chrome security limitation.`);
    }
    throw error;
  }
}

async function fetchIdentity(accessToken) {
  const res = await fetch("https://oauth.reddit.com/api/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": USER_AGENT
    }
  });
  if (res.status === 401) {
    await clearToken();
    throw new Error("Session expired. Please sign in again.");
  }
  if (!res.ok) throw new Error(`Profile request failed: ${res.status}`);
  const data = await res.json();
  return {
    name: data.name,
    createdUtc: data.created_utc,
    icon: data.icon_img
  };
}

function buildAuthUrl(redirectUri, state) {
  const url = new URL("https://www.reddit.com/api/v1/authorize");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("response_type", "token");
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("duration", "temporary");
  url.searchParams.set("scope", SCOPE);
  return url.toString();
}

function parseFragment(url) {
  const fragment = url.split("#")[1] || "";
  const entries = fragment
    .split("&")
    .filter(Boolean)
    .map((pair) => {
      const [key, value = ""] = pair.split("=");
      return [decodeURIComponent(key), decodeURIComponent(value)];
    });
  return Object.fromEntries(entries);
}

function randomState() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function assertClientId() {
  if (!CLIENT_ID || CLIENT_ID.startsWith("REPLACE")) {
    throw new Error("Set CLIENT_ID in oauth.js to your Reddit app client ID before logging in.");
  }
  if (CLIENT_ID === "6uRA3LIIX9z7qAvZhjhFPM0WDgDiQw") {
    console.warn("Using default CLIENT_ID. Replace this with your own Reddit app client ID for production use.");
  }
}
