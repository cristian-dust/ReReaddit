# ReReaddit 

**Never lose track of your saved Reddit posts again!**

ReReaddit is a modern, privacy-focused Chrome extension that transforms your chaotic pile of saved Reddit posts into an organized, searchable library. Built with Manifest V3, it runs entirely in your browser—no servers, no tracking, no data collection.

## ? Why ReReaddit?

**The Problem:** Reddit's native saved posts feature is practically useless for finding anything. No search, poor organization, and posts get buried in an endless scroll.

**The Solution:** ReReaddit creates your personal Reddit library with:
-  **Lightning-fast search** across all your saved content
-  **Automatic syncing** with configurable intervals (1h, 6h, 24h)
-  **Smart organization** with pagination and filtering
-  **Data ownership** - export to JSON/CSV anytime
-  **Complete privacy** - everything stays in your browser
-  **Modern interface** with dark mode support

##  Key Features

### Intelligent Search & Discovery
- **Fuzzy search** across titles, content, subreddits, authors, and flair
- **Real-time filtering** with instant results
- **Subreddit grouping** to find posts by community
- **Date-based organization** to track when you saved items

### Automated Backup & Sync
- **One-click login** with secure Reddit OAuth
- **Smart pagination** handles thousands of saved posts
- **Auto-fetch on startup** keeps your library current
- **Configurable sync intervals** (hourly, 6-hour, daily)
- **Progress tracking** with real-time sync status

### Data Control & Export
- **JSON export** for developers and power users
- **CSV export** for spreadsheet analysis
- **Bulk operations** for managing large collections
- **Local storage** means your data never leaves your device

### Modern User Experience
- **Professional interface** with card-based layout
- **Responsive design** that scales beautifully
- **Dark mode support** for comfortable browsing
- **Settings panel** for customizing behavior
- **Pagination controls** for easy navigation

##  Technical Architecture

ReReaddit is built with modern web technologies and follows Chrome Extension Manifest V3 standards:

### Project Layout
```
manifest.json          # Extension configuration & permissions
src/
   background.js     # Service worker: OAuth, sync, storage
   popup.html        # Modern popup interface
   popup.js          # UI logic & state management
   popup.css         # Professional styling & dark mode
   oauth.js          # Reddit authentication flow
   utils.js          # Data processing & export utilities
   fuse.esm.js       # Lightweight fuzzy search engine
```

### Core Technologies
- **JavaScript (ES6+)**: Modern async/await patterns
- **Fuse.js**: Efficient fuzzy search implementation
- **Chrome Extensions API**: Manifest V3, storage, identity
- **Reddit API**: OAuth 2.0, pagination, rate limiting

##  Installation & Setup

### Step 1: Create Reddit App
1. Visit [Reddit App Preferences](https://www.reddit.com/prefs/apps)
2. Click **"Create App"** or **"Create Another App"**
3. Fill out the form:
   - **Name**: `ReReaddit` (or your preferred name)
   - **App type**: Select **"installed app"** (important!)
   - **Description**: Optional
   - **About URL**: Optional
   - **Redirect URI**: `https://127.0.0.1/rereaddit` (temporary)
4. Click **"Create app"**
5. **Copy the Client ID** (string under the app name)

### Step 2: Configure Extension
1. Download or clone this repository
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

##  How to Use

### Getting Started
1. **Login**: Click "Login with Reddit" to authenticate
2. **First Sync**: The extension automatically fetches your saved posts
3. **Search**: Use the search bar to find specific content
4. **Explore**: Browse by subreddit, date, or content type

### Daily Workflow
- **Auto-sync**: Enable automatic fetching in settings ( button)
- **Quick search**: Find posts instantly with fuzzy search
- **Export data**: Download your library as JSON or CSV
- **Manage saves**: View post details and unsave if needed

### Advanced Features
- **Pagination**: Navigate large collections easily
- **Bulk export**: Download all data for backup
- **Settings**: Customize sync intervals and behavior
- **Offline access**: Search works without internet connection

##  Technical Details

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

##  Troubleshooting

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

##  Contributing

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

##  License

ReReaddit is released under a **Non-Commercial License** - see the [LICENSE](LICENSE) file for details.

**Key Points:**
-  Free to use for personal, educational, and non-commercial purposes
-  Free to modify and improve for personal use
-  Free to contribute improvements back to the project
-  Cannot be sold, resold, or used commercially without permission
-  Cannot be redistributed for profit
-  Cannot be integrated into commercial products without agreement

##  Support the Project

If ReReaddit has helped you organize your Reddit saves and saved you time, consider supporting its development:

**[ Buy me a coffee via Revolut](https://revolut.me/cristiandust)**

Your support helps maintain the project, implement new features, and keep it free for everyone!

---

##  Project Stats

- **Language**: JavaScript (ES6+)
- **Architecture**: Chrome Extension Manifest V3
- **Dependencies**: Minimal (only Fuse.js for search)
- **Size**: ~50KB total
- **Performance**: Handles 10,000+ saved posts efficiently
- **Privacy**: 100% client-side, zero data collection

---

**Made with  for the Reddit community**

*ReReaddit transforms your saved posts from a digital junk drawer into an organized, searchable library. Take control of your Reddit saves today!*
