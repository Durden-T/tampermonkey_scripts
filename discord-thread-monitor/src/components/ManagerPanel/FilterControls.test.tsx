import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import type { TimePeriod, TimeFilterMode } from '../../utils/timeFilters';

describe('FilterControls', () => {
  let mockOnFilterModeChange: (mode: TimeFilterMode | 'all') => void;
  let mockOnPeriodChange: (period: TimePeriod) => void;
  let getTexts: ReturnType<(typeof import('../../i18n'))['getTexts']>;
  let FilterControls: ReturnType<(typeof import('./FilterControls'))['FilterControls']>;
  let t: ReturnType<(typeof import('../../i18n'))['getTexts']>;

  beforeEach(async () => {
    mockOnFilterModeChange = vi.fn();
    mockOnPeriodChange = vi.fn();

    // Clear any cached modules first
    vi.resetModules();

    // Import modules dynamically after setting up mocks
    const i18nModule = await import('../../i18n');
    getTexts = i18nModule.getTexts;
    t = getTexts('en');

    const filterModule = await import('./FilterControls');
    FilterControls = filterModule.FilterControls;
  });

  describe('Rendering', () => {
    it('should render all filter mode buttons', () => {
      render(
        <FilterControls
          filterMode="all"
          selectedPeriod="1h"
          onFilterModeChange={mockOnFilterModeChange}
          onPeriodChange={mockOnPeriodChange}
          t={t}
        />
      );

      expect(screen.getByText(t.filters.all)).toBeInTheDocument();
      expect(screen.getByText(t.filters.within)).toBeInTheDocument();
      expect(screen.getByText(t.filters.older)).toBeInTheDocument();
    });

    it('should render period buttons when filter mode is not "all"', () => {
      render(
        <FilterControls
          filterMode="within"
          selectedPeriod="1h"
          onFilterModeChange={mockOnFilterModeChange}
          onPeriodChange={mockOnPeriodChange}
          t={t}
        />
      );

      // Check if period buttons are rendered
      expect(screen.getByText(t.filters.periods.day)).toBeInTheDocument();
      expect(screen.getByText(t.filters.periods.week)).toBeInTheDocument();
      expect(screen.getByText(t.filters.periods.month)).toBeInTheDocument();
      expect(screen.getByText(t.filters.periods.month3)).toBeInTheDocument();
    });

    it('should not render period buttons when filter mode is "all"', () => {
      render(
        <FilterControls
          filterMode="all"
          selectedPeriod="1h"
          onFilterModeChange={mockOnFilterModeChange}
          onPeriodChange={mockOnPeriodChange}
          t={t}
        />
      );

      // Period buttons should not be in the document when mode is "all"
      const periodContainer = document.querySelector('.filter-period-buttons');
      expect(periodContainer).toBeNull();
    });
  });

  describe('Filter mode selection', () => {
    it('should call onFilterModeChange when filter mode button is clicked', () => {
      render(
        <FilterControls
          filterMode="all"
          selectedPeriod="1h"
          onFilterModeChange={mockOnFilterModeChange}
          onPeriodChange={mockOnPeriodChange}
          t={t}
        />
      );

      const withinButton = screen.getByText(t.filters.within);
      fireEvent.click(withinButton);

      expect(mockOnFilterModeChange).toHaveBeenCalledWith('within');
    });

    it('should highlight the active filter mode button', () => {
      render(
        <FilterControls
          filterMode="within"
          selectedPeriod="1h"
          onFilterModeChange={mockOnFilterModeChange}
          onPeriodChange={mockOnPeriodChange}
          t={t}
        />
      );

      const withinButton = screen.getByText(t.filters.within);
      expect(withinButton).toHaveClass('active');

      const allButton = screen.getByText(t.filters.all);
      expect(allButton).not.toHaveClass('active');
    });
  });

  describe('Period selection', () => {
    it('should call onPeriodChange when period button is clicked', () => {
      render(
        <FilterControls
          filterMode="within"
          selectedPeriod="1h"
          onFilterModeChange={mockOnFilterModeChange}
          onPeriodChange={mockOnPeriodChange}
          t={t}
        />
      );

      const periodButton = screen.getByText(t.filters.periods.day);
      fireEvent.click(periodButton);

      expect(mockOnPeriodChange).toHaveBeenCalledWith('day');
    });

    it('should highlight the active period button', () => {
      render(
        <FilterControls
          filterMode="older"
          selectedPeriod="week"
          onFilterModeChange={mockOnFilterModeChange}
          onPeriodChange={mockOnPeriodChange}
          t={t}
        />
      );

      const sevenDayButton = screen.getByText(t.filters.periods.week);
      expect(sevenDayButton).toHaveClass('active');

      const oneHourButton = screen.getByText(t.filters.periods.day);
      expect(oneHourButton).not.toHaveClass('active');
    });

    it('should call onPeriodChange for each available period', () => {
      render(
        <FilterControls
          filterMode="within"
          selectedPeriod="1h"
          onFilterModeChange={mockOnFilterModeChange}
          onPeriodChange={mockOnPeriodChange}
          t={t}
        />
      );

      const periods = ['day', 'week', 'month', 'month3', 'month6', 'year'] as const;

      periods.forEach((period) => {
        const periodButton = screen.getByText(t.filters.periods[period]);
        fireEvent.click(periodButton);
        expect(mockOnPeriodChange).toHaveBeenCalledWith(period);
      });
    });
  });

  describe('Class names', () => {
    it('should apply correct class names to filter buttons', () => {
      render(
        <FilterControls
          filterMode="within"
          selectedPeriod="1h"
          onFilterModeChange={mockOnFilterModeChange}
          onPeriodChange={mockOnPeriodChange}
          t={t}
        />
      );

      const filterContainer = document.querySelector('.filter-mode-buttons');
      expect(filterContainer).toBeInTheDocument();

      const activeButton = screen.getByText(t.filters.within);
      expect(activeButton).toHaveClass('filter-button', 'active');

      const inactiveButton = screen.getByText(t.filters.all);
      expect(inactiveButton).toHaveClass('filter-button');
      expect(inactiveButton).not.toHaveClass('active');
    });

    it('should apply correct class names to period buttons', () => {
      render(
        <FilterControls
          filterMode="older"
          selectedPeriod="month"
          onFilterModeChange={mockOnFilterModeChange}
          onPeriodChange={mockOnPeriodChange}
          t={t}
        />
      );

      const activePeriodButton = screen.getByText(t.filters.periods.month);
      expect(activePeriodButton).toHaveClass('filter-button', 'active');

      const inactivePeriodButton = screen.getByText(t.filters.periods.day);
      expect(inactivePeriodButton).toHaveClass('filter-button');
      expect(inactivePeriodButton).not.toHaveClass('active');
    });
  });

  describe('All filter modes', () => {
    it('should handle switching between all filter modes', () => {
      render(
        <FilterControls
          filterMode="all"
          selectedPeriod="1h"
          onFilterModeChange={mockOnFilterModeChange}
          onPeriodChange={mockOnPeriodChange}
          t={t}
        />
      );

      // Test switching to "within"
      fireEvent.click(screen.getByText(t.filters.within));
      expect(mockOnFilterModeChange).toHaveBeenCalledWith('within');

      // Test switching to "older"
      fireEvent.click(screen.getByText(t.filters.older));
      expect(mockOnFilterModeChange).toHaveBeenCalledWith('older');

      // Test switching back to "all"
      fireEvent.click(screen.getByText(t.filters.all));
      expect(mockOnFilterModeChange).toHaveBeenCalledWith('all');
    });
  });
});
