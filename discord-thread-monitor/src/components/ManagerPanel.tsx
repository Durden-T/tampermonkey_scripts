import { useMemo } from 'react';
import { HelpTooltip } from './HelpTooltip';
import { ScanIcon, CloseIcon, HelpIcon, WarningIcon } from './Icons';
import { filterChangeGroupsByTime } from '../utils/timeFilters';
import { scanStatus } from '../core/ScanStatus';
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

// JSX verbosity in multi-section panel UI - already decomposed into sub-components
// eslint-disable-next-line max-lines-per-function
export function ManagerPanel(props: ManagerPanelProps) {
  const logic = useManagerPanelLogic({
    isOpen: props.isOpen,
    storageInfo: props.storageInfo,
  });

  const filteredChangeGroups = useMemo(
    () =>
      props.isOpen ? filterChangeGroupsByTime(props.changeGroups, logic.timeFilter, logic.now) : [],
    [props.isOpen, props.changeGroups, logic.timeFilter, logic.now]
  );

  const filteredUnseenCount = useMemo(
    () => filteredChangeGroups.filter((group) => group.hasUnseen).length,
    [filteredChangeGroups]
  );

  const filteredChangesCount = filteredChangeGroups.length;

  if (!props.isOpen) {
    return null;
  }

  return (
    <>
      <div
        className="manager-panel"
        style={{
          left: `${logic.position.x}px`,
          top: `${logic.position.y}px`,
          cursor: logic.isDragging ? 'grabbing' : 'default',
        }}
      >
        <div
          className="panel-header"
          onMouseDown={logic.handleMouseDown}
          style={{ cursor: 'grab' }}
        >
          <h2>{logic.t.title}</h2>
          {scanStatus.hasPersistentError() && (
            <span className="scan-error-badge" title={logic.t.scanError}>
              <WarningIcon size={14} />
            </span>
          )}
          <div className="panel-actions">
            <button className="scan-button" onClick={props.onScanNow}>
              <ScanIcon />
              <span>{logic.t.scanNow}</span>
            </button>
            <button
              className="lang-button"
              onClick={logic.handleLanguageToggle}
              title="Switch Language"
            >
              {logic.language === 'zh' ? 'EN' : 'ZH'}
            </button>
            <button className="help-button" onClick={() => logic.setShowHelp(true)}>
              <HelpIcon />
            </button>
            <button className="close-button" onClick={props.onClose} title="Close">
              <CloseIcon />
            </button>
          </div>
        </div>

        <PanelTabs
          activeTab={logic.activeTab}
          setActiveTab={logic.setActiveTab}
          changesLength={filteredChangesCount}
          t={logic.t}
        />

        <PanelContent
          activeTab={logic.activeTab}
          threads={props.threads}
          blacklistedThreads={props.blacklistedThreads}
          filteredChangeGroups={filteredChangeGroups}
          storageInfo={props.storageInfo}
          showStorageWarning={logic.showStorageWarning}
          retentionDays={props.retentionDays}
          unseenCount={logic.activeTab === 'changes' ? filteredUnseenCount : props.unseenCount}
          changesLength={props.changes.length}
          filterMode={logic.filterMode}
          selectedPeriod={logic.selectedPeriod}
          onFilterModeChange={logic.setFilterMode}
          onPeriodChange={logic.setSelectedPeriod}
          onMarkAllRead={props.onMarkAllRead}
          onClearChanges={props.onClearChanges}
          onOpen={props.onOpen}
          onBlock={props.onBlock}
          onResume={props.onResume}
          onSimulateTitleChange={props.onSimulateTitleChange}
          onRetentionChange={props.onRetentionChange}
          onForceStorageWarning={logic.toggleForceStorageWarning}
          t={logic.t}
        />
      </div>

      <HelpTooltip show={logic.showHelp} onClose={() => logic.setShowHelp(false)} />
    </>
  );
}
