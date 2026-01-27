# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Tampermonkey userscript that monitors Discord forum thread titles for changes. Built with React 19 and Vite, using `vite-plugin-monkey` to output a Tampermonkey-compatible userscript. The UI renders inside a Shadow DOM to isolate styles from Discord's page.

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

## Code Quality Enforcement

### Pre-commit Hooks (Husky + lint-staged)

Every commit automatically runs on staged files:

- `*.{ts,tsx}`: ESLint `--fix` then Prettier `--write`
- `*.css`: stylelint `--fix` then Prettier `--write`

Commits are blocked if any lint error cannot be auto-fixed.

### ESLint Hard Limits

These numeric thresholds are enforced as errors in `eslint.config.js`:

| Metric                | Limit                                 |
| --------------------- | ------------------------------------- |
| Cyclomatic complexity | 15                                    |
| Max parameters        | 4                                     |
| Max file lines        | 400 (excluding blanks/comments)       |
| Max function lines    | 50 (excluding blanks/comments)        |
| Max nesting depth     | 3                                     |
| Max line length       | 120 (URLs, strings, templates exempt) |

Magic numbers other than `0, 1, -1, 2` are errors. Extract to `constants.ts`.

Key TypeScript rules: `no-explicit-any` (error), `no-non-null-assertion` (error), `no-floating-promises` (error), `prefer-nullish-coalescing` (error), `prefer-optional-chain` (error), `consistent-type-imports` with inline style (error).

Style rules: `curly: all` (always use braces), `no-else-return` (use guard clauses), `eqeqeq: always`.

### Prettier Config

Prettier's `printWidth` is **100** (stricter than ESLint's 120). Single quotes, semicolons, trailing commas (ES5), LF line endings, always parenthesize arrow params.

### TypeScript

Target ES2020, strict mode with `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`. Uses `react-jsx` transform (no manual React imports for JSX).

## Release & Deployment

### Version Management

- **Version source**: `package.json` (single source of truth)
- **Vite config**: Reads version dynamically via `readFileSync` in `vite.config.ts`
- **Userscript header**: Auto-populated from `package.json` during build
- **Never hardcode version** in multiple files

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

`src/main.tsx` initializes core classes, creates a Shadow DOM host element, injects CSS via `?inline` import, and mounts React inside the shadow root. Initial scan retries with a fixed 2s delay until threads are found or max retries reached (Discord DOM takes time to render).

### Build & Bundling

- `idb` library is externalized to CDN (jsdelivr UMD) via `vite-plugin-monkey`, not bundled
- Production builds use Terser (mangle enabled, comments stripped, console preserved)
- Development builds (`build:dev`) skip minification
- All dynamic imports are inlined (`inlineDynamicImports: true`)

## Testing

Vitest with jsdom environment. Setup file (`src/test/setup.ts`) imports `@testing-library/jest-dom/vitest` for DOM matchers and `fake-indexeddb/auto` to polyfill IndexedDB. Coverage uses v8 provider, excludes test files and `src/main.tsx`.

## Key Implementation Details

### DOM Selectors (fragile -- coupled to Discord's DOM structure)

- Thread elements: `[data-list-item-id^="channels___"][aria-label*="(thread)"]`
- Thread ID: `data-list-item-id.split('___')[1]`
- Title: `aria-label` with `"unread, "` prefix and `" (thread)"` suffix stripped
- Parent channel: closest `ul[role="group"][aria-label*="threads"]`
- Server ID: `window.location.pathname.split('/')[2]`

**Note:** Discord does not currently use Shadow DOM for thread elements. Previous Shadow DOM query utilities were removed as they added unnecessary complexity and performance overhead without functional benefit. Standard `querySelector` and `closest` methods are sufficient.

### Storage

- Storage backend: IndexedDB via `idb` library (CDN-loaded, not bundled)
- Database name: `discord-thread-monitor`
- Object stores: `data` (main data), `prefs` (user preferences)
- Compression wrapper format: `{ compressed: boolean, data: string | base64 }`
- Backward-compatible deserialization handles old raw JSON format
- ThreadStore maintains three concerns: thread metadata, change history, blacklist (Set for O(1) lookup + array for persistence)
- PrefsStore provides singleton access to preferences (language, etc.)

### CSS Architecture

Plain CSS (no modules, no CSS-in-JS). All files in `src/styles/`, imported via `index.css`. Uses `:host` selector for Shadow DOM scoping.

- `tokens.css` -- Design tokens as CSS custom properties (`--tm-*` prefix): colors, typography, spacing, z-index, shadows, transitions
- Component-specific files: `panel.css`, `toggle-button.css`, `filters.css`, `thread-list.css`, `toast.css`, `debug.css`, `modal.css`

All new CSS must use existing `--tm-*` tokens from `tokens.css`.

### Internationalization

- `src/i18n.ts`: Chinese (zh) and English (en). Detection: browser language -> localStorage (`thread-monitor-language`) -> default zh
- Text substitution uses `'{n}'` placeholder pattern

### Userscript Metadata (vite-plugin-monkey)

- **Grants**: `none` (uses IndexedDB for storage)
- **Run-at**: `document-end`
- **Match**: `https://discord.com/*`
- **Version**: Dynamically read from `package.json` via `vite.config.ts` (never hardcoded)
- **Namespace**: `discord-thread-monitor`
- **Author**: RageNight

### Debug

- `src/debug/simulateTitleChange.ts` only available when `import.meta.env.DEV` is true
