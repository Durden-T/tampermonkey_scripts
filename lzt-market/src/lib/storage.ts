const NS = 'lzt-cps:';

function hasGm(): boolean {
  return typeof GM_setValue === 'function' && typeof GM_getValue === 'function';
}

export function loadNumber(key: string, fallback: number): number {
  if (hasGm()) {
    const raw = GM_getValue(NS + key, fallback) as number | string;
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }
  const raw = localStorage.getItem(NS + key);
  if (raw === null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function saveNumber(key: string, value: number): void {
  if (hasGm()) GM_setValue(NS + key, value);
  else localStorage.setItem(NS + key, String(value));
}
