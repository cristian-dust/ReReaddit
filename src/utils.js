export const STORAGE_KEYS = {
  token: "rso:token",
  profile: "rso:profile",
  saves: "rso:saves",
  meta: "rso:meta"
};

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function safeFilename(prefix, ext) {
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").split(".")[0];
  return `${prefix}-${stamp}.${ext}`;
}

export async function getLocal(keys) {
  const query = Array.isArray(keys) ? keys : [keys];
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(query, (items) => {
      const err = chrome.runtime.lastError;
      if (err) reject(err);
      else resolve(items);
    });
  });
}

export async function setLocal(entries) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(entries, () => {
      const err = chrome.runtime.lastError;
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function removeLocal(keys) {
  const toRemove = Array.isArray(keys) ? keys : [keys];
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(toRemove, () => {
      const err = chrome.runtime.lastError;
      if (err) reject(err);
      else resolve();
    });
  });
}

export function normalizeThing(child) {
  const kind = child?.kind;
  const data = child?.data || {};
  const permalink = data.permalink ? `https://www.reddit.com${data.permalink}` : data.link_permalink;
  const url = data.url || permalink || data.media_url;
  return {
    id: data.id,
    name: data.name,
    kind,
    title: data.title || data.link_title || "(untitled)",
    selftext: data.selftext || data.body || "",
    subreddit: data.subreddit || (data.subreddit_name_prefixed || "r/").replace(/^r\//, ""),
    author: data.author,
    createdUtc: data.created_utc ? data.created_utc * 1000 : null,
    permalink: permalink || url,
    url: url || permalink,
    thumbnail: pickThumbnail(data),
    tags: []
  };
}

function pickThumbnail(data) {
  if (data.thumbnail && data.thumbnail.startsWith("http")) return data.thumbnail;
  const preview = data.preview?.images?.[0]?.source?.url;
  return preview ? preview.replace(/&amp;/g, "&") : null;
}

export function mergeSaves(existing, incoming) {
  const map = new Map(existing.map((item) => [item.name, item]));
  incoming.forEach((item) => {
    map.set(item.name, { ...map.get(item.name), ...item });
  });
  return Array.from(map.values()).sort((a, b) => (b.createdUtc || 0) - (a.createdUtc || 0));
}

export function formatDateTime(timestamp) {
  if (!timestamp) return "Never";
  return new Date(timestamp).toLocaleString();
}

export async function exportAsJSON(items, filename = safeFilename("rereaddit-saves", "json")) {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
  await downloadBlob(blob, filename);
}

export async function exportAsCSV(items, filename = safeFilename("rereaddit-saves", "csv")) {
  const header = ["title", "subreddit", "author", "created", "url", "permalink", "kind"];
  const rows = items.map((item) => [
    csvEscape(item.title),
    csvEscape(item.subreddit ? `r/${item.subreddit}` : ""),
    csvEscape(item.author ? `u/${item.author}` : ""),
    csvEscape(item.createdUtc ? new Date(item.createdUtc).toISOString() : ""),
    csvEscape(item.url),
    csvEscape(item.permalink),
    csvEscape(item.kind)
  ]);
  const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv" });
  await downloadBlob(blob, filename);
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const str = String(value).replace(/\r?\n|\r/g, " ");
  if (/[",]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  try {
    await new Promise((resolve, reject) => {
      chrome.downloads.download({ url, filename, saveAs: true }, (downloadId) => {
        const err = chrome.runtime.lastError;
        if (err) reject(err);
        else resolve(downloadId);
      });
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}
