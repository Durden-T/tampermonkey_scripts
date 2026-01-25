import { useCallback } from 'react';
import type { ThreadStore } from '../core/ThreadStore';
import type { TitleChange } from '../types';
import { useNavigateWithMark } from './useNavigateWithMark';

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
  const navigateAndMark = useNavigateWithMark({ store, refreshData });

  const dismissToast = useCallback(
    (threadId: string) => {
      setPendingToasts((prev) => prev.filter((toast) => toast.threadId !== threadId));
    },
    [setPendingToasts]
  );

  const handleToastDismiss = useCallback(
    (threadId: string) => {
      dismissToast(threadId);
    },
    [dismissToast]
  );

  const handleToastNavigate = useCallback(
    (url: string, threadId: string) => {
      dismissToast(threadId);
      navigateAndMark(url, threadId);
    },
    [dismissToast, navigateAndMark]
  );

  return {
    handleToastDismiss,
    handleToastNavigate,
  };
};
