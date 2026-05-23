# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project shape

A single-page **Tampermonkey/Greasemonkey userscript** bundled by `vite-plugin-monkey`. The build produces one self-contained `.user.js` from a React 19 + TypeScript source tree. The script is injected into `https://lzt.market/riot/league-of-legends*` and adds an inline panel that fetches multiple paginated listing pages, aggregates them, sorts by price-per-champion, and decorates each card with a ratio badge.

There is no test runner, no linter config, and no backend. Output is a userscript file that a user installs into Tampermonkey/Violentmonkey.

## Commands

Uses **pnpm** (see `pnpm-lock.yaml`).

- `pnpm dev` — Vite dev server. `vite-plugin-monkey` serves a `.user.js` shim that proxies the live `match` URL through the dev server; install the shim once in your userscript manager, then edits hot-reload while browsing `lzt.market`.
- `pnpm build` — runs `tsc` (project references, type-check only, `noEmit`) then `vite build`. Final artifact: `dist/lzt-market.user.js` (install in a userscript manager).
- `pnpm preview` — serves the built `dist/` output.

No `test` or `lint` script exists.

## Architecture

### Bundling and injection (`vite.config.ts`, `src/main.tsx`)

`vite-plugin-monkey` wraps `src/main.tsx` as the userscript entry. The plugin generates the `// ==UserScript==` header from the `userscript` block in `vite.config.ts` — that block is the source of truth for `match`, `grant`, `run-at`, version, etc. Changing the match URL or granted GM APIs requires editing it there.

`main.tsx` waits for one of several anchor elements (`.OrderByContainer`, `#MarketSearchBar`, `.searchBar`, or a sort-label fallback) via `requestAnimationFrame` polling with a 10s timeout, then mounts the React app into a sibling `<div id="lzt-cps-mount">`. The site DOM is jQuery-XF and re-renders on navigation; the polling/timeout pattern is deliberate — don't replace it with a one-shot `DOMContentLoaded` listener.

### Sort pipeline (`src/lib/sorter.ts`)

`runSort` orchestrates one click of the "Sort" button:

1. **Snapshot** the listing container's `innerHTML` into a module-level `savedOriginalHTML` (only the first time — subsequent sorts keep the original snapshot, so Restore always returns to the pre-sort state).
2. **Fetch** N pages concurrently (`CONCURRENCY = 3`).
3. **Dedupe** cards by their DOM `id` (listings can appear on multiple pages during pagination drift).
4. **Sort** by `ratio` (price / champCount), tiebreak on raw price; cards with no champion data get `ratio = +Infinity` and sink to the bottom.
5. **Replace** the container's children with the sorted, decorated cards and hide `.PageNav` (the aggregated view spans many pages, so the original paginator is meaningless).

`restoreOriginal` writes the snapshot back and un-hides `.PageNav`. The snapshot is **only cleared on restore** — closing/reopening the panel preserves it, which is why `hasOriginalSnapshot()` is exported and the Restore button is shown whenever a snapshot exists, even if React state thinks `sorted === false`.

### Fetch + retry (`src/lib/fetcher.ts`)

`fetchPages` runs a fixed pool of N workers (worker count = `min(concurrency, total)`) draining a shared queue. Each `fetchPage` retries on failure with exponential backoff `[1s, 2s, 4s]` (max 4 attempts total) and aborts immediately if the `AbortSignal` fires.

`buildPageUrl` preserves the current querystring filters (price range, region, etc.) and only swaps the `page` param. **Do not** rebuild URLs from scratch — users rely on their current filters being applied across all aggregated pages.

Responses are parsed with `DOMParser` and queried for `.marketIndexItem` nodes. The fetched HTML nodes are imported live into the page (`container.appendChild`) — they came from a separate `Document`, but `appendChild` adopts them automatically; **do not** clone them or you lose any per-node state set by the site.

### Card parsing (`src/lib/cards.ts`)

`extractCardData` reads:
- Price from `.marketIndexItem--Price .Value[data-value]` (the `data-value` attribute is the raw number; the displayed text is locale-formatted).
- Champion count from a badge group that contains `.badgeIc-lol`, matched by a multilingual regex `(\d+)\s+(characters?|champions?|чемпион|персонаж)`. If you add languages, extend `CHAMP_RE`.

`detectCurrencySymbol` reads the currency icon's CSS class (`svgIcon--<code>`) and maps to a glyph. Unmapped codes fall back to uppercase. Currency is detected once per sort run; the site uses a single currency per session, so this is fine.

`decorateCard` appends a `.lzt-cps-ratio-badge` to each card; cards with no champion data get a different badge variant (`data-empty="true"`). `stripDecoration` removes it (used by `cleanupDecorations` on Restore — though Restore replaces innerHTML anyway, this is defensive cleanup).

### Storage (`src/lib/storage.ts`)

A thin layer over `GM_setValue` / `GM_getValue` with a `localStorage` fallback for the Vite dev server (where GM APIs aren't granted). Currently used only to persist the "pages" input value. The `lzt-cps:` namespace prefix is applied automatically — pass bare keys.

## Conventions to preserve

- **Selectors are load-bearing.** All CSS selectors targeting lzt.market DOM are in `cards.ts` (`CARD_SELECTOR`, `LIST_CONTAINER_SELECTOR`) and `main.tsx` (`ANCHOR_SELECTORS`). When the site changes its markup, those are the only files to edit.
- The site's listing container is `.marketIndex--itemsContainer form.InlineModForm` — the `form` wrapper is the actual children parent, not the outer div. Keep it.
- `vite-plugin-monkey/client` types are referenced in `src/vite-env.d.ts`, which is why `GM_setValue` / `GM_getValue` are globally typed without explicit imports.
- TypeScript is strict + `noUnusedLocals` + `noUnusedParameters`. The `build` script type-checks before bundling, so a broken type fails the build.
