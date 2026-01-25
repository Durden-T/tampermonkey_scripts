import { useCallback } from 'react';
import type { ThreadStore } from '../core/ThreadStore';
import type { Notifier } from '../core/Notifier';

interface UseDebugHandlersProps {
  store: ThreadStore;
  notifier: Notifier;
  refreshData: () => void;
}

export const useDebugHandlers = ({ store, notifier, refreshData }: UseDebugHandlersProps) => {
  const handleSimulateTitleChange = useCallback(() => {
    void import('../debug/simulateTitleChange').then(({ simulateTitleChange }) => {
      simulateTitleChange(store, notifier, refreshData);
    });
  }, [store, notifier, refreshData]);

  return {
    handleSimulateTitleChange,
  };
};
