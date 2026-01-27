import { useCallback } from 'react';
import type { ThreadStore } from '../core/ThreadStore';
import type { MonitoredThread, TitleChange } from '../types';

interface UseStoreActionsProps {
  store: ThreadStore;
  refreshData: () => void;
  performScan: () => { currentThreads: MonitoredThread[]; changes: TitleChange[] };
}

export const useStoreActions = ({ store, refreshData, performScan }: UseStoreActionsProps) => {
  const handleScanNow = useCallback(() => {
    performScan();
    refreshData();
  }, [performScan, refreshData]);

  const handleMarkAllRead = useCallback(() => {
    store.markAllChangesSeen();
    refreshData();
  }, [store, refreshData]);

  return {
    handleScanNow,
    handleMarkAllRead,
  };
};
