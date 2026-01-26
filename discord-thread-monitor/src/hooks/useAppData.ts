import { useState, useCallback } from 'react';
import type { ThreadStore } from '../core/ThreadStore';
import type { Notifier } from '../core/Notifier';
import type { ScanScheduler } from '../core/ScanScheduler';
import type { TitleChange, MonitoredThread } from '../types';
import { useDashboardData } from './useDashboardData';
import { useNotificationListener } from './useNotificationListener';
import { useScanInterval } from './useScanInterval';
import { useNavigationScan } from './useNavigationScan';

interface UseAppDataProps {
  store: ThreadStore;
  notifier: Notifier;
  scheduler: ScanScheduler;
  performScan: () => { currentThreads: MonitoredThread[]; changes: TitleChange[] };
}

export const useAppData = ({ store, notifier, scheduler, performScan }: UseAppDataProps) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [pendingToasts, setPendingToasts] = useState<TitleChange[]>([]);
  const [retentionDays, setRetentionDays] = useState(store.getRetentionDays());

  const { unseenCount, changeGroups, storageInfo, refreshData } = useDashboardData(store);

  const handleNotification = useCallback(
    (change: TitleChange) => {
      setPendingToasts((prev) => [...prev, change]);
      refreshData();
    },
    [refreshData]
  );

  useNotificationListener(notifier, handleNotification, refreshData);
  useScanInterval(scheduler, performScan, refreshData);
  useNavigationScan(scheduler, performScan, refreshData);

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
