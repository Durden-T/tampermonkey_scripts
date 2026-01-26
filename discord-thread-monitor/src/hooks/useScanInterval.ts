import { useEffect, useRef } from 'react';
import { ScanPriority, type ScanScheduler } from '../core/ScanScheduler';
import { TIMING } from '../constants';

export const useScanInterval = (
  scheduler: ScanScheduler,
  performScan: () => void,
  refreshData: () => void
) => {
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const executeScan = () => {
      performScan();
      refreshData();
    };

    const startInterval = () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
      intervalIdRef.current = setInterval(() => {
        scheduler.schedule(executeScan, ScanPriority.HIGH);
      }, TIMING.SCAN_INTERVAL_MS);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalIdRef.current) {
          clearInterval(intervalIdRef.current);
          intervalIdRef.current = null;
        }
      } else {
        startInterval();
      }
    };

    startInterval();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [scheduler, performScan, refreshData]);
};
