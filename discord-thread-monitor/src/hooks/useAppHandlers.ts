import { useCallback } from 'react';
import type { ThreadStore } from '../core/ThreadStore';
import type { Notifier } from '../core/Notifier';
import type { TitleChange, MonitoredThread } from '../types';
import { useThreadHandlers } from './useThreadHandlers';
import { useSettingsHandlers } from './useSettingsHandlers';
import { useToastHandlers } from './useToastHandlers';
import { useDebugHandlers } from './useDebugHandlers';

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

  const handleClearChanges = useCallback(() => {
    store.clearChanges();
    refreshData();
  }, [store, refreshData]);

  const handleMarkAllRead = useCallback(() => {
    store.markAllChangesSeen();
    refreshData();
  }, [store, refreshData]);

  const { handleOpen, handleBlock, handleResume } = useThreadHandlers({ store, refreshData });

  const { handleRetentionChange } = useSettingsHandlers({
    store,
    refreshData,
    setRetentionDays,
  });

  const { handleToastDismiss, handleToastNavigate } = useToastHandlers({
    store,
    refreshData,
    setPendingToasts,
  });

  const { handleSimulateTitleChange } = useDebugHandlers({ store, notifier, refreshData });

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
