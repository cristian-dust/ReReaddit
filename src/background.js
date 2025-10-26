import {
  STORAGE_KEYS,
  getLocal,
  setLocal,
  mergeSaves,
  normalizeThing,
  sleep,
  exportAsJSON,
  exportAsCSV
} from "./utils.js";
import { ensureAccessToken, ensureProfile, clearToken, USER_AGENT } from "./oauth.js";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then((value) => sendResponse({ ok: true, ...value }))
    .catch((error) => {
      console.error(error);
      sendResponse({ ok: false, error: error.message || String(error) });
    });
  return true;
});

async function handleMessage(message) {
  switch (message?.type) {
    case "oauth.login":
      return await login(message?.interactive !== false);
    case "oauth.logout":
      await clearToken();
      return {};
    case "oauth.getRedirectUri":
      return { redirectUri: chrome.identity.getRedirectURL("rereaddit") };
    case "oauth.getAuthUrl":
      try {
        const redirectUri = chrome.identity.getRedirectURL("rereaddit");
        const state = crypto.getRandomValues(new Uint8Array(16)).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
        const url = new URL("https://www.reddit.com/api/v1/authorize");
        url.searchParams.set("client_id", "6uRA3LIIX9z7qAvZhjFPMOWDqDlQw");
        url.searchParams.set("response_type", "token");
        url.searchParams.set("state", state);
        url.searchParams.set("redirect_uri", redirectUri);
        url.searchParams.set("duration", "temporary");
        url.searchParams.set("scope", "identity history read save");
        return { authUrl: url.toString() };
      } catch (error) {
        return { authUrl: `Error: ${error.message}` };
      }
    case "state.get":
      return await loadState();
    case "saves.fetch":
      return await fetchSaves({
        interactive: message?.interactive !== false,
        resume: message?.resume === true
      });
    case "export.json":
      await exportData("json", message?.ids);
      return {};
    case "export.csv":
      await exportData("csv", message?.ids);
      return {};
    case "saves.unsave":
      await unsave(message?.name);
      return {};
    case "settings.save":
      await setLocal({ "rereaddit:settings": message.settings });
      return {};
    case "settings.get":
      const settingsData = await getLocal(["rereaddit:settings"]);
      return { settings: settingsData["rereaddit:settings"] || {} };
    default:
      throw new Error("Unknown message type");
  }
}

async function login(interactive) {
  const token = await ensureAccessToken(interactive);
  const profile = await ensureProfile(false);
  return { token, profile };
}

async function loadState() {
  const data = await getLocal([STORAGE_KEYS.saves, STORAGE_KEYS.meta, STORAGE_KEYS.profile]);
  return {
    saves: data[STORAGE_KEYS.saves] || [],
    meta: data[STORAGE_KEYS.meta] || {},
    profile: data[STORAGE_KEYS.profile] || null
  };
}

async function fetchSaves({ interactive, resume }) {
  const token = await ensureAccessToken(interactive);
  const profile = await ensureProfile(false);
  const username = profile?.name;
  if (!username) throw new Error("Unable to determine Reddit username");

  const existing = await getLocal([STORAGE_KEYS.saves, STORAGE_KEYS.meta]);
  let saves = resume ? existing[STORAGE_KEYS.saves] || [] : [];
  let meta = {
    ...(existing[STORAGE_KEYS.meta] || {}),
    syncing: true,
    cursor: resume ? existing[STORAGE_KEYS.meta]?.cursor || null : null
  };

  await setLocal({
    [STORAGE_KEYS.meta]: meta,
    [STORAGE_KEYS.saves]: saves
  });

  let after = meta.cursor || null;
  let retries = 0;
  let page = 0;

  while (true) {
    const url = new URL(`https://oauth.reddit.com/user/${username}/saved`);
    url.searchParams.set("limit", "100");
    if (after) url.searchParams.set("after", after);

    const response = await redditFetch(url.toString(), token.accessToken);

    if (response.status === 429) {
      retries += 1;
      if (retries > 4) throw new Error("Reddit rate-limited the request. Please retry in a moment.");
      await sleep(1200 * retries);
      continue;
    }

    if (response.status === 401) {
      await clearToken();
      throw new Error("Session expired. Sign in again to continue.");
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Fetch failed: ${response.status} ${text}`);
    }

    retries = 0;
    page += 1;

    const payload = await response.json();
    const children = payload?.data?.children || [];
    const normalized = children.map(normalizeThing);
    saves = mergeSaves(saves, normalized);

    after = payload?.data?.after || null;
    meta = {
      lastSync: meta.lastSync || Date.now(),
      syncing: Boolean(after),
      cursor: after,
      total: saves.length,
      pages: page
    };

    await setLocal({
      [STORAGE_KEYS.saves]: saves,
      [STORAGE_KEYS.meta]: meta
    });

    broadcast({
      type: "syncProgress",
      page,
      batch: normalized.length,
      total: saves.length,
      cursor: after
    });

    if (!after) break;
    await sleep(400);
  }

  meta = {
    ...meta,
    cursor: null,
    syncing: false,
    lastSync: Date.now(),
    total: saves.length
  };

  await setLocal({
    [STORAGE_KEYS.meta]: meta,
    [STORAGE_KEYS.saves]: saves
  });

  broadcast({ type: "syncComplete", total: saves.length });

  return { meta, profile };
}

async function exportData(kind, ids) {
  const data = await getLocal([STORAGE_KEYS.saves]);
  let items = data[STORAGE_KEYS.saves] || [];
  if (Array.isArray(ids) && ids.length) {
    const lookup = new Set(ids);
    items = items.filter((item) => lookup.has(item.id) || lookup.has(item.name));
  }
  if (!items.length) throw new Error("Nothing to export yet. Run Fetch Saves first.");
  if (kind === "json") {
    await exportAsJSON(items);
  } else if (kind === "csv") {
    await exportAsCSV(items);
  } else {
    throw new Error("Unsupported export format");
  }
}

async function unsave(name) {
  if (!name) throw new Error("Missing Reddit thing name");
  const token = await ensureAccessToken(true);
  const body = new URLSearchParams({ id: name });
  const response = await redditFetch("https://oauth.reddit.com/api/unsave", token.accessToken, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Unsave failed: ${response.status} ${text}`);
  }
  const data = await getLocal([STORAGE_KEYS.saves, STORAGE_KEYS.meta]);
  const current = (data[STORAGE_KEYS.saves] || []).filter((item) => item.name !== name);
  const meta = {
    ...(data[STORAGE_KEYS.meta] || {}),
    total: current.length,
    lastSync: Date.now()
  };
  await setLocal({
    [STORAGE_KEYS.saves]: current,
    [STORAGE_KEYS.meta]: meta
  });
  broadcast({ type: "unsaveComplete", name });
}

async function redditFetch(url, token, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("User-Agent", USER_AGENT);
  return fetch(url, { ...options, headers });
}

function broadcast(message) {
  chrome.runtime.sendMessage(message, () => chrome.runtime.lastError);
}
