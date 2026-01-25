import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import type { TimePeriod, TimeFilterMode } from '../../utils/timeFilters';

describe('FilterControls', () => {
  let mockOnFilterModeChange: (mode: TimeFilterMode | 'all') => void;
  let mockOnPeriodChange: (period: TimePeriod) => void;
  let mockOnMarkAllRead: () => void;
  let mockOnClearChanges: () => void;
  let getTexts: ReturnType<(typeof import('../../i18n'))['getTexts']>;
  let FilterControls: ReturnType<(typeof import('./FilterControls'))['FilterControls']>;
  let t: ReturnType<(typeof import('../../i18n'))['getTexts']>;

  beforeEach(async () => {
    mockOnFilterModeChange = vi.fn();
    mockOnPeriodChange = vi.fn();
    mockOnMarkAllRead = vi.fn();
    mockOnClearChanges = vi.fn();

    vi.resetModules();

    const i18nModule = await import('../../i18n');
    getTexts = i18nModule.getTexts;
    t = getTexts('en');

    const filterModule = await import('./FilterControls');
    FilterControls = filterModule.FilterControls;
  });

  const defaultProps = () => ({
    onFilterModeChange: mockOnFilterModeChange,
    onPeriodChange: mockOnPeriodChange,
    unseenCount: 0,
    changesLength: 0,
    onMarkAllRead: mockOnMarkAllRead,
    onClearChanges: mockOnClearChanges,
    t,
  });

  describe('Rendering', () => {
    it('should render all filter mode buttons', () => {
      render(<FilterControls {...defaultProps()} filterMode="all" selectedPeriod="1h" />);

      expect(screen.getByText(t.filters.all)).toBeInTheDocument();
      expect(screen.getByText(t.filters.within)).toBeInTheDocument();
      expect(screen.getByText(t.filters.older)).toBeInTheDocument();
    });

    it('should render period buttons when filter mode is not "all"', () => {
      render(<FilterControls {...defaultProps()} filterMode="within" selectedPeriod="1h" />);

      expect(screen.getByText(t.filters.periods.day)).toBeInTheDocument();
      expect(screen.getByText(t.filters.periods.week)).toBeInTheDocument();
      expect(screen.getByText(t.filters.periods.month)).toBeInTheDocument();
      expect(screen.getByText(t.filters.periods.month3)).toBeInTheDocument();
    });

    it('should not render period buttons when filter mode is "all"', () => {
      render(<FilterControls {...defaultProps()} filterMode="all" selectedPeriod="1h" />);

      const periodContainer = document.querySelector('.filter-period-buttons');
      expect(periodContainer).toBeNull();
    });
  });

  describe('Filter mode selection', () => {
    it('should call onFilterModeChange when filter mode button is clicked', () => {
      render(<FilterControls {...defaultProps()} filterMode="all" selectedPeriod="1h" />);

      fireEvent.click(screen.getByText(t.filters.within));

      expect(mockOnFilterModeChange).toHaveBeenCalledWith('within');
    });

    it('should highlight the active filter mode button', () => {
      render(<FilterControls {...defaultProps()} filterMode="within" selectedPeriod="1h" />);

      expect(screen.getByText(t.filters.within)).toHaveClass('active');
      expect(screen.getByText(t.filters.all)).not.toHaveClass('active');
    });
  });

  describe('Period selection', () => {
    it('should call onPeriodChange when period button is clicked', () => {
      render(<FilterControls {...defaultProps()} filterMode="within" selectedPeriod="1h" />);

      fireEvent.click(screen.getByText(t.filters.periods.day));

      expect(mockOnPeriodChange).toHaveBeenCalledWith('day');
    });

    it('should highlight the active period button', () => {
      render(<FilterControls {...defaultProps()} filterMode="older" selectedPeriod="week" />);

      expect(screen.getByText(t.filters.periods.week)).toHaveClass('active');
      expect(screen.getByText(t.filters.periods.day)).not.toHaveClass('active');
    });

    it('should call onPeriodChange for each available period', () => {
      render(<FilterControls {...defaultProps()} filterMode="within" selectedPeriod="1h" />);

      const periods = ['day', 'week', 'month', 'month3', 'month6', 'year'] as const;

      periods.forEach((period) => {
        fireEvent.click(screen.getByText(t.filters.periods[period]));
        expect(mockOnPeriodChange).toHaveBeenCalledWith(period);
      });
    });
  });

  describe('Class names', () => {
    it('should apply correct class names to filter buttons', () => {
      render(<FilterControls {...defaultProps()} filterMode="within" selectedPeriod="1h" />);

      expect(document.querySelector('.filter-mode-buttons')).toBeInTheDocument();
      expect(screen.getByText(t.filters.within)).toHaveClass('filter-button', 'active');
      expect(screen.getByText(t.filters.all)).toHaveClass('filter-button');
      expect(screen.getByText(t.filters.all)).not.toHaveClass('active');
    });

    it('should apply correct class names to period buttons', () => {
      render(<FilterControls {...defaultProps()} filterMode="older" selectedPeriod="month" />);

      expect(screen.getByText(t.filters.periods.month)).toHaveClass('filter-button', 'active');
      expect(screen.getByText(t.filters.periods.day)).toHaveClass('filter-button');
      expect(screen.getByText(t.filters.periods.day)).not.toHaveClass('active');
    });
  });

  describe('All filter modes', () => {
    it('should handle switching between all filter modes', () => {
      render(<FilterControls {...defaultProps()} filterMode="all" selectedPeriod="1h" />);

      fireEvent.click(screen.getByText(t.filters.within));
      expect(mockOnFilterModeChange).toHaveBeenCalledWith('within');

      fireEvent.click(screen.getByText(t.filters.older));
      expect(mockOnFilterModeChange).toHaveBeenCalledWith('older');

      fireEvent.click(screen.getByText(t.filters.all));
      expect(mockOnFilterModeChange).toHaveBeenCalledWith('all');
    });
  });
});
