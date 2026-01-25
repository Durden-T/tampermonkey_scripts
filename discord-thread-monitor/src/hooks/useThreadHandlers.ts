import { useCallback } from 'react';
import type { ThreadStore } from '../core/ThreadStore';
import { useNavigateWithMark } from './useNavigateWithMark';

interface UseThreadHandlersProps {
  store: ThreadStore;
  refreshData: () => void;
}

export const useThreadHandlers = ({ store, refreshData }: UseThreadHandlersProps) => {
  const navigateAndMark = useNavigateWithMark({ store, refreshData });

  const handleOpen = useCallback(
    (url: string, threadId: string) => {
      navigateAndMark(url, threadId);
    },
    [navigateAndMark]
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

  return {
    handleOpen,
    handleBlock,
    handleResume,
  };
};
