import { useCallback } from 'react';
import type { ThreadStore } from '../core/ThreadStore';
import type { TitleChange } from '../types';

interface UseToastHandlersProps {
  store: ThreadStore;
  refreshData: () => void;
  setPendingToasts: React.Dispatch<React.SetStateAction<TitleChange[]>>;
}

export const useToastHandlers = ({
  store,
  refreshData,
  setPendingToasts,
}: UseToastHandlersProps) => {
  const handleToastDismiss = useCallback(
    (threadId: string) => {
      setPendingToasts((prev) => prev.filter((toast) => toast.threadId !== threadId));
    },
    [setPendingToasts]
  );

  const handleToastNavigate = useCallback(
    (url: string, threadId: string) => {
      store.markChangeSeen(threadId);
      setPendingToasts((prev) => prev.filter((toast) => toast.threadId !== threadId));
      refreshData();
      window.location.href = url;
    },
    [store, setPendingToasts, refreshData]
  );

  return {
    handleToastDismiss,
    handleToastNavigate,
  };
};
