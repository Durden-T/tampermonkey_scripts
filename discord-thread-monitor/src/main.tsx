import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThreadStore } from './core/ThreadStore';
import { ThreadScanner } from './core/ThreadScanner';
import { ChangeDetector } from './core/ChangeDetector';
import { Notifier } from './core/Notifier';

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
      return { currentThreads, changes };
    } catch (err) {
      console.error('[Discord Thread Monitor] Scan error:', err);
      return { currentThreads: [], changes: [] };
    }
  };

  return { store, notifier, performScan };
};

const setupContainer = () => {
  const container = document.createElement('div');
  container.id = 'thread-monitor-root';
  document.body.append(container);
  console.log('[Discord Thread Monitor] Container created');
  return container;
};

function initializeMonitor() {
  console.log('[Discord Thread Monitor] Initializing...');
  if (initialized) {
    console.log('[Discord Thread Monitor] Already initialized, skipping');
    return;
  }
  initialized = true;

  try {
    const { store, notifier, performScan } = setupCoreServices();
    const container = setupContainer();

    ReactDOM.createRoot(container).render(
      <React.StrictMode>
        <App store={store} notifier={notifier} performScan={performScan} />
      </React.StrictMode>
    );
    console.log('[Discord Thread Monitor] React app rendered');

    setTimeout(() => {
      performScan();
    }, 2000);
  } catch (err) {
    console.error('[Discord Thread Monitor] Initialization error:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMonitor);
} else {
  initializeMonitor();
}
