import { getTexts } from '../../i18n';
import type { TimeFilter } from '../../utils/timeFilters';
import { STORAGE_WARNING_BYTES, type StorageInfo } from '../../types';
import {
  useManagerPanelTabState,
  useManagerPanelFilterState,
  useManagerPanelDebugState,
} from './useManagerPanelState';
import { useManagerPanelUI } from './useManagerPanelUI';

interface UseManagerPanelLogicProps {
  isOpen: boolean;
  storageInfo: StorageInfo;
}

export const useManagerPanelLogic = ({ isOpen, storageInfo }: UseManagerPanelLogicProps) => {
  const { activeTab, setActiveTab } = useManagerPanelTabState();
  const { filterMode, setFilterMode, selectedPeriod, setSelectedPeriod, now } =
    useManagerPanelFilterState();
  const {
    position,
    isDragging,
    handleMouseDown,
    language,
    handleLanguageToggle,
    showHelp,
    setShowHelp,
  } = useManagerPanelUI(isOpen);
  const { forceStorageWarning, toggleForceStorageWarning } = useManagerPanelDebugState();

  const t = getTexts();
  const timeFilter: TimeFilter =
    filterMode === 'all' || filterMode === 'allUnread'
      ? filterMode
      : `${selectedPeriod}_${filterMode}`;
  const showStorageWarning = storageInfo.rawSize > STORAGE_WARNING_BYTES || forceStorageWarning;

  return {
    activeTab,
    setActiveTab,
    filterMode,
    setFilterMode,
    selectedPeriod,
    setSelectedPeriod,
    showHelp,
    setShowHelp,
    language,
    position,
    isDragging,
    handleMouseDown,
    t,
    handleLanguageToggle,
    timeFilter,
    now,
    showStorageWarning,
    toggleForceStorageWarning,
  };
};
