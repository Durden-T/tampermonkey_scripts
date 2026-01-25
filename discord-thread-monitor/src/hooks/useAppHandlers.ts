import { useCallback } from 'react';
import type { ThreadStore } from '../core/ThreadStore';
import type { Notifier } from '../core/Notifier';
import type { TitleChange, MonitoredThread } from '../types';

interface UseAppHandlersProps {
  store: ThreadStore;
  notifier: Notifier;
  refreshData: () => void;
  setPendingToasts: React.Dispatch<React.SetStateAction<TitleChange[]>>;
  setRetentionDays: React.Dispatch<React.SetStateAction<number>>;
  performScan: () => { currentThreads: MonitoredThread[]; changes: TitleChange[] };
}

// eslint-disable-next-line max-lines-per-function
export const useAppHandlers = ({
  store,
  notifier,
  refreshData,
  setPendingToasts,
  setRetentionDays,
  performScan,
}: UseAppHandlersProps) => {
  const handleScanNow = useCallback(() => {
    performScan();
    refreshData();
  }, [performScan, refreshData]);

  const handleOpen = useCallback(
    (url: string, threadId: string) => {
      store.markChangeSeen(threadId);
      refreshData();
      window.location.href = url;
    },
    [store, refreshData]
  );

  const handleBlock = useCallback(
    (threadId: string) => {
      store.addToBlacklist(threadId);
      refreshData();
    },
    [store, refreshData]
  );

  const handleResume = useCallback(
    (threadId: string) => {
      store.removeFromBlacklist(threadId);
      refreshData();
    },
    [store, refreshData]
  );

  const handleClearChanges = useCallback(() => {
    store.clearChanges();
    refreshData();
  }, [store, refreshData]);

  const handleMarkAllRead = useCallback(() => {
    store.markAllChangesSeen();
    refreshData();
  }, [store, refreshData]);

  const handleRetentionChange = useCallback(
    (days: number) => {
      store.setRetentionDays(days);
      setRetentionDays(days);
      refreshData();
    },
    [store, setRetentionDays, refreshData]
  );

  const handleToastDismiss = useCallback(
    (threadId: string) => {
      setPendingToasts((prev) => prev.filter((toast) => toast.threadId !== threadId));
    },
    [setPendingToasts]
  );

  const handleToastNavigate = useCallback(
    (url: string, threadId: string) => {
      store.markChangeSeen(threadId);
      setPendingToasts((prev) => prev.filter((toast) => toast.threadId !== threadId));
      refreshData();
      window.location.href = url;
    },
    [store, setPendingToasts, refreshData]
  );

  const handleSimulateTitleChange = useCallback(() => {
    if (import.meta.env.DEV) {
      void import('../debug/simulateTitleChange').then(({ simulateTitleChange }) => {
        simulateTitleChange(store, notifier, refreshData);
      });
    }
  }, [store, notifier, refreshData]);

  return {
    handleScanNow,
    handleOpen,
    handleBlock,
    handleResume,
    handleClearChanges,
    handleMarkAllRead,
    handleRetentionChange,
    handleToastDismiss,
    handleToastNavigate,
    handleSimulateTitleChange,
  };
};
