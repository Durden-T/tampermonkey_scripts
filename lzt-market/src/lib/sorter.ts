import {
  CardData,
  LIST_CONTAINER_SELECTOR,
  decorateCard,
  detectCurrencySymbol,
  extractCardData,
  stripDecoration,
} from './cards';
import { fetchPages } from './fetcher';
import { sanitizeElement, sanitizeHtmlString } from './sanitize';

const CONCURRENCY = 3;

export interface SortOutcome {
  total: number;
  withChamps: number;
  failedPages: number[];
  currencySymbol: string;
  bestRatio: number;
  medianRatio: number;
  worstRatio: number;
}

let savedOriginalHTML: string | null = null;
let snapshotContainerRef: WeakRef<HTMLElement> | null = null;

function getContainer(): HTMLElement | null {
  return document.querySelector<HTMLElement>(LIST_CONTAINER_SELECTOR);
}

function pageNavRoot(container: HTMLElement): ParentNode {
  return container.closest('.marketIndex--itemsContainer') ?? container.parentElement ?? document;
}

function setPageNavHidden(container: HTMLElement, hidden: boolean): void {
  for (const nav of pageNavRoot(container).querySelectorAll('.PageNav')) {
    if (hidden) nav.setAttribute('hidden', '');
    else nav.removeAttribute('hidden');
  }
}

export function hasOriginalSnapshot(): boolean {
  if (savedOriginalHTML === null) return false;
  // Drop snapshot if its container is gone or has been replaced by a re-render.
  const current = getContainer();
  if (!current || snapshotContainerRef?.deref() !== current) {
    savedOriginalHTML = null;
    snapshotContainerRef = null;
    return false;
  }
  return true;
}

function snapshotOriginal(container: HTMLElement): void {
  if (snapshotContainerRef?.deref() === container && savedOriginalHTML !== null) return;
  savedOriginalHTML = sanitizeHtmlString(container.innerHTML);
  snapshotContainerRef = new WeakRef(container);
}

export function restoreOriginal(): boolean {
  const container = getContainer();
  if (!container || savedOriginalHTML === null) return false;
  container.innerHTML = savedOriginalHTML;
  savedOriginalHTML = null;
  snapshotContainerRef = null;
  setPageNavHidden(container, false);
  return true;
}

function computeStats(cards: CardData[]): {
  best: number;
  median: number;
  worst: number;
} {
  const ratios = cards
    .filter((c) => c.champCount > 0 && Number.isFinite(c.ratio))
    .map((c) => c.ratio)
    .sort((a, b) => a - b);
  if (ratios.length === 0) return { best: 0, median: 0, worst: 0 };
  const best = ratios[0];
  const worst = ratios[ratios.length - 1];
  const mid = Math.floor(ratios.length / 2);
  const median =
    ratios.length % 2 === 0 ? (ratios[mid - 1] + ratios[mid]) / 2 : ratios[mid];
  return { best, median, worst };
}

export interface RunSortOptions {
  pages: number;
  signal: AbortSignal;
  onProgress: (done: number, total: number) => void;
}

export async function runSort(opts: RunSortOptions): Promise<SortOutcome> {
  const container = getContainer();
  if (!container) throw new Error('listing container not found on page');

  // Detect currency from the live page BEFORE we clear the container.
  const symbol = detectCurrencySymbol(container);
  snapshotOriginal(container);

  const pageNums = Array.from({ length: opts.pages }, (_, i) => i + 1);
  let outcome;
  try {
    outcome = await fetchPages(pageNums, CONCURRENCY, opts.signal, opts.onProgress);
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new Error(`fetch failed: ${(err as Error).message}`);
  }

  const seen = new Set<string>();
  const cards: CardData[] = [];
  for (const r of outcome.results) {
    if (!r) continue;
    for (const cardEl of r.cards) {
      if (!cardEl.id || seen.has(cardEl.id)) continue;
      seen.add(cardEl.id);
      sanitizeElement(cardEl);
      cards.push(extractCardData(cardEl));
    }
  }

  cards.sort((a, b) => {
    if (a.ratio !== b.ratio) return a.ratio - b.ratio;
    if (a.price !== null && b.price !== null) return a.price - b.price;
    if (a.price !== null) return -1;
    if (b.price !== null) return 1;
    return 0;
  });

  container.replaceChildren();
  for (const c of cards) {
    decorateCard(c.el, c, symbol);
    container.appendChild(c.el);
  }
  setPageNavHidden(container, true);

  const { best, median, worst } = computeStats(cards);

  return {
    total: cards.length,
    withChamps: cards.filter((c) => c.champCount > 0).length,
    failedPages: outcome.failedPages,
    currencySymbol: symbol,
    bestRatio: best,
    medianRatio: median,
    worstRatio: worst,
  };
}

export function cleanupDecorations(): void {
  document
    .querySelectorAll<HTMLElement>('.marketIndexItem')
    .forEach(stripDecoration);
}
