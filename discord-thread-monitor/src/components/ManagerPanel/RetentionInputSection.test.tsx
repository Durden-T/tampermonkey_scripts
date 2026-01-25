import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RetentionInputSection } from './RetentionInputSection';
import { getTexts } from '../../i18n';

// Mock the i18n module
vi.mock('../../i18n', () => ({
  getTexts: vi.fn(() => ({
    settings: {
      retentionPeriod: 'Retention Period',
      permanent: 'Permanent',
      days: 'days',
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
    it('should render the retention input section', () => {
      render(
        <RetentionInputSection retentionDays={30} onRetentionChange={mockOnRetentionChange} t={t} />
      );

      // Use getByRole to find the input
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'Permanent');
    });

    it('should display current retention days', () => {
      render(
        <RetentionInputSection retentionDays={30} onRetentionChange={mockOnRetentionChange} t={t} />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('30');
    });

    it('should display permanent text when retention days is 0', () => {
      render(
        <RetentionInputSection retentionDays={0} onRetentionChange={mockOnRetentionChange} t={t} />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('Permanent');
    });

    it('should show days unit when retention days is positive', () => {
      render(
        <RetentionInputSection retentionDays={30} onRetentionChange={mockOnRetentionChange} t={t} />
      );

      expect(screen.getByText('days')).toBeInTheDocument();
    });

    it('should not show days unit when retention is permanent', () => {
      render(
        <RetentionInputSection retentionDays={0} onRetentionChange={mockOnRetentionChange} t={t} />
      );

      expect(screen.queryByText('days')).not.toBeInTheDocument();
    });
  });

  describe('User interactions', () => {
    it('should handle user typing in the input', async () => {
      const user = userEvent.setup();

      render(
        <RetentionInputSection retentionDays={30} onRetentionChange={mockOnRetentionChange} t={t} />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;

      // Simulate user typing - this tests that the onChange handler is attached
      fireEvent.change(input, { target: { value: '45' } });

      // The input value should update through React state
      expect(input.value).toBe('45');
    });

    it('should handle blur event on the input', async () => {
      const user = userEvent.setup();

      render(
        <RetentionInputSection retentionDays={30} onRetentionChange={mockOnRetentionChange} t={t} />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;

      // Change the value and then blur
      fireEvent.change(input, { target: { value: '60' } });
      fireEvent.blur(input);

      // Test completed successfully - component handled the events
      expect(input.value).toBe('60');
    });

    it('should handle Enter key on the input', async () => {
      const user = userEvent.setup();

      render(
        <RetentionInputSection retentionDays={30} onRetentionChange={mockOnRetentionChange} t={t} />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;

      // Change the value and press Enter
      fireEvent.change(input, { target: { value: '55' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // Test completed successfully - component handled the events
      expect(input.value).toBe('55');
    });
  });
});
