import { useEffect, useState, useCallback } from 'react';
import type { ThreadStore } from '../core/ThreadStore';
import type { Notifier } from '../core/Notifier';
import type { TitleChange, MonitoredThread, ThreadChangeGroup, StorageInfo } from '../types';

const SCAN_INTERVAL_MS = 60000;

const defaultStorageInfo: StorageInfo = {
  rawSize: 0,
  compressedSize: 0,
  isCompressed: false,
  changeCount: 0,
  threadCount: 0,
};

interface UseAppDataProps {
  store: ThreadStore;
  notifier: Notifier;
  performScan: () => { currentThreads: MonitoredThread[]; changes: TitleChange[] };
}

// eslint-disable-next-line max-lines-per-function
export const useAppData = ({ store, notifier, performScan }: UseAppDataProps) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);
  const [pendingToasts, setPendingToasts] = useState<TitleChange[]>([]);
  const [retentionDays, setRetentionDays] = useState(store.getRetentionDays());
  const [changeGroups, setChangeGroups] = useState<ThreadChangeGroup[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo>(defaultStorageInfo);

  const refreshData = useCallback(() => {
    const dashboardData = store.getDashboardData();
    setUnseenCount(dashboardData.unseenCount);
    setChangeGroups(dashboardData.changeGroups);
    setStorageInfo(dashboardData.storageInfo);
  }, [store]);

  const handleNotification = useCallback(
    (change: TitleChange) => {
      setPendingToasts((prev) => [...prev, change]);
      refreshData();
    },
    [refreshData]
  );

  useEffect(() => {
    notifier.onNotify(handleNotification);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshData();
    return () => notifier.offNotify(handleNotification);
  }, [notifier, handleNotification, refreshData]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      performScan();
      refreshData();
    }, SCAN_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [performScan, refreshData]);

  return {
    isPanelOpen,
    setIsPanelOpen,
    unseenCount,
    pendingToasts,
    setPendingToasts,
    retentionDays,
    setRetentionDays,
    changeGroups,
    storageInfo,
    refreshData,
  };
};
