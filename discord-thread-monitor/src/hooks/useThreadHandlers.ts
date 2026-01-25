import { useCallback } from 'react';
import type { ThreadStore } from '../core/ThreadStore';

interface UseThreadHandlersProps {
  store: ThreadStore;
  refreshData: () => void;
}

export const useThreadHandlers = ({ store, refreshData }: UseThreadHandlersProps) => {
  const handleOpen = useCallback(
    (url: string, threadId: string) => {
      store.markChangeSeen(threadId);
      refreshData();
      window.location.href = url;
    },
    [store, refreshData]
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
