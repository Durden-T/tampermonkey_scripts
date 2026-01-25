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
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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
}) => (
  <div className="filter-mode-buttons">
    <button
      className={`filter-button ${filterMode === 'all' ? 'active' : ''}`}
      onClick={() => onFilterModeChange('all')}
    >
      {t.filters.all}
    </button>
    <button
      className={`filter-button ${filterMode === 'within' ? 'active' : ''}`}
      onClick={() => onFilterModeChange('within')}
    >
      {t.filters.within}
    </button>
    <button
      className={`filter-button ${filterMode === 'older' ? 'active' : ''}`}
      onClick={() => onFilterModeChange('older')}
    >
      {t.filters.older}
    </button>
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

interface DebugTabProps {
  retentionDays: number;
  storageInfo: StorageInfo;
  unseenCount: number;
  onSimulateTitleChange: () => void;
  onClearChanges: () => void;
  onRetentionChange: (days: number) => void;
  t: ReturnType<typeof getTexts>;
}

const DebugTab: React.FC<DebugTabProps> = ({
  retentionDays,
  storageInfo,
  unseenCount,
  onSimulateTitleChange,
  onClearChanges,
  onRetentionChange,
  t,
}) => {
  const [retentionInput, setRetentionInput] = useState(String(retentionDays));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRetentionInput(retentionDays === 0 ? t.settings.permanent : String(retentionDays));
  }, [retentionDays, t]);

  const handleRetentionBlur = () => {
    if (retentionInput.toLowerCase() === 'permanent' || retentionInput === '永久') {
      onRetentionChange(0);
      return;
    }
    const days = parseInt(retentionInput, 10);
    if (!isNaN(days) && days >= 0 && days <= 365) {
      onRetentionChange(days);
    } else {
      setRetentionInput(retentionDays === 0 ? t.settings.permanent : String(retentionDays));
    }
  };

  const handleRetentionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRetentionBlur();
    }
  };

  return (
    <div className="debug-section">
      <div className="settings-group">
        <label>{t.settings.retentionPeriod}:</label>
        <div className="retention-input-group">
          <input
            type="text"
            value={retentionInput}
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
    const hasSeenHelp = localStorage.getItem('thread-monitor-help-seen');
    if (!hasSeenHelp && isOpen) {
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

        <div className="panel-tabs">
          <button
            className={`tab ${activeTab === 'changes' ? 'active' : ''}`}
            onClick={() => setActiveTab('changes')}
          >
            {t.tabs.changes}
            {changes.length > 0 && <span className="tab-badge">{changes.length}</span>}
          </button>
          <button
            className={`tab ${activeTab === 'monitoring' ? 'active' : ''}`}
            onClick={() => setActiveTab('monitoring')}
          >
            {t.tabs.monitoring}
          </button>
          <button
            className={`tab ${activeTab === 'blacklist' ? 'active' : ''}`}
            onClick={() => setActiveTab('blacklist')}
          >
            {t.tabs.blacklist}
          </button>
          <button
            className={`tab ${activeTab === 'debug' ? 'active' : ''}`}
            onClick={() => setActiveTab('debug')}
          >
            {t.tabs.debug}
          </button>
        </div>

        {showStorageWarning && (
          <div className="storage-warning-banner">{t.settings.storageTooLarge}</div>
        )}

        <div className="panel-content tm-scrollbar">
          {activeTab === 'changes' && (
            <>
              <div className="content-header">
                <div className="filter-controls">
                  <FilterControls
                    filterMode={filterMode}
                    selectedPeriod={selectedPeriod}
                    onFilterModeChange={setFilterMode}
                    onPeriodChange={setSelectedPeriod}
                    t={t}
                  />
                </div>
                <HeaderActions
                  unseenCount={unseenCount}
                  changesLength={changes.length}
                  onMarkAllRead={onMarkAllRead}
                  onClearChanges={onClearChanges}
                  t={t}
                />
              </div>
              <ThreadList
                threads={[]}
                changeGroups={filteredChangeGroups}
                emptyMessage={t.labels.noChanges}
                onOpen={handleOpenThread}
                onBlock={onBlock}
                onResume={onResume}
              />
            </>
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
