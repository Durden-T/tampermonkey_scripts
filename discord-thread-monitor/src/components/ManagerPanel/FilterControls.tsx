import { type getTexts } from '../../i18n';
import { TIME_PERIODS, type TimePeriod, type TimeFilterMode } from '../../utils/timeFilters';
import { HeaderActions } from './HeaderActions';

interface FilterControlsProps {
  filterMode: TimeFilterMode | 'all';
  selectedPeriod: TimePeriod;
  onFilterModeChange: (mode: TimeFilterMode | 'all') => void;
  onPeriodChange: (period: TimePeriod) => void;
  unseenCount: number;
  changesLength: number;
  onMarkAllRead: () => void;
  onClearChanges: () => void;
  t: ReturnType<typeof getTexts>;
}

const FILTER_MODES: Array<'all' | 'within' | 'older'> = ['all', 'within', 'older'];

export const FilterControls: React.FC<FilterControlsProps> = (props) => {
  const { filterMode, selectedPeriod, onFilterModeChange, onPeriodChange, t } = props;

  return (
    <div className="filter-controls">
      <div className="filter-row">
        <div className="filter-mode-buttons">
          {FILTER_MODES.map((mode) => (
            <button
              key={mode}
              className={`filter-button ${filterMode === mode ? 'active' : ''}`}
              onClick={() => onFilterModeChange(mode)}
            >
              {t.filters[mode]}
            </button>
          ))}
        </div>
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
      <HeaderActions {...props} />
    </div>
  );
};
