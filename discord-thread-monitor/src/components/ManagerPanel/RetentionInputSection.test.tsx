import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RetentionInputSection } from './RetentionInputSection';
import { getTexts } from '../../i18n';

vi.mock('../../i18n', () => ({
  getTexts: vi.fn(() => ({
    settings: {
      retentionPeriod: 'Retention',
      permanent: 'Permanent',
      days: 'days',
      retentionHint: '0 = permanent',
    },
  })),
}));

describe('RetentionInputSection', () => {
  let mockOnRetentionChange: ReturnType<typeof vi.fn>;
  let t: ReturnType<typeof getTexts>;

  beforeEach(() => {
    mockOnRetentionChange = vi.fn();
    t = getTexts('en');
  });

  describe('Rendering', () => {
    it('should render the retention input section with hint', () => {
      render(
        <RetentionInputSection retentionDays={30} onRetentionChange={mockOnRetentionChange} t={t} />
      );

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', '0');
      expect(screen.getByText('0 = permanent')).toBeInTheDocument();
    });

    it('should display current retention days', () => {
      render(
        <RetentionInputSection retentionDays={30} onRetentionChange={mockOnRetentionChange} t={t} />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('30');
    });

    it('should display 0 when retention days is 0', () => {
      render(
        <RetentionInputSection retentionDays={0} onRetentionChange={mockOnRetentionChange} t={t} />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('0');
    });

    it('should always show days unit', () => {
      render(
        <RetentionInputSection retentionDays={30} onRetentionChange={mockOnRetentionChange} t={t} />
      );

      expect(screen.getByText('days')).toBeInTheDocument();
    });

    it('should show days unit even when retention is 0', () => {
      render(
        <RetentionInputSection retentionDays={0} onRetentionChange={mockOnRetentionChange} t={t} />
      );

      expect(screen.getByText('days')).toBeInTheDocument();
    });
  });

  describe('User interactions', () => {
    it('should handle user typing in the input', () => {
      render(
        <RetentionInputSection retentionDays={30} onRetentionChange={mockOnRetentionChange} t={t} />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '45' } });

      expect(input.value).toBe('45');
    });

    it('should handle blur event on the input', () => {
      render(
        <RetentionInputSection retentionDays={30} onRetentionChange={mockOnRetentionChange} t={t} />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '60' } });
      fireEvent.blur(input);

      expect(input.value).toBe('60');
    });

    it('should handle Enter key on the input', () => {
      render(
        <RetentionInputSection retentionDays={30} onRetentionChange={mockOnRetentionChange} t={t} />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '55' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(input.value).toBe('55');
    });
  });
});
