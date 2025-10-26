import Fuse from "./fuse.esm.js";
import { formatDateTime } from "./utils.js";

const refs = {
  login: document.getElementById("login-btn"),
  fetch: document.getElementById("fetch-btn"),
  exportJson: document.getElementById("export-json"),
  exportCsv: document.getElementById("export-csv"),
  search: document.getElementById("search-input"),
  filter: document.getElementById("subreddit-filter"),
  count: document.getElementById("count-label"),
  syncLabel: document.getElementById("sync-label"),
  profileName: document.getElementById("profile-name"),
  profileStatus: document.getElementById("profile-status"),
  results: document.getElementById("results"),
  template: document.getElementById("result-template"),
  progress: document.getElementById("progress"),
  actions: document.querySelector(".actions.secondary")
};

const state = {
  saves: [],
  results: [],
  meta: {},
  profile: null,
  fuse: null,
  busy: false
};

const debouncedSearch = debounce(runSearch, 150);

init();

function init() {
  wireEvents();
  refreshState();
}

function wireEvents() {
  refs.login.addEventListener("click", onLogin);
  refs.fetch.addEventListener("click", onFetch);
  refs.exportJson.addEventListener("click", () => handleExport("json"));
  refs.exportCsv.addEventListener("click", () => handleExport("csv"));
  refs.search.addEventListener("input", debouncedSearch);
  refs.filter.addEventListener("change", runSearch);
  refs.results.addEventListener("click", onResultsClick);
  chrome.runtime.onMessage.addListener(onRuntimeMessage);
}

async function refreshState() {
  try {
    const response = await sendMessage({ type: "state.get" });
    if (!response?.ok) throw new Error(response?.error || "Unable to load state");
    state.saves = response.saves || [];
    state.meta = response.meta || {};
    state.profile = response.profile || null;
    buildFuse();
    populateFilter();
    runSearch();
    updateHeader();
  } catch (error) {
    setProgress(error.message, true);
  }
}

async function onLogin() {
  setBusy(true);
  try {
    const response = await sendMessage({ type: "oauth.login" });
    if (!response?.ok) throw new Error(response?.error || "Login failed");
    state.profile = response.profile || null;
    updateHeader();
    refs.fetch.disabled = false;
    setProgress("Signed in — fetch your saves when ready");
  } catch (error) {
    setProgress(error.message, true);
  } finally {
    setBusy(false);
  }
}

async function onFetch() {
  setBusy(true);
  setProgress("Syncing saved posts…");
  try {
    const response = await sendMessage({ type: "saves.fetch", interactive: true, resume: false });
    if (!response?.ok) throw new Error(response?.error || "Fetch failed");
    state.meta = response.meta || {};
    state.profile = response.profile || state.profile;
    await refreshState();
    setProgress("Sync complete");
  } catch (error) {
    setProgress(error.message, true);
  } finally {
    setBusy(false);
  }
}

async function handleExport(kind) {
  try {
    const ids = state.results.map((item) => item.id || item.name);
    const response = await sendMessage({ type: `export.${kind}`, ids });
    if (!response?.ok) throw new Error(response?.error || "Export failed");
    setProgress(`${kind.toUpperCase()} export started`);
  } catch (error) {
    setProgress(error.message, true);
  }
}

function onResultsClick(event) {
  const unsaveBtn = event.target.closest(".unsave-btn");
  if (unsaveBtn) {
    const name = unsaveBtn.dataset.name;
    unsave(name);
    return;
  }
  const openBtn = event.target.closest(".open-btn");
  if (openBtn) {
    const url = openBtn.dataset.url;
    if (url) chrome.tabs.create({ url });
  }
}

async function unsave(name) {
  if (!name) return;
  setProgress("Unsaving…");
  try {
    const response = await sendMessage({ type: "saves.unsave", name });
    if (!response?.ok) throw new Error(response?.error || "Unsave failed");
    await refreshState();
    setProgress("Item removed");
  } catch (error) {
    setProgress(error.message, true);
  }
}

function runSearch() {
  const term = refs.search.value.trim();
  const filter = refs.filter.value;
  let candidates = state.saves;
  if (filter) candidates = candidates.filter((item) => item.subreddit === filter);
  if (term && state.fuse) {
    const hits = state.fuse.search(term, { limit: 200 }).map((entry) => entry.item);
    state.results = hits.filter((item) => !filter || item.subreddit === filter);
  } else {
    state.results = candidates.slice(0, 200);
  }
  render();
}

function render() {
  refs.results.textContent = "";
  const fragment = document.createDocumentFragment();
  state.results.forEach((item) => {
    const node = refs.template.content.firstElementChild.cloneNode(true);
    const title = node.querySelector(".title");
    const meta = node.querySelector(".meta");
    const thumb = node.querySelector(".thumb");
    const open = node.querySelector(".open-btn");
    const unsaveBtn = node.querySelector(".unsave-btn");

    title.textContent = item.title;
    title.href = item.permalink || item.url;

    const details = [];
    if (item.subreddit) details.push(`r/${item.subreddit}`);
    if (item.author) details.push(`u/${item.author}`);
    if (item.createdUtc) details.push(new Date(item.createdUtc).toLocaleDateString());
    meta.textContent = details.join(" • ");

    if (item.thumbnail) {
      thumb.style.backgroundImage = `url(${item.thumbnail})`;
      thumb.hidden = false;
    }

    open.dataset.url = item.url || item.permalink;
    unsaveBtn.dataset.name = item.name;

    fragment.appendChild(node);
  });
  refs.results.appendChild(fragment);

  refs.count.textContent = `${state.results.length} shown · ${state.saves.length} total`;
  refs.syncLabel.textContent = `Last sync: ${formatDateTime(state.meta.lastSync)}`;

  const hasData = state.saves.length > 0;
  refs.exportJson.disabled = !hasData;
  refs.exportCsv.disabled = !hasData;
}

function buildFuse() {
  if (!state.saves.length) {
    state.fuse = null;
    return;
  }
  state.fuse = new Fuse(state.saves, {
    keys: [
      { name: "title", weight: 0.5 },
      { name: "selftext", weight: 0.2 },
      { name: "subreddit", weight: 0.1 },
      { name: "tags", weight: 0.1 },
      { name: "author", weight: 0.1 }
    ],
    includeScore: false,
    threshold: 0.35,
    ignoreLocation: true
  });
}

function populateFilter() {
  const current = refs.filter.value;
  const subs = Array.from(new Set(state.saves.map((item) => item.subreddit).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
  refs.filter.innerHTML = '<option value="">All subreddits</option>';
  subs.forEach((sub) => {
    const option = document.createElement("option");
    option.value = sub;
    option.textContent = `r/${sub}`;
    if (sub === current) option.selected = true;
    refs.filter.appendChild(option);
  });
}

function updateHeader() {
  if (state.profile?.name) {
    refs.profileName.textContent = `Signed in as u/${state.profile.name}`;
    refs.profileStatus.textContent = "Online";
    refs.profileStatus.classList.remove("offline");
    refs.profileStatus.classList.add("online");
    refs.fetch.disabled = false;
  } else {
    refs.profileName.textContent = "Not signed in";
    refs.profileStatus.textContent = state.saves.length ? "Offline" : "Sign in";
    refs.profileStatus.classList.add("offline");
    refs.profileStatus.classList.remove("online");
    refs.fetch.disabled = true;
  }
}

function onRuntimeMessage(message) {
  if (message?.type === "syncProgress") {
    const { page, batch, total } = message;
    setProgress(`Fetched ${total} saves (page ${page}, +${batch})`);
  }
  if (message?.type === "syncComplete") {
    setProgress(`Sync complete — ${message.total} saves cached`);
    refreshState();
  }
  if (message?.type === "unsaveComplete") {
    refreshState();
  }
}

function setProgress(text, isError = false) {
  refs.progress.hidden = false;
  refs.progress.textContent = text;
  refs.progress.style.color = isError ? "#dc2626" : "#6b7280";
}

function setBusy(value) {
  state.busy = value;
  refs.fetch.disabled = value || !state.profile?.name;
  refs.login.disabled = value;
  refs.exportJson.disabled = value || !state.saves.length;
  refs.exportCsv.disabled = value || !state.saves.length;
}

function debounce(fn, delay) {
  let handle;
  return (...args) => {
    clearTimeout(handle);
    handle = setTimeout(() => fn.apply(null, args), delay);
  };
}

function sendMessage(payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(payload, (response) => {
      const err = chrome.runtime.lastError;
      if (err) resolve({ ok: false, error: err.message });
      else resolve(response);
    });
  });
}
