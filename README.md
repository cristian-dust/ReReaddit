# ReReaddit 📚# ReReaddit 📚



**Never lose track of your saved Reddit posts again!****Never lose track of your saved Reddit posts again!**



ReReaddit is a modern, privacy-focused Chrome extension that transforms your chaotic pile of saved Reddit posts into an organized, searchable library. Built with Manifest V3, it runs entirely in your browser—no servers, no tracking, no data collection.ReReaddit is a modern, privacy-focused Chrome extension that transforms your chaotic pile of saved Reddit posts into an organized, searchable library. Built with Manifest V3, it runs entirely in your browser—no servers, no tracking, no data collection.



## ✨ Why ReReaddit?## ✨ Why ReReaddit?



**The Problem:** Reddit's native saved posts feature is practically useless for finding anything. No search, poor organization, and posts get buried in an endless scroll.**The Problem:** Reddit's native saved posts feature is practically useless for finding anything. No search, poor organization, and posts get buried in an endless scroll.



**The Solution:** ReReaddit creates your personal Reddit library with:**The Solution:** ReReaddit creates your personal Reddit library with:

- ⚡ **Lightning-fast search** across all your saved content- ⚡ **Lightning-fast search** across all your saved content

- 🔄 **Automatic syncing** with configurable intervals (1h, 6h, 24h)- 🔄 **Automatic syncing** with configurable intervals (1h, 6h, 24h)

- 📊 **Smart organization** with pagination and filtering- 📊 **Smart organization** with pagination and filtering

- 💾 **Data ownership** - export to JSON/CSV anytime- 💾 **Data ownership** - export to JSON/CSV anytime

- 🔒 **Complete privacy** - everything stays in your browser- 🔒 **Complete privacy** - everything stays in your browser

- 🎨 **Modern interface** with dark mode support- 🎨 **Modern interface** with dark mode support



## 🚀 Key Features## 🚀 Key Features



### Intelligent Search & Discovery### Intelligent Search & Discovery

- **Fuzzy search** across titles, content, subreddits, authors, and flair- **Fuzzy search** across titles, content, subreddits, authors, and flair

- **Real-time filtering** with instant results- **Real-time filtering** with instant results

- **Subreddit grouping** to find posts by community- **Subreddit grouping** to find posts by community

- **Date-based organization** to track when you saved items- **Date-based organization** to track when you saved items



### Automated Backup & Sync### Automated Backup & Sync

- **One-click login** with secure Reddit OAuth- **One-click login** with secure Reddit OAuth

- **Smart pagination** handles thousands of saved posts- **Smart pagination** handles thousands of saved posts

- **Auto-fetch on startup** keeps your library current- **Auto-fetch on startup** keeps your library current

- **Configurable sync intervals** (hourly, 6-hour, daily)- **Configurable sync intervals** (hourly, 6-hour, daily)

- **Progress tracking** with real-time sync status- **Progress tracking** with real-time sync status



### Data Control & Export### Data Control & Export

- **JSON export** for developers and power users- **JSON export** for developers and power users

- **CSV export** for spreadsheet analysis- **CSV export** for spreadsheet analysis

- **Bulk operations** for managing large collections- **Bulk operations** for managing large collections

- **Local storage** means your data never leaves your device- **Local storage** means your data never leaves your device



### Modern User Experience### Modern User Experience

- **Professional interface** with card-based layout- **Professional interface** with card-based layout

- **Responsive design** that scales beautifully- **Responsive design** that scales beautifully

- **Dark mode support** for comfortable browsing- **Dark mode support** for comfortable browsing

- **Settings panel** for customizing behavior- **Settings panel** for customizing behavior

- **Pagination controls** for easy navigation- **Pagination controls** for easy navigation



## 🛠️ Technical Architecture## Project Layout



ReReaddit is built with modern web technologies and follows Chrome Extension Manifest V3 standards:```

manifest.json

### Core Componentssrc/

```  background.js      # Service worker: OAuth, fetch, storage, exports

manifest.json          # Extension configuration & permissions  fuse.esm.js        # Lightweight Fuse-compatible search helper (MIT)

src/  oauth.js           # OAuth helpers + profile caching

  ├── background.js     # Service worker: OAuth, sync, storage  popup.css          # Popup styles

  ├── popup.html        # Modern popup interface  popup.html         # Popup UI

  ├── popup.js          # UI logic & state management    popup.js           # Popup logic + runtime messaging

  ├── popup.css         # Professional styling & dark mode  utils.js           # Shared helpers (storage, exports, formatting)

  ├── oauth.js          # Reddit authentication flow```

  ├── utils.js          # Data processing & export utilities

  └── fuse.esm.js       # Lightweight fuzzy search engine## Setup

```1. Create a personal-use Reddit app at <https://www.reddit.com/prefs/apps>.

   - Choose **installed app**.

### Privacy & Security   - Temporarily set the redirect URI to `https://127.0.0.1/rereaddit` (you will replace it after the first load) or note the value returned by `chrome.identity.getRedirectURL('rereaddit')` once the extension is running.

- **Client-side only**: No external servers or data transmission   - Copy the generated **client ID**.

- **Secure OAuth**: Uses Chrome's native identity API2. Open `src/oauth.js` and replace the placeholders:

- **Local storage**: All data stays in your browser   - `CLIENT_ID` → your Reddit client ID

- **No tracking**: Zero analytics or telemetry   - `USER_AGENT` → e.g. `ReReaddit/0.1 (by u/yourusername)` (Reddit requires this header)

- **Open source**: Full transparency of functionality3. Load the extension:

   - Visit `chrome://extensions`

## 📋 Installation & Setup   - Enable **Developer mode**

   - Click **Load unpacked** and select the repo root (`ReReddit`)

### Step 1: Create Reddit App4. The first time you press **Login with Reddit**, Chrome shows the exact redirect URI—copy it back into your Reddit app settings so future logins succeed.

1. Visit [Reddit App Preferences](https://www.reddit.com/prefs/apps)

2. Click **"Create App"** or **"Create Another App"**## Using the Extension

3. Fill out the form:- **Login with Reddit** to start a session (tokens live in local storage, never sent elsewhere).

   - **Name**: `ReReaddit` (or your preferred name)- Press **Fetch Saves** to pull everything; progress updates while paging through Reddit’s API.

   - **App type**: Select **"installed app"** (important!)- Search instantly—even offline—using fuzzy matching and subreddit filtering.

   - **Description**: Optional- Download your saves via **Export JSON** or **Export CSV**; files are generated locally.

   - **About URL**: Optional- Use **Unsave** next to any item to remove it from Reddit and your cache.

   - **Redirect URI**: `https://127.0.0.1/rereaddit` (temporary)

4. Click **"Create app"**## Notes & Limits

5. **Copy the Client ID** (string under the app name)- Reddit’s implicit-grant tokens last ~1 hour; if a sync fails with “session expired” just log in again.

- Sync respects Reddit’s rate limits with back-off on `429` responses.

### Step 2: Configure Extension- Cached saves remain available offline; re-run **Fetch Saves** to refresh.

1. Download or clone this repository- This codebase stores only Reddit save metadata. Nothing leaves your browser.

2. Open `src/oauth.js` in a text editor
3. Replace the placeholder values:
   ```javascript
   const CLIENT_ID = 'your_reddit_client_id_here';
   const USER_AGENT = 'ReReaddit/1.0 (by u/yourusername)';
   ```

### Step 3: Load Extension
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top-right)
3. Click **"Load unpacked"**
4. Select the ReReaddit folder (containing `manifest.json`)
5. The extension icon should appear in your toolbar

### Step 4: Complete OAuth Setup
1. Click the ReReaddit extension icon
2. Click **"Login with Reddit"**
3. Chrome will show an error with the correct redirect URI
4. Copy this URI and update your Reddit app settings
5. Try logging in again - it should now work!

## 🎯 How to Use

### Getting Started
1. **Login**: Click "Login with Reddit" to authenticate
2. **First Sync**: The extension automatically fetches your saved posts
3. **Search**: Use the search bar to find specific content
4. **Explore**: Browse by subreddit, date, or content type

### Daily Workflow
- **Auto-sync**: Enable automatic fetching in settings (⚙️ button)
- **Quick search**: Find posts instantly with fuzzy search
- **Export data**: Download your library as JSON or CSV
- **Manage saves**: View post details and unsave if needed

### Advanced Features
- **Pagination**: Navigate large collections easily
- **Bulk export**: Download all data for backup
- **Settings**: Customize sync intervals and behavior
- **Offline access**: Search works without internet connection

## ⚙️ Technical Details

### API Integration
- Uses Reddit's OAuth 2.0 implicit flow for secure authentication
- Fetches data from `/user/{username}/saved` endpoint with proper pagination
- Respects Reddit's rate limits with 400ms throttling between requests
- Handles API errors gracefully with automatic retry logic

### Data Management
- Stores all data locally using Chrome's `chrome.storage.local` API
- Implements smart caching to avoid unnecessary API calls
- Maintains data integrity with checksums and validation
- Supports incremental updates to minimize sync time

### Performance Optimization
- Lazy loading for large collections (50 items per page)
- Efficient fuzzy search using optimized Fuse.js implementation
- Minimal memory footprint with garbage collection
- Background processing to avoid UI blocking

## 🔧 Troubleshooting

### Common Issues

**"Authorization page could not be loaded"**
- Ensure your Reddit app is configured as "installed app" (not "web app")
- Verify the redirect URI matches Chrome's generated URI
- Check that the Client ID is correctly set in `src/oauth.js`

**Search not working**
- Make sure you've synced your saves first
- Try clearing the search and refreshing the extension
- Check browser console for any JavaScript errors

**Export functionality issues**
- Ensure Chrome has download permissions
- Try a smaller export if you have many thousands of saves
- Check available disk space

**Sync failures**
- Verify your Reddit session hasn't expired (login again)
- Check your internet connection
- Wait a moment and try again (may be rate-limited)

### Support
If you encounter issues not covered here, please check the browser console for error messages and report them via GitHub issues.

## 🤝 Contributing

ReReaddit is open source and welcomes contributions! Here's how you can help:

### Development Setup
1. Fork the repository
2. Clone your fork locally
3. Make your changes
4. Test thoroughly with the extension loaded in developer mode
5. Submit a pull request with a clear description

### Areas for Contribution
- **UI/UX improvements**: Better visual design, accessibility features
- **Performance optimization**: Faster search, better memory usage
- **Feature additions**: New export formats, advanced filtering
- **Bug fixes**: Resolve issues reported by users
- **Documentation**: Improve setup guides, add translations

### Code Style
- Use modern JavaScript (ES6+)
- Follow existing code patterns and naming conventions
- Add comments for complex logic
- Test all changes thoroughly

## 📄 License

ReReaddit is released under a **Non-Commercial License** - see the [LICENSE](LICENSE) file for details.

**Key Points:**
- ✅ Free to use for personal, educational, and non-commercial purposes
- ✅ Free to modify and improve for personal use
- ✅ Free to contribute improvements back to the project
- ❌ Cannot be sold, resold, or used commercially without permission
- ❌ Cannot be redistributed for profit
- ❌ Cannot be integrated into commercial products without agreement

## ☕ Support the Project

If ReReaddit has helped you organize your Reddit saves and saved you time, consider supporting its development:

**[☕ Buy me a coffee via Revolut](https://revolut.me/cristiandust)**

Your support helps maintain the project, implement new features, and keep it free for everyone!

---

## 📊 Project Stats

- **Language**: JavaScript (ES6+)
- **Architecture**: Chrome Extension Manifest V3
- **Dependencies**: Minimal (only Fuse.js for search)
- **Size**: ~50KB total
- **Performance**: Handles 10,000+ saved posts efficiently
- **Privacy**: 100% client-side, zero data collection

---

**Made with ❤️ for the Reddit community**

*ReReaddit transforms your saved posts from a digital junk drawer into an organized, searchable library. Take control of your Reddit saves today!*