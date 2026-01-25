import { useCallback } from 'react';
import type { ThreadStore } from '../core/ThreadStore';

interface UseSettingsHandlersProps {
  store: ThreadStore;
  refreshData: () => void;
  setRetentionDays: React.Dispatch<React.SetStateAction<number>>;
}

export const useSettingsHandlers = ({
  store,
  refreshData,
  setRetentionDays,
}: UseSettingsHandlersProps) => {
  const handleRetentionChange = useCallback(
    (days: number) => {
      store.setRetentionDays(days);
      setRetentionDays(days);
      refreshData();
    },
    [store, setRetentionDays, refreshData]
  );

  return {
    handleRetentionChange,
  };
};
