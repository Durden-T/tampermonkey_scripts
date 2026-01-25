import { useState, useEffect } from 'react';
import { getTexts, getCurrentLanguage, setLanguage } from '../../i18n';
import { useDraggable } from '../../hooks/useDraggable';
import { type TimeFilter, type TimePeriod, type TimeFilterMode } from '../../utils/timeFilters';
import { STORAGE_WARNING_BYTES, type StorageInfo } from '../../types';

const PANEL_WIDTH = 520;
const PANEL_MIN_HEIGHT = 200;

interface UseManagerPanelLogicProps {
  isOpen: boolean;
  storageInfo: StorageInfo;
  _onScanNow: () => void;
  _onClose: () => void;
}

const usePanelPosition = () => {
  const { position, isDragging, handleMouseDown } = useDraggable({
    storageKey: 'thread-monitor-panel-position',
    defaultPosition: { x: window.innerWidth - PANEL_WIDTH - 16, y: 80 },
    bounds: { width: PANEL_WIDTH, height: PANEL_MIN_HEIGHT },
    excludeSelector: '.panel-actions, .panel-tabs, .panel-content',
  });
  return { position, isDragging, handleMouseDown };
};

const useLanguageToggle = () => {
  const [language, setLanguageState] = useState<'zh' | 'en'>(getCurrentLanguage());

  const handleLanguageToggle = () => {
    const newLang = language === 'zh' ? 'en' : 'zh';
    setLanguage(newLang);
    setLanguageState(newLang);
  };

  return { language, handleLanguageToggle };
};

const useHelpVisibility = (isOpen: boolean) => {
  const [showHelp, setShowHelp] = useState(
    () => isOpen && !localStorage.getItem('thread-monitor-help-seen')
  );

  useEffect(() => {
    if (showHelp) {
      localStorage.setItem('thread-monitor-help-seen', 'true');
    }
  }, [showHelp]);

  return { showHelp, setShowHelp };
};

const useTimeFilter = (filterMode: TimeFilterMode | 'all', selectedPeriod: TimePeriod) => {
  const timeFilter: TimeFilter = filterMode === 'all' ? 'all' : `${selectedPeriod}_${filterMode}`;
  const [now] = useState(() => Date.now());
  return { timeFilter, now };
};

export const useManagerPanelLogic = ({
  isOpen,
  storageInfo,
  _onScanNow,
  _onClose,
}: UseManagerPanelLogicProps) => {
  const [activeTab, setActiveTab] = useState<'changes' | 'monitoring' | 'blacklist' | 'debug'>(
    'changes'
  );
  const [filterMode, setFilterMode] = useState<TimeFilterMode | 'all'>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('week');

  const t = getTexts();
  const { position, isDragging, handleMouseDown } = usePanelPosition();
  const { language, handleLanguageToggle } = useLanguageToggle();
  const { showHelp, setShowHelp } = useHelpVisibility(isOpen);
  const { timeFilter, now } = useTimeFilter(filterMode, selectedPeriod);

  const showStorageWarning = storageInfo.rawSize > STORAGE_WARNING_BYTES;

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
  };
};
