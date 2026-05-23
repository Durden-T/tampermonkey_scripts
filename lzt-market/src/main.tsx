import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const MOUNT_ID = 'lzt-cps-mount';
const ANCHOR_SELECTORS = [
  '.OrderByContainer',
  '#MarketSearchBar',
  '.searchBar',
];

function findAnchor(): HTMLElement | null {
  for (const sel of ANCHOR_SELECTORS) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) return el;
  }
  const sortLabel = Array.from(document.querySelectorAll('label')).find((l) =>
    /cheap first|expensive first|newest|oldest/i.test(l.textContent ?? ''),
  );
  return sortLabel?.closest<HTMLElement>('div, fieldset, form') ?? null;
}

function mount(anchor: HTMLElement) {
  if (document.getElementById(MOUNT_ID)) return;
  const host = document.createElement('div');
  host.id = MOUNT_ID;
  host.style.display = 'block';
  host.style.width = '100%';
  anchor.insertAdjacentElement('afterend', host);
  createRoot(host).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

function waitForAnchor(timeoutMs = 10_000): void {
  const start = Date.now();
  const tick = () => {
    const anchor = findAnchor();
    if (anchor) {
      mount(anchor);
      return;
    }
    if (Date.now() - start > timeoutMs) {
      console.warn('[lzt-cps] anchor element not found within %dms', timeoutMs);
      return;
    }
    requestAnimationFrame(tick);
  };
  tick();
}

waitForAnchor();
