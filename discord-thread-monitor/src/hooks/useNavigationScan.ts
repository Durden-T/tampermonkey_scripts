import { useEffect, useRef, useCallback } from 'react';
import { TIMING } from '../constants';

export const useNavigationScan = (performScan: () => void, refreshData: () => void) => {
  const lastScanTimeRef = useRef(0);
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerDelayedScan = useCallback(() => {
    const now = Date.now();
    if (now - lastScanTimeRef.current < TIMING.MIN_SCAN_GAP_MS) {
      return;
    }

    if (pendingTimeoutRef.current) {
      clearTimeout(pendingTimeoutRef.current);
    }

    pendingTimeoutRef.current = setTimeout(() => {
      lastScanTimeRef.current = Date.now();
      performScan();
      refreshData();
      pendingTimeoutRef.current = null;
    }, TIMING.NAV_SCAN_DELAY_MS);
  }, [performScan, refreshData]);

  useEffect(() => {
    let lastPathname = location.pathname;

    const navCheckId = setInterval(() => {
      const currentPathname = location.pathname;
      if (currentPathname !== lastPathname) {
        lastPathname = currentPathname;
        triggerDelayedScan();
      }
    }, TIMING.NAV_CHECK_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        triggerDelayedScan();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(navCheckId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
      }
    };
  }, [triggerDelayedScan]);
};
