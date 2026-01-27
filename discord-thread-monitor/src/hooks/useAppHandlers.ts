import type { ThreadStore } from '../core/ThreadStore';
import type { Notifier } from '../core/Notifier';
import type { TitleChange, MonitoredThread } from '../types';
import { useThreadHandlers } from './useThreadHandlers';
import { useSettingsHandlers } from './useSettingsHandlers';
import { useToastHandlers } from './useToastHandlers';
import { useDebugHandlers } from './useDebugHandlers';
import { useStoreActions } from './useStoreActions';

interface UseAppHandlersProps {
  store: ThreadStore;
  notifier: Notifier;
  refreshData: () => void;
  setPendingToasts: React.Dispatch<React.SetStateAction<TitleChange[]>>;
  setRetentionDays: React.Dispatch<React.SetStateAction<number>>;
  performScan: () => { currentThreads: MonitoredThread[]; changes: TitleChange[] };
}

export const useAppHandlers = ({
  store,
  notifier,
  refreshData,
  setPendingToasts,
  setRetentionDays,
  performScan,
}: UseAppHandlersProps) => {
  const { handleScanNow, handleMarkAllRead } = useStoreActions({
    store,
    refreshData,
    performScan,
  });

  const { handleOpen, handleBlock, handleResume } = useThreadHandlers({ store, refreshData });
  const { handleRetentionChange } = useSettingsHandlers({ store, refreshData, setRetentionDays });
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
    handleMarkAllRead,
    handleRetentionChange,
    handleToastDismiss,
    handleToastNavigate,
    handleSimulateTitleChange,
  };
};
