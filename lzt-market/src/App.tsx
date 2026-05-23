import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadNumber, saveNumber } from './lib/storage';
import {
  cleanupDecorations,
  hasOriginalSnapshot,
  restoreOriginal,
  runSort,
  SortOutcome,
} from './lib/sorter';
import { formatRatio } from './lib/format';
import './styles.css';

const PAGES_KEY = 'pages';
const DEFAULT_PAGES = 5;
const MAX_PAGES = 50;
const SOFT_WARN_PAGES = 20;

type Status =
  | { kind: 'idle' }
  | { kind: 'loading'; done: number; total: number }
  | { kind: 'done'; outcome: SortOutcome }
  | { kind: 'err'; msg: string }
  | { kind: 'restored' };

function statusText(s: Status): string {
  switch (s.kind) {
    case 'idle':
      return 'standby — input range and execute';
    case 'loading':
      return `scanning page ${s.done.toString().padStart(2, '0')} of ${s.total
        .toString()
        .padStart(2, '0')}`;
    case 'done': {
      const base = `${s.outcome.total} listings ranked · ${s.outcome.withChamps} with champion data`;
      const failed = s.outcome.failedPages.length;
      return failed > 0 ? `${base} · ${failed} page${failed === 1 ? '' : 's'} failed` : base;
    }
    case 'err':
      return `error — ${s.msg}`;
    case 'restored':
      return 'restored to original ordering';
  }
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const text = useMemo(() => {
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    const ss = now.getSeconds().toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }, [now]);
  return (
    <span className="cps-header-clock" aria-label="local time">
      {text}
    </span>
  );
}

export default function App() {
  const [pages, setPages] = useState<number>(() => loadNumber(PAGES_KEY, DEFAULT_PAGES));
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [sorted, setSorted] = useState<boolean>(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    saveNumber(PAGES_KEY, pages);
  }, [pages]);

  const clampPages = useCallback((next: number): number => {
    if (!Number.isFinite(next)) return DEFAULT_PAGES;
    return Math.min(MAX_PAGES, Math.max(1, Math.floor(next)));
  }, []);

  const onSort = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus({ kind: 'loading', done: 0, total: pages });
    try {
      const outcome = await runSort({
        pages,
        signal: ctrl.signal,
        onProgress: (done, total) => setStatus({ kind: 'loading', done, total }),
      });
      setStatus({ kind: 'done', outcome });
      setSorted(true);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setStatus({ kind: 'err', msg: (err as Error).message });
    }
  }, [pages]);

  const onRestore = useCallback(() => {
    abortRef.current?.abort();
    cleanupDecorations();
    const ok = restoreOriginal();
    setSorted(false);
    setStatus(ok ? { kind: 'restored' } : { kind: 'idle' });
  }, []);

  const loading = status.kind === 'loading';
  const warn = pages > SOFT_WARN_PAGES;
  const canRestore = sorted || hasOriginalSnapshot();
  const progress =
    status.kind === 'loading' && status.total > 0
      ? Math.round((status.done / status.total) * 100)
      : 0;

  return (
    <div className="lzt-cps-panel" role="region" aria-label="Cost-per-champion sort">
      <header className="cps-header">
        <div className="cps-header-title">
          <span className="cps-header-mark">LZT · CPS</span>
          <span className="cps-header-rule" aria-hidden="true" />
          <span className="cps-header-name">cost per champion</span>
        </div>
        <div className="cps-header-meta">
          <span className="cps-header-mod">
            mod. <b>CPS-01</b>
          </span>
          <Clock />
        </div>
      </header>

      <div className="cps-controls">
        <div className="cps-stepper">
          <label className="cps-stepper-label" htmlFor="cps-pages-input">
            page range
          </label>
          <div className="cps-stepper-body">
            <button
              type="button"
              className="cps-step"
              aria-label="Decrease page count"
              onClick={() => setPages((p) => clampPages(p - 1))}
              disabled={loading || pages <= 1}
            >
              ◂
            </button>
            <input
              id="cps-pages-input"
              type="number"
              className="cps-stepper-input"
              min={1}
              max={MAX_PAGES}
              value={pages}
              disabled={loading}
              onChange={(e) => setPages(clampPages(Number(e.target.value)))}
            />
            <button
              type="button"
              className="cps-step"
              aria-label="Increase page count"
              onClick={() => setPages((p) => clampPages(p + 1))}
              disabled={loading || pages >= MAX_PAGES}
            >
              ▸
            </button>
          </div>
          <div className="cps-stepper-meta" data-warn={warn || undefined}>
            <span>{warn ? 'caution · heavy fetch' : 'pages to aggregate'}</span>
            <span>max {MAX_PAGES.toString().padStart(2, '0')}</span>
          </div>
        </div>

        <button
          type="button"
          className="cps-action"
          onClick={onSort}
          disabled={loading}
        >
          <span className="cps-action-glyph" aria-hidden="true">
            {loading ? '◴' : '◆'}
          </span>
          <span className="cps-action-label">
            {loading ? 'scanning' : 'execute sort'}
          </span>
        </button>

        <div className="cps-status">
          <div className="cps-status-head">
            <span className="cps-led" data-kind={status.kind} aria-hidden="true" />
            <span>
              channel · {loading ? `${progress.toString().padStart(2, '0')}%` : 'idle'}
            </span>
          </div>
          <div className="cps-status-body" aria-live="polite">
            <span className="cps-status-prompt" aria-hidden="true">
              &gt;
            </span>
            <span className="cps-status-msg" data-kind={status.kind}>
              {statusText(status)}
              {loading && <span className="cps-status-cursor" aria-hidden="true" />}
            </span>
          </div>
          {loading && (
            <div className="cps-progress" aria-hidden="true">
              <div className="cps-progress-fill" style={{ width: `${progress}%` }} />
              <div className="cps-progress-ticks" />
            </div>
          )}
        </div>

        {canRestore && (
          <button
            type="button"
            className="cps-restore"
            onClick={onRestore}
            disabled={loading}
          >
            <span className="cps-restore-glyph" aria-hidden="true">
              ↺
            </span>
            <span>restore</span>
          </button>
        )}
      </div>

      {status.kind === 'done' && <StatsGrid outcome={status.outcome} />}
    </div>
  );
}

function StatsGrid({ outcome }: { outcome: SortOutcome }) {
  const sym = outcome.currencySymbol || '';
  const hasData = outcome.withChamps > 0;
  return (
    <div className="cps-stats" role="group" aria-label="Sort results">
      <Stat
        label="listings"
        value={outcome.total.toLocaleString()}
        sub={`${outcome.withChamps} with champ data`}
      />
      <Stat
        label="best ratio"
        value={hasData ? formatRatio(outcome.bestRatio, sym) : '—'}
        unit={hasData ? '/ champ' : undefined}
        accent
      />
      <Stat
        label="median"
        value={hasData ? formatRatio(outcome.medianRatio, sym) : '—'}
        unit={hasData ? '/ champ' : undefined}
      />
      <Stat
        label="worst ratio"
        value={hasData ? formatRatio(outcome.worstRatio, sym) : '—'}
        unit={hasData ? '/ champ' : undefined}
        dim
      />
    </div>
  );
}

interface StatProps {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  accent?: boolean;
  dim?: boolean;
}

function Stat({ label, value, unit, sub, accent, dim }: StatProps) {
  return (
    <div className="cps-stat">
      <div className="cps-stat-label">{label}</div>
      <div
        className="cps-stat-value"
        data-accent={accent || undefined}
        data-dim={dim || undefined}
      >
        <span>{value}</span>
        {unit && <span className="cps-stat-unit">{unit}</span>}
      </div>
      {sub && <div className="cps-stat-sub">{sub}</div>}
    </div>
  );
}
