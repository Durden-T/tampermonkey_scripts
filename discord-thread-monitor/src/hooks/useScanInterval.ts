import { useEffect } from 'react';
import { TIMING } from '../constants';

export const useScanInterval = (performScan: () => void, refreshData: () => void) => {
  useEffect(() => {
    const intervalId = setInterval(() => {
      performScan();
      refreshData();
    }, TIMING.SCAN_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [performScan, refreshData]);
};
