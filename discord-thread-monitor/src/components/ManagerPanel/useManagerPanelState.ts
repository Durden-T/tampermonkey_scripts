import { useState } from 'react';
import type { TimePeriod, TimeFilterMode } from '../../utils/timeFilters';

export const useManagerPanelTabState = () => {
  const [activeTab, setActiveTab] = useState<'changes' | 'monitoring' | 'blacklist' | 'debug'>(
    'changes'
  );
  return { activeTab, setActiveTab };
};

export const useManagerPanelFilterState = () => {
  const [filterMode, setFilterMode] = useState<TimeFilterMode | 'all' | 'allUnread'>('allUnread');
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('week');
  const [now] = useState(() => Date.now());

  return {
    filterMode,
    setFilterMode,
    selectedPeriod,
    setSelectedPeriod,
    now,
  };
};
