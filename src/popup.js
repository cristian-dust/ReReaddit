import Fuse from "./fuse.esm.js";
import { formatDateTime } from "./utils.js";

const refs = {
  login: document.getElementById("login-btn"),
  fetch: document.getElementById("fetch-btn"),
  exportJson: document.getElementById("export-json"),
  exportCsv: document.getElementById("export-csv"),
  search: document.getElementById("search-input"),
  filter: document.getElementById("subreddit-filter"),
  controls: document.querySelector(".controls"),
  count: document.getElementById("count-label"),
  syncLabel: document.getElementById("sync-label"),
  profileName: document.getElementById("profile-name"),
  profileStatus: document.getElementById("profile-status"),
  results: document.getElementById("results"),
  template: document.getElementById("result-template"),
  progress: document.getElementById("progress"),
  actions: document.querySelector(".actions.secondary"),
  setupGuide: document.getElementById("setup-guide"),
  redirectUriDisplay: document.getElementById("redirect-uri-display"),
  hideGuide: document.getElementById("hide-guide"),
  pagination: document.getElementById("pagination"),
  prevPage: document.getElementById("prev-page"),
  nextPage: document.getElementById("next-page"),
  pageInfo: document.getElementById("page-info"),
  settingsToggle: document.getElementById("settings-toggle"),
  settings: document.getElementById("settings"),
  autoFetchEnabled: document.getElementById("auto-fetch-enabled"),
  autoFetchGroup: document.querySelector(".cadence"),
  donateBtn: document.getElementById("donate-btn")
};
refs.autoFetchRadios = Array.from(document.querySelectorAll("input[name='auto-fetch']"));

const state = {
  saves: [],
  results: [],
  meta: {},
  profile: null,
  fuse: null,
  busy: false,
  pagination: {
    currentPage: 1,
    itemsPerPage: 10,
    totalPages: 1
  },
  settings: {
    autoFetchEnabled: true,
    autoFetchInterval: 6 // hours
  },
  searchTerm: "",
  ui: {
    settingsOpen: false
  }
};

const debouncedSearch = debounce(runSearch, 150);

init();

function init() {
  wireEvents();
  setSettingsOpen(false);
  loadSettings();
  refreshState();
}

function wireEvents() {
  refs.login.addEventListener("click", onLogin);
  refs.fetch.addEventListener("click", onFetch);
  refs.hideGuide.addEventListener("click", () => refs.setupGuide.hidden = true);
  refs.exportJson.addEventListener("click", () => handleExport("json"));
  refs.exportCsv.addEventListener("click", () => handleExport("csv"));
  refs.search.addEventListener("input", debouncedSearch);
  refs.filter.addEventListener("change", runSearch);
  refs.results.addEventListener("click", onResultsClick);
  refs.prevPage.addEventListener("click", () => changePage(-1));
  refs.nextPage.addEventListener("click", () => changePage(1));
  refs.settingsToggle.addEventListener("click", toggleSettings);
  refs.autoFetchEnabled.addEventListener("change", saveSettings);
  refs.autoFetchRadios.forEach((radio) => radio.addEventListener("change", saveSettings));
  refs.donateBtn.addEventListener("click", onDonate);
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
    
    // Auto-fetch if logged in and data is stale
    if (state.profile?.name && shouldAutoFetch()) {
      setProgress("Checking for new saves...");
      await autoFetchSaves();
    }
  } catch (error) {
    setProgress(error.message, true);
  }
}

function shouldAutoFetch() {
  if (!state.settings.autoFetchEnabled) return false;
  
  const lastSync = state.meta.lastSync;
  if (!lastSync) return true; // Never synced
  
  const now = Date.now();
  const intervalHours = parseInt(state.settings.autoFetchInterval, 10);
  if (!Number.isFinite(intervalHours) || intervalHours <= 0) return false; // Manual only or invalid
  
  const intervalMs = intervalHours * 60 * 60 * 1000;
  
  // Auto-fetch if last sync was more than interval ago
  return (now - lastSync) > intervalMs;
}

function toggleSettings() {
  setSettingsOpen(!state.ui.settingsOpen);
}

async function saveSettings() {
  state.settings.autoFetchEnabled = refs.autoFetchEnabled.checked;
  const selected = refs.autoFetchRadios.find((radio) => radio.checked);
  if (selected) {
    state.settings.autoFetchInterval = parseInt(selected.value, 10);
  }
  if (!Number.isFinite(state.settings.autoFetchInterval)) {
    state.settings.autoFetchInterval = 0;
  }
  applySettingsUI();
  
  // Save to local storage
  await sendMessage({ 
    type: "settings.save", 
    settings: state.settings 
  });
}

async function loadSettings() {
  try {
    const response = await sendMessage({ type: "settings.get" });
    if (response?.ok && response.settings) {
      state.settings = { ...state.settings, ...response.settings };
      state.settings.autoFetchInterval = parseInt(state.settings.autoFetchInterval, 10) || 0;
    }
    applySettingsUI();
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
}

async function onLogin() {
  setBusy(true);
  try {
    const response = await sendMessage({ type: "oauth.login" });
    if (!response?.ok) {
      // If login fails due to authorization issues, show setup guide
      if (response?.error?.includes("Authorization") || response?.error?.includes("redirect")) {
        const redirectInfo = await sendMessage({ type: "oauth.getRedirectUri" });
        if (redirectInfo?.ok) {
          refs.redirectUriDisplay.textContent = redirectInfo.redirectUri;
          refs.setupGuide.hidden = false;
        }
      }
      throw new Error(response?.error || "Login failed");
    }
    state.profile = response.profile || null;
    updateHeader();
    refs.fetch.disabled = false;
    refs.setupGuide.hidden = true;
    setProgress("Signed in — automatically fetching your saves...");
    
    // Auto-fetch saves after successful login
    await autoFetchSaves();
    
  } catch (error) {
    setProgress(error.message, true);
  } finally {
    setBusy(false);
  }
}

async function onLogout() {
  setBusy(true);
  try {
    await sendMessage({ type: "oauth.logout" });
    // clear local profile/state and refresh UI
    state.profile = null;
    await refreshState();
    setProgress("Signed out");
  } catch (error) {
    setProgress(error.message, true);
  } finally {
    setBusy(false);
  }
}

function onDonate() {
  chrome.tabs.create({ url: "https://revolut.me/cristiandust" });
}

async function autoFetchSaves() {
  try {
    // Check settings first
    if (!state.settings.autoFetchEnabled) {
      return;
    }
    
    // Check if we should auto-fetch based on interval
    const lastSync = state.meta.lastSync;
    const now = Date.now();
    const intervalHours = parseInt(state.settings.autoFetchInterval, 10);
    
    if (!Number.isFinite(intervalHours) || intervalHours <= 0) {
      return; // Manual only
    }
    
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    // If we synced recently, skip auto-fetch
    if (lastSync && (now - lastSync) < intervalMs) {
      setProgress("Recent sync found — skipping auto-fetch");
      return;
    }
    
    setProgress(`Auto-syncing saved posts (every ${intervalHours}h)...`);
    const response = await sendMessage({ type: "saves.fetch", interactive: false, resume: true });
    if (!response?.ok) throw new Error(response?.error || "Auto-fetch failed");
    
    state.meta = response.meta || {};
    state.profile = response.profile || state.profile;
    await refreshState();
    
    const newCount = response.meta?.total || 0;
    const oldCount = state.saves.length;
    const newItems = Math.max(0, newCount - oldCount);
    
    if (newItems > 0) {
      setProgress(`Auto-sync complete — ${newItems} new saves found!`);
    } else {
      setProgress("Auto-sync complete — no new saves");
    }
  } catch (error) {
    console.error("Auto-fetch failed:", error);
    setProgress("Auto-fetch failed — use manual fetch if needed", true);
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
    setBusy(true);
    setProgress(`Preparing ${kind.toUpperCase()} export...`);
    
    // Export filtered results or all saves if no filter
    const itemsToExport = state.results.length > 0 ? state.results : state.saves;
    if (itemsToExport.length === 0) {
      throw new Error("No data to export. Please fetch your saves first.");
    }
    
    const ids = itemsToExport.map((item) => item.id || item.name);
    const response = await sendMessage({ type: `export.${kind}`, ids });
    if (!response?.ok) throw new Error(response?.error || "Export failed");
    
    setProgress(`${kind.toUpperCase()} export completed! Check your Downloads folder.`);
  } catch (error) {
    setProgress(error.message, true);
  } finally {
    setBusy(false);
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
  state.searchTerm = term;
  refs.controls?.classList.toggle("searching", Boolean(term));
  let candidates = state.saves;
  
  // Filter by subreddit if selected
  if (filter) {
    candidates = candidates.filter((item) => item.subreddit === filter);
  }
  
  // Apply text search
  if (term && state.fuse) {
    const hits = state.fuse.search(term, { limit: 1000 }).map((entry) => entry.item);
    state.results = hits.filter((item) => !filter || item.subreddit === filter);
  } else {
    state.results = candidates;
  }
  
  // Reset pagination
  state.pagination.currentPage = 1;
  state.pagination.totalPages = Math.ceil(state.results.length / state.pagination.itemsPerPage);
  
  render();
}

function render() {
  const startIndex = (state.pagination.currentPage - 1) * state.pagination.itemsPerPage;
  const endIndex = startIndex + state.pagination.itemsPerPage;
  const pageResults = state.results.slice(startIndex, endIndex);
  const searchTerm = state.searchTerm;
  const truncatedTerm = searchTerm.length > 60 ? `${searchTerm.slice(0, 57)}...` : searchTerm;
  const total = state.results.length;
  
  refs.results.textContent = "";
  const fragment = document.createDocumentFragment();
  
  pageResults.forEach((item) => {
    const node = refs.template.content.firstElementChild.cloneNode(true);
    const title = node.querySelector(".title");
    const meta = node.querySelector(".meta");
    const thumb = node.querySelector(".thumb");
    const open = node.querySelector(".open-btn");
    const unsaveBtn = node.querySelector(".unsave-btn");

    const titleText = item.title || "Untitled Reddit post";
    const targetUrl = item.permalink || item.url || "https://www.reddit.com";
    title.innerHTML = highlight(titleText, searchTerm);
    title.href = targetUrl;

    // Enhanced meta information with better formatting
    const details = [];
    if (item.subreddit) details.push(`r/${item.subreddit}`);
    if (item.author) details.push(`u/${item.author}`);
    if (item.score !== undefined) details.push(`${item.score} points`);
    if (item.createdUtc) {
      const date = new Date(item.createdUtc);
      details.push(formatDateTime(date));
    }
    meta.innerHTML = highlight(details.join(" • "), searchTerm);

    // Enhanced thumbnail handling
    if (item.thumbnail && item.thumbnail !== "self" && item.thumbnail !== "default" && item.thumbnail.startsWith("http")) {
      thumb.style.backgroundImage = `url(${item.thumbnail})`;
      thumb.hidden = false;
    } else {
      thumb.hidden = true;
    }

    open.dataset.url = targetUrl;
    unsaveBtn.dataset.name = item.name;

    fragment.appendChild(node);
  });
  
  refs.results.appendChild(fragment);
  
  if (total === 0) {
    const hasCachedSaves = state.saves.length > 0;
    const message = hasCachedSaves
      ? searchTerm
        ? `No results for "${truncatedTerm}". Try different keywords or clear filters.`
        : "No matching posts. Adjust your filters or fetch new saves."
      : "No saved posts yet. Fetch your Reddit saves to get started.";
    refs.results.setAttribute("data-empty-message", message);
  } else {
    refs.results.removeAttribute("data-empty-message");
  }

  // Update count with pagination info
  const showing = pageResults.length;
  const allTotal = state.saves.length;
  const { currentPage, totalPages } = state.pagination;
  
  if (totalPages > 1) {
    refs.count.textContent = `Showing ${showing} of ${total} results · Page ${currentPage}/${totalPages} · ${allTotal} total saves`;
  } else {
    refs.count.textContent = `Showing ${total} results · ${allTotal} total saves`;
  }
  
  refs.syncLabel.textContent = `Last sync: ${formatDateTime(state.meta.lastSync)}`;

  const hasData = state.saves.length > 0;
  refs.exportJson.disabled = !hasData;
  refs.exportCsv.disabled = !hasData;
  
  // Update pagination controls
  updatePaginationControls();
}

function updatePaginationControls() {
  const { currentPage, totalPages } = state.pagination;
  const showPagination = totalPages > 1;
  
  refs.pagination.hidden = !showPagination;
  
  if (showPagination) {
    refs.prevPage.disabled = currentPage <= 1;
    refs.nextPage.disabled = currentPage >= totalPages;
    refs.pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  }
}

function changePage(direction) {
  const newPage = state.pagination.currentPage + direction;
  if (newPage >= 1 && newPage <= state.pagination.totalPages) {
    state.pagination.currentPage = newPage;
    render();
  }
}

// (scroll helper removed — pagination will not change window scroll)

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
    // Toggle login button to act as logout when signed in
    try { refs.login.removeEventListener("click", onLogin); } catch(e) {}
    try { refs.login.removeEventListener("click", onLogout); } catch(e) {}
    refs.login.textContent = "Logout";
    refs.login.title = "Sign out of Reddit";
    refs.login.addEventListener("click", onLogout);
  } else {
    refs.profileName.textContent = "Not signed in";
    refs.profileStatus.textContent = state.saves.length ? "Offline" : "Sign in";
    refs.profileStatus.classList.add("offline");
    refs.profileStatus.classList.remove("online");
    refs.fetch.disabled = true;
    // Ensure login button is set to login action
    try { refs.login.removeEventListener("click", onLogout); } catch(e) {}
    try { refs.login.removeEventListener("click", onLogin); } catch(e) {}
    refs.login.textContent = "Login with Reddit";
    refs.login.title = "Login with Reddit OAuth";
    refs.login.addEventListener("click", onLogin);
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
  refs.progress.classList.toggle("is-error", isError);
  // Handle multiline text by converting \n to <br>
  refs.progress.innerHTML = text.replace(/\n/g, '<br>');
}

function setBusy(value) {
  state.busy = value;
  refs.fetch.disabled = value || !state.profile?.name;
  refs.login.disabled = value;
  refs.exportJson.disabled = value || !state.saves.length;
  refs.exportCsv.disabled = value || !state.saves.length;
  document.body.classList.toggle("is-busy", value);
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

function applySettingsUI() {
  refs.autoFetchEnabled.checked = state.settings.autoFetchEnabled;
  const autoSyncDisabled = !state.settings.autoFetchEnabled;
  if (refs.autoFetchGroup) {
    refs.autoFetchGroup.classList.toggle("is-disabled", autoSyncDisabled);
  }
  refs.autoFetchRadios.forEach((radio) => {
    const isMatch = parseInt(radio.value, 10) === parseInt(state.settings.autoFetchInterval, 10);
    radio.checked = isMatch;
  });
  if (refs.autoFetchRadios.length && !refs.autoFetchRadios.some((radio) => radio.checked)) {
    refs.autoFetchRadios[0].checked = true;
    state.settings.autoFetchInterval = parseInt(refs.autoFetchRadios[0].value, 10) || 0;
  }
  refs.settings?.classList.toggle("auto-sync-disabled", autoSyncDisabled);
}

function setSettingsOpen(open) {
  state.ui.settingsOpen = Boolean(open);
  if (refs.settings) {
    refs.settings.hidden = !open;
    refs.settingsToggle?.setAttribute("aria-expanded", String(open));
    refs.settings.classList.toggle("is-open", open);
    if (open) {
      requestAnimationFrame(() => {
        refs.settings?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    }
  }
}

function highlight(text, term) {
  const source = text ?? "";
  if (!term) return escapeHtml(source);
  try {
    const pattern = new RegExp(`(${escapeRegExp(term)})`, "gi");
    return escapeHtml(source).replace(pattern, "<mark>$1</mark>");
  } catch (error) {
    return escapeHtml(source);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
