# ReReaddit

ReReaddit is a fully client-side Chrome extension (Manifest V3) that backs up, searches, and exports your saved Reddit posts. No servers, no tracking—everything lives in the browser.

## Capabilities
- Reddit OAuth via `chrome.identity.launchWebAuthFlow`
- Fetches every saved post using `/user/{username}/saved` with pagination and 400 ms throttling
- Caches saves locally in `chrome.storage.local` for offline search
- Fuzzy search (Fuse-style) across title, body, subreddit, author, and tags
- Quick exports to JSON or CSV via `chrome.downloads.download`
- Optional “Unsave” action that calls Reddit’s API directly

## Project Layout

```
manifest.json
src/
  background.js      # Service worker: OAuth, fetch, storage, exports
  fuse.esm.js        # Lightweight Fuse-compatible search helper (MIT)
  oauth.js           # OAuth helpers + profile caching
  popup.css          # Popup styles
  popup.html         # Popup UI
  popup.js           # Popup logic + runtime messaging
  utils.js           # Shared helpers (storage, exports, formatting)
```

## Setup
1. Create a personal-use Reddit app at <https://www.reddit.com/prefs/apps>.
   - Choose **installed app**.
   - Temporarily set the redirect URI to `https://127.0.0.1/rereaddit` (you will replace it after the first load) or note the value returned by `chrome.identity.getRedirectURL('rereaddit')` once the extension is running.
   - Copy the generated **client ID**.
2. Open `src/oauth.js` and replace the placeholders:
   - `CLIENT_ID` → your Reddit client ID
   - `USER_AGENT` → e.g. `ReReaddit/0.1 (by u/yourusername)` (Reddit requires this header)
3. Load the extension:
   - Visit `chrome://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked** and select the repo root (`ReReddit`)
4. The first time you press **Login with Reddit**, Chrome shows the exact redirect URI—copy it back into your Reddit app settings so future logins succeed.

## Using the Extension
- **Login with Reddit** to start a session (tokens live in local storage, never sent elsewhere).
- Press **Fetch Saves** to pull everything; progress updates while paging through Reddit’s API.
- Search instantly—even offline—using fuzzy matching and subreddit filtering.
- Download your saves via **Export JSON** or **Export CSV**; files are generated locally.
- Use **Unsave** next to any item to remove it from Reddit and your cache.

## Notes & Limits
- Reddit’s implicit-grant tokens last ~1 hour; if a sync fails with “session expired” just log in again.
- Sync respects Reddit’s rate limits with back-off on `429` responses.
- Cached saves remain available offline; re-run **Fetch Saves** to refresh.
- This codebase stores only Reddit save metadata. Nothing leaves your browser.
