import { type getTexts } from '../../i18n';
import { ThreadList } from '../ThreadList';
import type { ThreadChangeGroup } from '../../types';
import type { TimePeriod, TimeFilterMode } from '../../utils/timeFilters';
import { FilterControls } from './FilterControls';

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
      <FilterControls
        filterMode={filterMode}
        selectedPeriod={selectedPeriod}
        onFilterModeChange={onFilterModeChange}
        onPeriodChange={onPeriodChange}
        unseenCount={unseenCount}
        changesLength={changesLength}
        onMarkAllRead={onMarkAllRead}
        onClearChanges={onClearChanges}
        t={t}
      />
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
