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
```

## Architecture

### Core Layer (`src/core/`)

- **ThreadStore** - Facade implementing `IThreadRepository`, orchestrates `StorageEngine`, `ChangeTracker`, `BlacklistManager`. Maintains caches (`cachedThreads`, `cachedDashboardData`) invalidated on mutations.
- **StorageEngine** - Persistence via `GM_getValue`/`GM_setValue` with pako gzip compression at 50KB threshold. Debounced saves (300ms). Falls back to localStorage when GM APIs unavailable (testing).
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
- **Shadow DOM Support**: Uses `querySelectorAllDeep` and `closestDeep` from `src/utils/shadowDomQuery.ts` to pierce shadow DOM boundaries, ensuring compatibility if Discord uses Web Components

### Storage
- Storage key: `discord-thread-monitor-data` (changing this breaks existing user data)
- Compression wrapper format: `{ compressed: boolean, data: string | base64 }`
- Backward-compatible deserialization handles old raw JSON format
- Migration system in `ThreadStore.migrateData()` (e.g., `retentionMonths` -> `retentionDays`)
- ThreadStore maintains three concerns: thread metadata, change history, blacklist (Set for O(1) lookup + array for persistence)

### Internationalization
- `src/i18n.ts`: Chinese (zh) and English (en). Detection: browser language -> localStorage (`thread-monitor-language`) -> default zh
- Text substitution uses `'{n}'` placeholder pattern

### Userscript Metadata (vite-plugin-monkey)
- Grants: `GM_getValue`, `GM_setValue` only
- Run-at: `document-end`
- Match: `https://discord.com/*`

### Debug
- `src/debug/simulateTitleChange.ts` only available when `import.meta.env.DEV` is true
