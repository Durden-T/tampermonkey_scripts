import { useEffect, useCallback } from 'react';
import { ScanPriority, type ScanScheduler } from '../core/ScanScheduler';

const createHistoryWrapper = (
  original: typeof history.pushState | typeof history.replaceState,
  onNavigate: () => void,
  methodName: string
) => {
  return function (this: History, ...args: Parameters<typeof history.pushState>) {
    try {
      const result = original.apply(this, args);
      onNavigate();
      return result;
    } catch (err) {
      console.error(`[NavigationScan] ${methodName} error:`, err);
      throw err;
    }
  };
};

export const useNavigationScan = (
  scheduler: ScanScheduler,
  performScan: () => void,
  refreshData: () => void
) => {
  const triggerDelayedScan = useCallback(() => {
    scheduler.schedule(() => {
      performScan();
      refreshData();
    }, ScanPriority.NORMAL);
  }, [scheduler, performScan, refreshData]);

  useEffect(() => {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    const wrappedPushState = createHistoryWrapper(
      originalPushState,
      triggerDelayedScan,
      'pushState'
    );
    const wrappedReplaceState = createHistoryWrapper(
      originalReplaceState,
      triggerDelayedScan,
      'replaceState'
    );

    history.pushState = wrappedPushState;
    history.replaceState = wrappedReplaceState;

    const handlePopState = () => {
      triggerDelayedScan();
    };
    window.addEventListener('popstate', handlePopState);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        triggerDelayedScan();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // Only restore if our wrappers are still active to avoid breaking other scripts
      if (history.pushState === wrappedPushState) {
        history.pushState = originalPushState;
      }
      if (history.replaceState === wrappedReplaceState) {
        history.replaceState = originalReplaceState;
      }
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [triggerDelayedScan, scheduler]);
};
