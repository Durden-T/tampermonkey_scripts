import { useEffect } from 'react';

const SCAN_INTERVAL_MS = 60000;

export const useScanInterval = (performScan: () => void, refreshData: () => void) => {
  useEffect(() => {
    const intervalId = setInterval(() => {
      performScan();
      refreshData();
    }, SCAN_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [performScan, refreshData]);
};
