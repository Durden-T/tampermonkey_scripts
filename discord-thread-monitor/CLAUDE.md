# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Tampermonkey userscript that monitors Discord forum thread titles for changes. Built with React 19 and Vite, using `vite-plugin-monkey` to output a Tampermonkey-compatible userscript.

## Commands

```bash
npm run dev           # Start dev server with hot reload (auto-installs script in Tampermonkey)
npm run build         # Build production userscript to dist/
npm run build:dev     # Build unminified for debugging
npm test              # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:run -- src/core/ThreadStore.test.ts  # Run single test file
npm run test:coverage # Run tests with coverage report
npm run lint          # Check code for lint errors (fails on warnings)
npm run lint:fix      # Auto-fix fixable lint issues
npm run stylelint     # Check CSS for lint errors
npm run stylelint:fix # Auto-fix fixable CSS issues
npm run format        # Format code with Prettier
npm run format:check  # Check formatting without fixing
npm run release:check # Run all quality checks (format, lint, stylelint, test, build) before releasing
```

## Automatic Linting & Formatting

Code quality is enforced automatically on every commit via Husky pre-commit hooks:

1. **ESLint** runs with `--fix` to auto-correct TypeScript/TSX issues
2. **stylelint** runs with `--fix` to auto-correct CSS issues
3. **Prettier** runs with `--write` to format all staged files

The commit will be blocked if any lint error cannot be auto-fixed. This ensures all committed code adheres to CLAUDE.md standards without manual intervention.

**To bypass** (not recommended): `git commit --no-verify`

## Release & Deployment

### Automated Release Pipeline

GitHub Actions workflow (`.github/workflows/release.yml`) triggers on version tags (`v*.*.*`) and automatically:

1. Runs quality checks (formatting, ESLint, stylelint, tests)
2. Builds production userscript
3. Creates GitHub release with installation instructions and uploads built script
4. Deploys to jsDelivr CDN for instant distribution

### Release Process

```bash
# Step 1: Run pre-release checks
npm run release:check

# Step 2: Bump version (auto-creates commit and tag)
npm version patch   # Bug fixes: 1.0.0 → 1.0.1
npm version minor   # New features: 1.0.0 → 1.1.0
npm version major   # Breaking changes: 1.0.0 → 2.0.0

# Step 3: Push tags to trigger GitHub Actions
git push --follow-tags

# Step 4: GitHub Actions handles the rest automatically
```

### Version Management

- **Version source**: `package.json` (single source of truth)
- **Vite config**: Reads version dynamically via `readFileSync` in `vite.config.ts`
- **Userscript header**: Auto-populated from `package.json` during build
- **Never hardcode version** in multiple files

### Auto-Update Configuration

Userscript includes auto-update URLs pointing to jsDelivr CDN:

- `@updateURL`: Tampermonkey checks this URL for new versions
- `@downloadURL`: Where to download updated script
- **CDN URL pattern**: `https://cdn.jsdelivr.net/gh/Durden-T/tampermonkey_scripts@{tag}/discord-thread-monitor/dist/discord-thread-monitor.user.js`
- **Latest version**: Use `@latest` tag for always-current URL
- **Specific version**: Use `@v1.0.1` for pinned version

Users with auto-update enabled in Tampermonkey will automatically receive new versions.

### Distribution URLs

**Installation (latest version):**

```
https://cdn.jsdelivr.net/gh/Durden-T/tampermonkey_scripts@latest/discord-thread-monitor/dist/discord-thread-monitor.user.js
```

**Specific version (stable):**

```
https://cdn.jsdelivr.net/gh/Durden-T/tampermonkey_scripts@v1.0.0/discord-thread-monitor/dist/discord-thread-monitor.user.js
```

### jsDelivr CDN Notes

- **Cache purge**: GitHub releases trigger automatic CDN cache updates
- **CDN propagation**: Typically instant, may take up to 5 minutes globally
- **Reliability**: 99.9% uptime SLA, multi-CDN architecture
- **Bandwidth**: Unlimited, free for open source projects

## Architecture

### Core Layer (`src/core/`)

- **ThreadStore** - Facade implementing `IThreadRepository`, orchestrates `StorageEngine`, `ChangeTracker`, `BlacklistManager`. Maintains caches (`cachedThreads`, `cachedDashboardData`) invalidated on mutations.
- **StorageEngine** - Persistence via IndexedDB with pako gzip compression. Debounced saves (300ms).
- **ChangeTracker** - Manages change history with unseenCount tracking, cleanup by retention days, grouping logic via `ChangeGroupBuilder`
- **BlacklistManager** - Set-based O(1) lookup for blocked thread IDs
- **ThreadScanner** - DOM scraper parsing Discord's `aria-label` and `data-list-item-id` attributes
- **ChangeDetector** - Compares scans against stored data via `IThreadRepository` interface
- **Notifier** - Pub/sub for propagating changes to UI

### Data Flow

```
ThreadScanner.scanVisibleThreads()
    -> ChangeDetector.detectAndPersistChanges(threads)
    -> ThreadStore.recordTitleChange() + cache invalidation
    -> Notifier.notifyAll(changes)
    -> React UI updates via useNotificationListener hook
```

### Hooks Layer (`src/hooks/`)

Follows single-responsibility pattern:

- **useAppData** - Aggregates dashboard state, notifications, scan interval
- **useAppHandlers** - Composes handler hooks into unified interface
- **useDashboardData** - Retrieves cached dashboard data from store
- **useThreadHandlers/useToastHandlers/useSettingsHandlers** - Domain-specific actions
- **useDraggable** - Position persistence for panel/toggle with drag threshold
- **useNotificationListener** - Subscribes to Notifier for real-time updates

### UI Layer (`src/components/`)

- **ManagerPanel** - Main panel with tabs (changes/monitoring/blacklist/debug), draggable via `useDraggable` hook. Sub-components in `ManagerPanel/` directory.
- **ToggleButton** - Floating button showing unseen count
- **ToastContainer** - Pop-up notifications with auto-dismiss (5s)

### Constants & Types

- `src/constants.ts` - All magic numbers centralized: `TIME_MS`, `BYTES`, `STORAGE`, `UI`, `TIMING`
- `src/types/index.ts` - Core interfaces: `MonitoredThread`, `TitleChange`, `ThreadChangeGroup`, `StoredData`, `StorageInfo`

### Entry Point

`src/main.tsx` initializes core classes, performs initial scan after 2s delay (required for Discord DOM readiness), mounts React to injected container (`thread-monitor-root`). Scan interval is 60s.

## Testing

Vitest with jsdom. Setup file (`src/test/setup.ts`) provides a `LocalStorageMock` since GM APIs are unavailable in tests. Coverage excludes test files and `main.tsx`.

## Key Implementation Details

### DOM Selectors (fragile -- coupled to Discord's DOM structure)

- Thread elements: `[data-list-item-id^="channels___"][aria-label*="(thread)"]`
- Thread ID: `data-list-item-id.split('___')[1]`
- Title: `aria-label` with `"unread, "` prefix and `" (thread)"` suffix stripped
- Parent channel: closest `ul[role="group"][aria-label*="threads"]`
- Server ID: `window.location.pathname.split('/')[2]`

**Note:** Discord does not currently use Shadow DOM for thread elements. Previous Shadow DOM query utilities were removed as they added unnecessary complexity and performance overhead without functional benefit. Standard `querySelector` and `closest` methods are sufficient.

### Storage

- Storage backend: IndexedDB via `idb` library
- Database name: `discord-thread-monitor`
- Object stores: `data` (main data), `prefs` (user preferences)
- Compression wrapper format: `{ compressed: boolean, data: string | base64 }`
- Backward-compatible deserialization handles old raw JSON format
- ThreadStore maintains three concerns: thread metadata, change history, blacklist (Set for O(1) lookup + array for persistence)
- PrefsStore provides singleton access to preferences (language, etc.)

### Internationalization

- `src/i18n.ts`: Chinese (zh) and English (en). Detection: browser language -> localStorage (`thread-monitor-language`) -> default zh
- Text substitution uses `'{n}'` placeholder pattern

### Userscript Metadata (vite-plugin-monkey)

- **Grants**: `none` (uses IndexedDB for storage)
- **Run-at**: `document-end`
- **Match**: `https://discord.com/*`
- **Auto-update**: `@updateURL` and `@downloadURL` point to jsDelivr CDN (`@latest` tag)
- **Version**: Dynamically read from `package.json` via `vite.config.ts` (never hardcoded)
- **Namespace**: `https://github.com/Durden-T/tampermonkey_scripts`

### Debug

- `src/debug/simulateTitleChange.ts` only available when `import.meta.env.DEV` is true
