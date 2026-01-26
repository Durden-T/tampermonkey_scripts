import { useState, useCallback, useRef, useEffect } from 'react';
import type { ThreadStore } from '../core/ThreadStore';
import type { ThreadChangeGroup, StorageInfo } from '../types';

export const useDashboardData = (store: ThreadStore) => {
  const initialData = store.getDashboardData();

  const [unseenCount, setUnseenCount] = useState(initialData.unseenCount);
  const [changeGroups, setChangeGroups] = useState<ThreadChangeGroup[]>(initialData.changeGroups);
  const [storageInfo, setStorageInfo] = useState<StorageInfo>(initialData.storageInfo);

  const refreshDataRef = useRef(() => {
    const dashboardData = store.getDashboardData();
    setUnseenCount(dashboardData.unseenCount);
    setChangeGroups(dashboardData.changeGroups);
    setStorageInfo(dashboardData.storageInfo);
  });

  useEffect(() => {
    refreshDataRef.current = () => {
      const dashboardData = store.getDashboardData();
      setUnseenCount(dashboardData.unseenCount);
      setChangeGroups(dashboardData.changeGroups);
      setStorageInfo(dashboardData.storageInfo);
    };
  });

  const refreshData = useCallback(() => {
    refreshDataRef.current();
  }, []);

  return {
    unseenCount,
    changeGroups,
    storageInfo,
    refreshData,
  };
};
