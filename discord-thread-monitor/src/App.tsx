import { useEffect, useState, useCallback } from 'react';
import { ManagerPanel } from './components/ManagerPanel';
import { ToggleButton } from './components/ToggleButton';
import { ToastContainer } from './components/ToastContainer';
import type { ThreadStore } from './core/ThreadStore';
import type { Notifier } from './core/Notifier';
import type { TitleChange, MonitoredThread, ThreadChangeGroup, StorageInfo } from './types';

interface AppProps {
  store: ThreadStore;
  notifier: Notifier;
  performScan: () => { currentThreads: MonitoredThread[]; changes: TitleChange[] };
}

const SCAN_INTERVAL_MS = 60000;

const defaultStorageInfo: StorageInfo = {
  rawSize: 0,
  compressedSize: 0,
  isCompressed: false,
  changeCount: 0,
  threadCount: 0,
};

function App({ store, notifier, performScan }: AppProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);
  const [pendingToasts, setPendingToasts] = useState<TitleChange[]>([]);
  const [retentionDays, setRetentionDays] = useState(store.getRetentionDays());
  const [changeGroups, setChangeGroups] = useState<ThreadChangeGroup[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo>(defaultStorageInfo);

  const refreshData = useCallback(() => {
    setUnseenCount(store.getUnseenChangesCount());
    setChangeGroups(store.getChangesGroupedByThread());
    setStorageInfo(store.getStorageInfo());
  }, [store]);

  useEffect(() => {
    const callback = (change: TitleChange) => {
      setPendingToasts((prev) => [...prev, change]);
      refreshData();
    };

    notifier.onNotify(callback);
    refreshData();

    return () => notifier.offNotify(callback);
  }, [notifier, refreshData]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      performScan();
      refreshData();
    }, SCAN_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [performScan, refreshData]);

  const handleScanNow = () => {
    performScan();
    refreshData();
  };

  const handleOpen = (url: string, threadId: string) => {
    store.markChangeSeen(threadId);
    refreshData();
    window.location.href = url;
  };

  const handleBlock = (threadId: string) => {
    store.addToBlacklist(threadId);
    refreshData();
  };

  const handleResume = (threadId: string) => {
    store.removeFromBlacklist(threadId);
    refreshData();
  };

  const handleClearChanges = () => {
    store.clearChanges();
    refreshData();
  };

  const handleMarkAllRead = () => {
    store.markAllChangesSeen();
    refreshData();
  };

  const handleRetentionChange = (days: number) => {
    store.setRetentionDays(days);
    setRetentionDays(days);
    refreshData();
  };

  const handleToastDismiss = (threadId: string) => {
    setPendingToasts((prev) => prev.filter((toast) => toast.threadId !== threadId));
  };

  const handleToastNavigate = (url: string, threadId: string) => {
    store.markChangeSeen(threadId);
    setPendingToasts((prev) => prev.filter((toast) => toast.threadId !== threadId));
    refreshData();
    window.location.href = url;
  };

  const handleSimulateTitleChange = useCallback(() => {
    if (import.meta.env.DEV) {
      void import('./debug/simulateTitleChange').then(({ simulateTitleChange }) => {
        simulateTitleChange(store, notifier, refreshData);
      });
    }
  }, [store, notifier, refreshData]);

  return (
    <>
      <ToggleButton unseenCount={unseenCount} onClick={() => setIsPanelOpen(!isPanelOpen)} />

      <ManagerPanel
        isOpen={isPanelOpen}
        threads={Object.values(store.getThreads())}
        changes={store.getChanges()}
        changeGroups={changeGroups}
        blacklistedThreads={store.getBlacklistedThreads()}
        unseenCount={unseenCount}
        retentionDays={retentionDays}
        storageInfo={storageInfo}
        onClose={() => setIsPanelOpen(false)}
        onScanNow={handleScanNow}
        onOpen={handleOpen}
        onBlock={handleBlock}
        onResume={handleResume}
        onClearChanges={handleClearChanges}
        onMarkAllRead={handleMarkAllRead}
        onSimulateTitleChange={handleSimulateTitleChange}
        onRetentionChange={handleRetentionChange}
      />

      <ToastContainer
        changes={pendingToasts}
        threads={store.getThreads()}
        onDismiss={handleToastDismiss}
        onNavigate={handleToastNavigate}
      />
    </>
  );
}

export default App;
