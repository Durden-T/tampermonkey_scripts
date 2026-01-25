/* eslint-disable max-lines */
import { useEffect, useState, useMemo } from 'react';
import { getTexts, getCurrentLanguage, setLanguage } from '../i18n';
import { HelpTooltip } from './HelpTooltip';
import { ThreadList } from './ThreadList';
import { ScanIcon, CloseIcon, HelpIcon } from './Icons';
import { useDraggable } from '../hooks/useDraggable';
import {
  filterChangeGroupsByTime,
  TIME_PERIODS,
  type TimeFilter,
  type TimePeriod,
  type TimeFilterMode,
} from '../utils/timeFilters';
import type { MonitoredThread, TitleChange, ThreadChangeGroup, StorageInfo } from '../types';
// eslint-disable-next-line no-duplicate-imports
import { STORAGE_WARNING_BYTES } from '../types';

interface ManagerPanelProps {
  isOpen: boolean;
  threads: MonitoredThread[];
  changes: TitleChange[];
  changeGroups: ThreadChangeGroup[];
  blacklistedThreads: MonitoredThread[];
  unseenCount: number;
  retentionDays: number;
  storageInfo: StorageInfo;
  onClose: () => void;
  onScanNow: () => void;
  onOpen: (url: string, threadId: string) => void;
  onBlock: (threadId: string) => void;
  onResume: (threadId: string) => void;
  onClearChanges: () => void;
  onMarkAllRead: () => void;
  onSimulateTitleChange: () => void;
  onRetentionChange: (days: number) => void;
}

type TabType = 'changes' | 'monitoring' | 'blacklist' | 'debug';

const PANEL_WIDTH = 520;
const PANEL_MIN_HEIGHT = 200;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

interface FilterControlsProps {
  filterMode: TimeFilterMode | 'all';
  selectedPeriod: TimePeriod;
  onFilterModeChange: (mode: TimeFilterMode | 'all') => void;
  onPeriodChange: (period: TimePeriod) => void;
  t: ReturnType<typeof getTexts>;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  filterMode,
  selectedPeriod,
  onFilterModeChange,
  onPeriodChange,
  t,
}) => {
  const filterModes: Array<'all' | 'within' | 'older'> = ['all', 'within', 'older'];

  return (
    <div className="filter-mode-buttons">
      {filterModes.map((mode) => (
        <button
          key={mode}
          className={`filter-button ${filterMode === mode ? 'active' : ''}`}
          onClick={() => onFilterModeChange(mode)}
        >
          {t.filters[mode]}
        </button>
      ))}
      {filterMode !== 'all' && (
        <div className="filter-period-buttons">
          {TIME_PERIODS.map((period) => (
            <button
              key={period}
              className={`filter-button ${selectedPeriod === period ? 'active' : ''}`}
              onClick={() => onPeriodChange(period)}
            >
              {t.filters.periods[period]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface HeaderActionsProps {
  unseenCount: number;
  changesLength: number;
  onMarkAllRead: () => void;
  onClearChanges: () => void;
  t: ReturnType<typeof getTexts>;
}

const HeaderActions: React.FC<HeaderActionsProps> = ({
  unseenCount,
  changesLength,
  onMarkAllRead,
  onClearChanges,
  t,
}) => (
  <div className="header-actions">
    {unseenCount > 0 && (
      <button className="mark-read-button" onClick={onMarkAllRead}>
        {t.actions.markAllRead}
      </button>
    )}
    {changesLength > 0 && (
      <button className="clear-button" onClick={onClearChanges}>
        {t.actions.clearChanges}
      </button>
    )}
  </div>
);

interface PanelTabsProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  changesLength: number;
  t: ReturnType<typeof getTexts>;
}

const PanelTabs: React.FC<PanelTabsProps> = ({ activeTab, setActiveTab, changesLength, t }) => {
  const tabs: Array<{ key: TabType; label: string; showBadge?: boolean }> = [
    { key: 'changes', label: t.tabs.changes, showBadge: true },
    { key: 'monitoring', label: t.tabs.monitoring },
    { key: 'blacklist', label: t.tabs.blacklist },
    { key: 'debug', label: t.tabs.debug },
  ];

  return (
    <div className="panel-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`tab ${activeTab === tab.key ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.key)}
        >
          {tab.label}
          {tab.showBadge && changesLength > 0 && <span className="tab-badge">{changesLength}</span>}
        </button>
      ))}
    </div>
  );
};

interface DebugTabProps {
  retentionDays: number;
  storageInfo: StorageInfo;
  unseenCount: number;
  onSimulateTitleChange: () => void;
  onClearChanges: () => void;
  onRetentionChange: (days: number) => void;
  t: ReturnType<typeof getTexts>;
}

const useRetentionInput = (
  retentionDays: number,
  onRetentionChange: (days: number) => void,
  t: ReturnType<typeof getTexts>
) => {
  const [retentionInput, setRetentionInput] = useState('');

  const handleRetentionBlur = () => {
    const input = retentionInput.trim();
    if (!input) {
      setRetentionInput(retentionDays === 0 ? t.settings.permanent : String(retentionDays));
      return;
    }

    if (input.toLowerCase() === 'permanent' || input === '永久') {
      onRetentionChange(0);
      setRetentionInput(t.settings.permanent);
      return;
    }

    const days = parseInt(input, 10);
    if (!isNaN(days) && days >= 0 && days <= 365) {
      onRetentionChange(days);
      setRetentionInput(String(days));
    } else {
      setRetentionInput(retentionDays === 0 ? t.settings.permanent : String(retentionDays));
    }
  };

  const handleRetentionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRetentionBlur();
    }
  };

  const inputDisplayValue =
    retentionInput || (retentionDays === 0 ? t.settings.permanent : String(retentionDays));

  return {
    retentionInput,
    setRetentionInput,
    handleRetentionBlur,
    handleRetentionKeyDown,
    inputDisplayValue,
  };
};

// eslint-disable-next-line max-lines-per-function
const DebugTab: React.FC<DebugTabProps> = ({
  retentionDays,
  storageInfo,
  unseenCount,
  onSimulateTitleChange,
  onClearChanges,
  onRetentionChange,
  t,
}) => {
  const { handleRetentionBlur, handleRetentionKeyDown, inputDisplayValue, setRetentionInput } =
    useRetentionInput(retentionDays, onRetentionChange, t);

  return (
    <div className="debug-section">
      <div className="settings-group">
        <label>{t.settings.retentionPeriod}:</label>
        <div className="retention-input-group">
          <input
            type="text"
            value={inputDisplayValue}
            onChange={(e) => setRetentionInput(e.target.value)}
            onBlur={handleRetentionBlur}
            onKeyDown={handleRetentionKeyDown}
            className="retention-input"
            placeholder={t.settings.permanent}
          />
          <span className="retention-unit">{retentionDays === 0 ? '' : t.settings.days}</span>
        </div>
      </div>

      <div className="storage-info">
        <label>{t.settings.storageUsage}:</label>
        <div className="storage-details">
          <div className="storage-row">
            <span>{t.settings.rawSize}:</span>
            <span>{formatBytes(storageInfo.rawSize)}</span>
          </div>
          {storageInfo.isCompressed && (
            <div className="storage-row">
              <span>{t.settings.compressedSize}:</span>
              <span>{formatBytes(storageInfo.compressedSize)}</span>
            </div>
          )}
          <div className="storage-row">
            <span>{t.settings.compression}:</span>
            <span>{storageInfo.isCompressed ? t.settings.enabled : t.settings.disabled}</span>
          </div>
        </div>
      </div>

      <button onClick={onSimulateTitleChange}>{t.debug.simulateChange}</button>
      <button onClick={onClearChanges}>{t.debug.clearAll}</button>
      <div className="debug-info">
        <div>
          <span>{t.debug.stats.threads}:</span>
          <span>{storageInfo.threadCount}</span>
        </div>
        <div>
          <span>{t.debug.stats.changes}:</span>
          <span>{storageInfo.changeCount}</span>
        </div>
        <div>
          <span>{t.debug.stats.unseen}:</span>
          <span>{unseenCount}</span>
        </div>
      </div>
    </div>
  );
};

interface ChangesTabContentProps {
  filterMode: TimeFilterMode | 'all';
  selectedPeriod: TimePeriod;
  onFilterModeChange: (mode: TimeFilterMode | 'all') => void;
  onPeriodChange: (period: TimePeriod) => void;
  unseenCount: number;
  changesLength: number;
  onMarkAllRead: () => void;
  onClearChanges: () => void;
  filteredChangeGroups: ThreadChangeGroup[];
  onOpen: (url: string, threadId: string) => void;
  onBlock: (threadId: string) => void;
  onResume: (threadId: string) => void;
  t: ReturnType<typeof getTexts>;
}

// eslint-disable-next-line max-lines-per-function
const ChangesTabContent: React.FC<ChangesTabContentProps> = ({
  filterMode,
  selectedPeriod,
  onFilterModeChange,
  onPeriodChange,
  unseenCount,
  changesLength,
  onMarkAllRead,
  onClearChanges,
  filteredChangeGroups,
  onOpen,
  onBlock,
  onResume,
  t,
}) => {
  return (
    <>
      <div className="content-header">
        <div className="filter-controls">
          <FilterControls
            filterMode={filterMode}
            selectedPeriod={selectedPeriod}
            onFilterModeChange={onFilterModeChange}
            onPeriodChange={onPeriodChange}
            t={t}
          />
        </div>
        <HeaderActions
          unseenCount={unseenCount}
          changesLength={changesLength}
          onMarkAllRead={onMarkAllRead}
          onClearChanges={onClearChanges}
          t={t}
        />
      </div>
      <ThreadList
        threads={[]}
        changeGroups={filteredChangeGroups}
        emptyMessage={t.labels.noChanges}
        onOpen={onOpen}
        onBlock={onBlock}
        onResume={onResume}
      />
    </>
  );
};

// eslint-disable-next-line max-lines-per-function
export function ManagerPanel({
  isOpen,
  threads,
  changes,
  changeGroups,
  blacklistedThreads,
  unseenCount,
  retentionDays,
  storageInfo,
  onClose,
  onScanNow,
  onOpen,
  onBlock,
  onResume,
  onClearChanges,
  onMarkAllRead,
  onSimulateTitleChange,
  onRetentionChange,
}: ManagerPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('changes');
  const [filterMode, setFilterMode] = useState<TimeFilterMode | 'all'>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('week');
  const [showHelp, setShowHelp] = useState(false);
  const [language, setLanguageState] = useState<'zh' | 'en'>(getCurrentLanguage());

  const { position, isDragging, handleMouseDown } = useDraggable({
    storageKey: 'thread-monitor-panel-position',
    defaultPosition: { x: window.innerWidth - PANEL_WIDTH - 16, y: 80 },
    bounds: { width: PANEL_WIDTH, height: PANEL_MIN_HEIGHT },
    excludeSelector: '.panel-actions, .panel-tabs, .panel-content',
  });

  const t = getTexts();

  const handleLanguageToggle = () => {
    const newLang = language === 'zh' ? 'en' : 'zh';
    setLanguage(newLang);
    setLanguageState(newLang);
  };

  useEffect(() => {
    if (isOpen && !localStorage.getItem('thread-monitor-help-seen')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowHelp(true);
      localStorage.setItem('thread-monitor-help-seen', 'true');
    }
  }, [isOpen]);

  const handleOpenThread = (url: string, threadId: string) => {
    onOpen(url, threadId);
  };

  const timeFilter: TimeFilter = useMemo(
    () => (filterMode === 'all' ? 'all' : `${selectedPeriod}_${filterMode}`),
    [filterMode, selectedPeriod]
  );

  const [now] = useState(() => Date.now());
  const filteredChangeGroups = useMemo(
    () => (isOpen ? filterChangeGroupsByTime(changeGroups, timeFilter, now) : []),
    [isOpen, changeGroups, timeFilter, now]
  );

  if (!isOpen) return null;

  const showStorageWarning = storageInfo.rawSize > STORAGE_WARNING_BYTES;

  return (
    <>
      <div
        className="manager-panel"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'default',
        }}
      >
        <div className="panel-header" onMouseDown={handleMouseDown} style={{ cursor: 'grab' }}>
          <h2>{t.title}</h2>
          <div className="panel-actions">
            <button className="scan-button" onClick={onScanNow}>
              <ScanIcon />
              <span>{t.scanNow}</span>
            </button>
            <button className="lang-button" onClick={handleLanguageToggle} title="Switch Language">
              {language === 'zh' ? 'EN' : 'ZH'}
            </button>
            <button className="help-button" onClick={() => setShowHelp(true)}>
              <HelpIcon />
            </button>
            <button className="close-button" onClick={onClose} title="Close">
              <CloseIcon />
            </button>
          </div>
        </div>

        <PanelTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          changesLength={changes.length}
          t={t}
        />

        {showStorageWarning && (
          <div className="storage-warning-banner">{t.settings.storageTooLarge}</div>
        )}

        <div className="panel-content tm-scrollbar">
          {activeTab === 'changes' && (
            <ChangesTabContent
              filterMode={filterMode}
              selectedPeriod={selectedPeriod}
              onFilterModeChange={setFilterMode}
              onPeriodChange={setSelectedPeriod}
              unseenCount={unseenCount}
              changesLength={changes.length}
              onMarkAllRead={onMarkAllRead}
              onClearChanges={onClearChanges}
              filteredChangeGroups={filteredChangeGroups}
              onOpen={handleOpenThread}
              onBlock={onBlock}
              onResume={onResume}
              t={t}
            />
          )}

          {activeTab === 'monitoring' && (
            <ThreadList
              threads={threads}
              emptyMessage={t.labels.noThreads}
              onOpen={handleOpenThread}
              onBlock={onBlock}
              onResume={onResume}
            />
          )}

          {activeTab === 'blacklist' && (
            <ThreadList
              threads={blacklistedThreads}
              isBlacklisted
              emptyMessage={t.labels.noBlacklist}
              onOpen={handleOpenThread}
              onBlock={onBlock}
              onResume={onResume}
            />
          )}

          {activeTab === 'debug' && (
            <DebugTab
              retentionDays={retentionDays}
              storageInfo={storageInfo}
              unseenCount={unseenCount}
              onSimulateTitleChange={onSimulateTitleChange}
              onClearChanges={onClearChanges}
              onRetentionChange={onRetentionChange}
              t={t}
            />
          )}
        </div>
      </div>

      <HelpTooltip show={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
}
