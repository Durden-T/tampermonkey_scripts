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
npm run lint          # Check code for lint errors (fails on warnings)
npm run lint:fix      # Auto-fix fixable lint issues
npm run format        # Format code with Prettier
npm run format:check  # Check formatting without fixing
```

## Code Quality

### Linting

ESLint + Prettier configured with TypeScript and React support.

**Key rules enforced:**
- Complexity ≤ 15 (warn)
- Max function parameters ≤ 5 (warn)
- Max file lines ≤ 600 (warn)
- No unused variables (error, prefix with `_` to allow)
- No duplicate imports (error)
- Prefer const over let (error)
- Strict equality (===) required (error)

**TypeScript:**
- No explicit `any` types (warn)
- No floating promises (warn)
- Unsafe operations disabled (too strict for practical dev)

**Test files relaxed:**
- No line limits for test files
- `any` types allowed
- Non-null assertions allowed

**Prettier:**
- Single quotes, semicolons required
- 2-space indentation
- 100-char line width
- Trailing commas in ES5
- Arrow function parens always

**Auto-formatting:**
- Pre-commit hook automatically runs ESLint --fix and Prettier on staged files
- Git hook configured at repo root (../.husky/pre-commit)
- Manual formatting: `npm run format`

## Architecture

### Core Layer (`src/core/`)

- **ThreadStore** - Persistence via `GM_getValue`/`GM_setValue`. Auto-compresses data with pako when exceeding 50KB
- **ThreadScanner** - DOM scraper parsing Discord's `aria-label` and `data-list-item-id` attributes
- **ChangeDetector** - Compares scans against stored data, generates `TitleChange` records
- **Notifier** - Pub/sub for propagating changes to UI

### Data Flow

```
ThreadScanner.scanVisibleThreads()
    -> ChangeDetector.detectChanges()
    -> ThreadStore.addChange() + Notifier.notifyAll()
    -> React UI updates via callbacks
```

### UI Layer (`src/components/`)

- **ManagerPanel** - Main panel with tabs (changes/monitoring/blacklist)
- **ToggleButton** - Floating button showing unseen count
- **ToastContainer** - Pop-up notifications for new changes

### Entry Point

`src/main.tsx` initializes core classes, performs initial scan after 2s delay, mounts React to injected container.

## Testing

Tests use Vitest with jsdom. The setup file (`src/test/setup.ts`) mocks `localStorage` which ThreadStore uses as a fallback when GM APIs are unavailable.

## Key Implementation Details

- Thread IDs: extracted from `data-list-item-id="channels___<threadId>"`
- Titles: parsed from `aria-label` (format: `[unread, ]<title> (thread)`)
- Parent channel: detected via closest `ul[role="group"][aria-label*="threads"]`
- Storage key: `discord-thread-monitor-data`
- Compression: pako gzip at 50KB threshold, warning at 200KB
- UI text in Chinese (`src/i18n.ts`)
