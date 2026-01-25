import { useCallback } from 'react';
import type { ThreadStore } from '../core/ThreadStore';

interface UseNavigateWithMarkProps {
  store: ThreadStore;
  refreshData: () => void;
}

const navigateDiscordSPA = (url: string) => {
  const urlObj = new URL(url);
  history.pushState(null, '', urlObj.pathname);
  window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
};

export const useNavigateWithMark = ({ store, refreshData }: UseNavigateWithMarkProps) => {
  const navigateAndMark = useCallback(
    (url: string, threadId: string) => {
      store.markChangeSeen(threadId);
      refreshData();
      navigateDiscordSPA(url);
    },
    [store, refreshData]
  );

  return navigateAndMark;
};
