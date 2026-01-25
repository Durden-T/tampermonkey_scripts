import { getTexts } from '../../i18n';
import { TIME_PERIODS, type TimePeriod, type TimeFilterMode } from '../../utils/timeFilters';

interface FilterControlsProps {
  filterMode: TimeFilterMode | 'all';
  selectedPeriod: TimePeriod;
  onFilterModeChange: (mode: TimeFilterMode | 'all') => void;
  onPeriodChange: (period: TimePeriod) => void;
  t: ReturnType<typeof getTexts>;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
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
