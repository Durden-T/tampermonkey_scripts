import { CARD_SELECTOR } from './cards';

const RETRY_DELAYS_MS = [1000, 2000, 4000];
const REQUEST_TIMEOUT_MS = 15_000;

export interface PageResult {
  page: number;
  cards: HTMLElement[];
}

export interface FetchPagesOutcome {
  results: (PageResult | null)[];
  failedPages: number[];
}

function buildPageUrl(page: number): string {
  const base = new URL(location.pathname, location.origin);
  const params = new URLSearchParams(location.search);
  params.delete('page');
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `${base.pathname}?${qs}` : base.pathname;
}

function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(new DOMException('aborted', 'AbortError'));
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('aborted', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function combineSignals(userSignal: AbortSignal, timeoutMs: number): AbortSignal {
  const anyFn = (AbortSignal as unknown as { any?: (signals: AbortSignal[]) => AbortSignal }).any;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  if (typeof anyFn === 'function') return anyFn([userSignal, timeoutSignal]);
  const ctrl = new AbortController();
  const forward = (sig: AbortSignal) => {
    if (sig.aborted) ctrl.abort(sig.reason);
    else sig.addEventListener('abort', () => ctrl.abort(sig.reason), { once: true });
  };
  forward(userSignal);
  forward(timeoutSignal);
  return ctrl.signal;
}

async function fetchPage(page: number, signal: AbortSignal): Promise<PageResult> {
  const url = buildPageUrl(page);
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (signal.aborted) throw new DOMException('aborted', 'AbortError');
    const reqSignal = combineSignals(signal, REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, { credentials: 'same-origin', signal: reqSignal });
      if (!res.ok) throw new Error(`HTTP ${res.status} on page ${page}`);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const cards = Array.from(doc.querySelectorAll<HTMLElement>(CARD_SELECTOR));
      return { page, cards };
    } catch (err) {
      if (signal.aborted) throw new DOMException('aborted', 'AbortError');
      lastErr = err;
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay == null) break;
      await abortableSleep(delay, signal);
    }
  }
  throw lastErr ?? new Error(`page ${page} failed`);
}

export async function fetchPages(
  pages: number[],
  concurrency: number,
  signal: AbortSignal,
  onProgress: (done: number, total: number) => void,
): Promise<FetchPagesOutcome> {
  const total = pages.length;
  let done = 0;
  const results: (PageResult | null)[] = new Array(total).fill(null);
  const failedPages: number[] = [];
  const queue = pages.map((p, idx) => ({ page: p, idx }));

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const job = queue.shift();
      if (!job) return;
      try {
        results[job.idx] = await fetchPage(job.page, signal);
      } catch (err) {
        if ((err as Error).name === 'AbortError') throw err;
        failedPages.push(job.page);
      }
      done += 1;
      onProgress(done, total);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, total) }, worker);
  await Promise.all(workers);
  failedPages.sort((a, b) => a - b);
  return { results, failedPages };
}
