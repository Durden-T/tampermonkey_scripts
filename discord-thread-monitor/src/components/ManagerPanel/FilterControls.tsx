import { useEffect, useRef } from 'react';
import { UI } from '../../constants';
import { type getTexts } from '../../i18n';
import { TIME_PERIODS, type TimePeriod, type TimeFilterMode } from '../../utils/timeFilters';

interface FilterControlsProps {
  filterMode: TimeFilterMode | 'all' | 'allUnread';
  selectedPeriod: TimePeriod;
  onFilterModeChange: (mode: TimeFilterMode | 'all' | 'allUnread') => void;
  onPeriodChange: (period: TimePeriod) => void;
  unseenCount: number;
  onMarkAllRead: () => void;
  t: ReturnType<typeof getTexts>;
}

const FILTER_MODES: Array<'allUnread' | 'all' | 'within' | 'older'> = [
  'allUnread',
  'all',
  'within',
  'older',
];

interface FilterActionsProps {
  filterMode: TimeFilterMode | 'all' | 'allUnread';
  unseenCount: number;
  onMarkAllRead: () => void;
  t: ReturnType<typeof getTexts>;
}

const FilterActions: React.FC<FilterActionsProps> = ({
  filterMode,
  unseenCount,
  onMarkAllRead,
  t,
}) => (
  <div className="filter-actions">
    {filterMode === 'allUnread' && unseenCount > 0 && (
      <button className="action-btn mark-read" onClick={onMarkAllRead}>
        <span className="action-icon">✓</span>
        {t.actions.markAllRead}
      </button>
    )}
  </div>
);

interface PeriodButtonsProps {
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  t: ReturnType<typeof getTexts>;
}

const PeriodButtons: React.FC<PeriodButtonsProps> = ({ selectedPeriod, onPeriodChange, t }) => (
  <div className="time-periods-row">
    <div className="time-chips">
      {TIME_PERIODS.map((period) => (
        <button
          key={period}
          className={`time-chip ${selectedPeriod === period ? 'active' : ''}`}
          onClick={() => onPeriodChange(period)}
        >
          {t.filters.periods[period]}
        </button>
      ))}
    </div>
  </div>
);

interface SegmentedControlProps {
  filterMode: TimeFilterMode | 'all' | 'allUnread';
  onFilterModeChange: (mode: TimeFilterMode | 'all' | 'allUnread') => void;
  t: ReturnType<typeof getTexts>;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({
  filterMode,
  onFilterModeChange,
  t,
}) => {
  const segmentedControlRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = segmentedControlRef.current;
    const indicator = indicatorRef.current;
    if (!container || !indicator) {
      return;
    }

    const activeIndex = FILTER_MODES.indexOf(filterMode as (typeof FILTER_MODES)[number]);
    if (activeIndex < 0) {
      return;
    }

    const buttons = container.querySelectorAll<HTMLButtonElement>('.segment');
    const activeButton = buttons[activeIndex];
    if (!activeButton) {
      return;
    }

    const offsetX = activeButton.offsetLeft - UI.SEGMENTED_CONTROL_PADDING;
    indicator.style.width = `${activeButton.offsetWidth}px`;
    indicator.style.transform = `translateX(${offsetX}px)`;
  }, [filterMode]);

  return (
    <div className="segmented-control" ref={segmentedControlRef}>
      {FILTER_MODES.map((mode) => (
        <button
          key={mode}
          className={`segment ${filterMode === mode ? 'active' : ''}`}
          onClick={() => onFilterModeChange(mode)}
        >
          {t.filters[mode]}
        </button>
      ))}
      <div className="segment-indicator" ref={indicatorRef} />
    </div>
  );
};

export const FilterControls: React.FC<FilterControlsProps> = (props) => {
  const {
    filterMode,
    selectedPeriod,
    onFilterModeChange,
    onPeriodChange,
    unseenCount,
    onMarkAllRead,
    t,
  } = props;

  return (
    <div className="filter-controls">
      <div className="filter-modes-row">
        <SegmentedControl filterMode={filterMode} onFilterModeChange={onFilterModeChange} t={t} />
        <FilterActions
          filterMode={filterMode}
          unseenCount={unseenCount}
          onMarkAllRead={onMarkAllRead}
          t={t}
        />
      </div>
      {(filterMode === 'within' || filterMode === 'older') && (
        <PeriodButtons selectedPeriod={selectedPeriod} onPeriodChange={onPeriodChange} t={t} />
      )}
    </div>
  );
};
