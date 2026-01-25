import { getTexts } from '../../i18n';
import { ThreadList } from '../ThreadList';
import type { ThreadChangeGroup } from '../../types';
import type { TimePeriod, TimeFilterMode } from '../../utils/timeFilters';
import { FilterControls } from './FilterControls';
import { HeaderActions } from './HeaderActions';

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
export const ChangesTabContent: React.FC<ChangesTabContentProps> = ({
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
