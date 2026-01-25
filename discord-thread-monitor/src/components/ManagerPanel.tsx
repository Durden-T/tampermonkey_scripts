import { useMemo } from 'react';
import { HelpTooltip } from './HelpTooltip';
import { ScanIcon, CloseIcon, HelpIcon } from './Icons';
import { filterChangeGroupsByTime } from '../utils/timeFilters';
import type { MonitoredThread, TitleChange, ThreadChangeGroup, StorageInfo } from '../types';
import { useManagerPanelLogic } from './ManagerPanel/useManagerPanelLogic';
import { PanelContent } from './ManagerPanel/PanelContent';
import { PanelTabs } from './ManagerPanel/PanelTabs';

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
  const {
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
  } = useManagerPanelLogic({ isOpen, storageInfo, _onScanNow: onScanNow, _onClose: onClose });

  const handleOpenThread = (url: string, threadId: string) => {
    onOpen(url, threadId);
  };

  const filteredChangeGroups = useMemo(
    () => (isOpen ? filterChangeGroupsByTime(changeGroups, timeFilter, now) : []),
    [isOpen, changeGroups, timeFilter, now]
  );

  if (!isOpen) return null;

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

        <PanelContent
          activeTab={activeTab}
          threads={threads}
          blacklistedThreads={blacklistedThreads}
          filteredChangeGroups={filteredChangeGroups}
          storageInfo={storageInfo}
          showStorageWarning={showStorageWarning}
          retentionDays={retentionDays}
          unseenCount={unseenCount}
          changesLength={changes.length}
          filterMode={filterMode}
          selectedPeriod={selectedPeriod}
          onFilterModeChange={setFilterMode}
          onPeriodChange={setSelectedPeriod}
          onMarkAllRead={onMarkAllRead}
          onClearChanges={onClearChanges}
          onOpen={handleOpenThread}
          onBlock={onBlock}
          onResume={onResume}
          onSimulateTitleChange={onSimulateTitleChange}
          onRetentionChange={onRetentionChange}
          t={t}
        />
      </div>

      <HelpTooltip show={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
}
