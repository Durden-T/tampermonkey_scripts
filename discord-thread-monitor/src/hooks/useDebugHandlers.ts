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
    if (!import.meta.env.DEV) return;

    void import('../debug/simulateTitleChange').then(({ simulateTitleChange }) => {
      simulateTitleChange(store, notifier, refreshData);
    });
  }, [store, notifier, refreshData]);

  return {
    handleSimulateTitleChange,
  };
};
