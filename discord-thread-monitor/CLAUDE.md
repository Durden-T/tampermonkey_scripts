# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Tampermonkey userscript that monitors Discord forum thread titles for changes. Built with React 19 and Vite, using the `vite-plugin-monkey` plugin to output a Tampermonkey-compatible userscript.

## Commands

```bash
npm run dev      # Start dev server with hot reload (auto-installs script in Tampermonkey)
npm run build    # Build production userscript to dist/
npm run preview  # Preview production build
```

## Architecture

### Core Layer (`src/core/`)

Four classes with distinct responsibilities:

- **ThreadStore** - Persistence layer using `GM_getValue`/`GM_setValue`. Manages threads, changes, and blacklist data
- **ThreadScanner** - DOM scraper that parses Discord's thread list elements via `aria-label` attributes and `data-list-item-id`
- **ChangeDetector** - Compares current scan results against stored data, generates `TitleChange` objects
- **Notifier** - Simple pub/sub for propagating change events to UI

### Data Flow

```
ThreadScanner.scanVisibleThreads()
    -> ChangeDetector.detectChanges()
    -> ThreadStore.addChange() + Notifier.notifyAll()
    -> React UI updates via callbacks
```

### UI Layer (`src/components/`)

React components for the overlay UI:

- **ManagerPanel** - Main panel with tabs (changes/monitoring/blacklist)
- **ThreadList/ThreadItem** - Display thread data with actions
- **ToggleButton** - Floating button showing unseen count
- **ToastContainer** - Pop-up notifications for new changes

### Entry Point

`src/main.tsx` initializes all core classes, performs initial scan after 2s delay, and mounts React app to an injected container.

## Key Implementation Details

- Thread IDs extracted from `data-list-item-id="channels___<threadId>"` attributes
- Titles parsed from `aria-label` attributes (format: `[unread, ]<title> (thread)`)
- Parent channel detected via closest `ul[role="group"][aria-label*="threads"]`
- All persistent data stored in single JSON blob under `discord-thread-monitor-data` key
- UI text in Chinese (`src/i18n.ts`)
