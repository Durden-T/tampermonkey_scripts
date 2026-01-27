import { useCallback } from 'react';
import type { ThreadStore } from '../core/ThreadStore';

interface UseSettingsHandlersProps {
  store: ThreadStore;
  refreshData: () => void;
  setRetentionDays: React.Dispatch<React.SetStateAction<number>>;
}

const CLEAR_ALL_VALUE = -1;
const PERMANENT_RETENTION = 0;

export const useSettingsHandlers = ({
  store,
  refreshData,
  setRetentionDays,
}: UseSettingsHandlersProps) => {
  const handleRetentionChange = useCallback(
    (days: number) => {
      if (days === CLEAR_ALL_VALUE) {
        store.clearChanges();
        store.setRetentionDays(PERMANENT_RETENTION);
        setRetentionDays(PERMANENT_RETENTION);
        refreshData();
      } else {
        store.setRetentionDays(days);
        setRetentionDays(days);
        refreshData();
      }
    },
    [store, setRetentionDays, refreshData]
  );

  return {
    handleRetentionChange,
  };
};
