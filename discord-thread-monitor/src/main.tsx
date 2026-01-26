import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThreadStore } from './core/ThreadStore';
import { ThreadScanner } from './core/ThreadScanner';
import { ChangeDetector } from './core/ChangeDetector';
import { Notifier } from './core/Notifier';
import { scanStatus } from './core/ScanStatus';
import { TIMING } from './constants';
import styles from './styles/index.css?inline';

console.log('[Discord Thread Monitor] Script loaded');

let initialized = false;

const setupCoreServices = () => {
  const store = new ThreadStore();
  const scanner = new ThreadScanner();
  const detector = new ChangeDetector(store);
  const notifier = new Notifier();

  const performScan = () => {
    try {
      const currentThreads = scanner.scanVisibleThreads();
      const changes = detector.detectAndPersistChanges(currentThreads);
      if (changes.length > 0) {
        notifier.notifyAll(changes);
      }
      scanStatus.recordSuccess();
      return { currentThreads, changes };
    } catch (err) {
      scanStatus.recordError(err);
      return { currentThreads: [], changes: [] };
    }
  };

  return { store, notifier, performScan };
};

const setupShadowContainer = () => {
  const host = document.createElement('div');
  host.id = 'thread-monitor-host';
  host.style.position = 'fixed';
  host.style.top = '0';
  host.style.left = '0';
  host.style.width = '0';
  host.style.height = '0';
  host.style.overflow = 'visible';
  host.style.zIndex = '99999';
  document.body.append(host);

  const shadow = host.attachShadow({ mode: 'open' });

  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  shadow.appendChild(styleElement);

  const container = document.createElement('div');
  container.id = 'thread-monitor-root';
  shadow.appendChild(container);

  console.log('[Discord Thread Monitor] Shadow DOM container created');
  return container;
};

function initializeMonitor() {
  console.log('[Discord Thread Monitor] Initializing...');
  if (initialized) {
    console.log('[Discord Thread Monitor] Already initialized, skipping');
    return;
  }

  try {
    const { store, notifier, performScan } = setupCoreServices();
    const container = setupShadowContainer();

    ReactDOM.createRoot(container).render(
      <React.StrictMode>
        <ErrorBoundary>
          <App store={store} notifier={notifier} performScan={performScan} />
        </ErrorBoundary>
      </React.StrictMode>
    );
    console.log('[Discord Thread Monitor] React app rendered');

    const scheduleInitialScan = (attempt: number = 0) => {
      const delay = TIMING.INITIAL_SCAN_DELAY_MS * (attempt + 1);
      setTimeout(() => {
        const { currentThreads } = performScan();
        if (currentThreads.length === 0 && attempt < TIMING.INITIAL_SCAN_MAX_RETRIES) {
          scheduleInitialScan(attempt + 1);
        }
      }, delay);
    };
    scheduleInitialScan();

    window.addEventListener('beforeunload', () => store.flush());

    initialized = true;
    console.log('[Discord Thread Monitor] Initialization complete');
  } catch (err) {
    console.error('[Discord Thread Monitor] Initialization failed:', err);
    console.error('[Discord Thread Monitor] The script will not retry automatically');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMonitor);
} else {
  initializeMonitor();
}
