import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

describe('useRetentionInput', () => {
  let mockOnRetentionChange: (days: number) => void;
  let getTexts: ReturnType<(typeof import('../../i18n'))['getTexts']>;
  let useRetentionInput: ReturnType<(typeof import('./useRetentionInput'))['useRetentionInput']>;
  let t: ReturnType<(typeof import('../../i18n'))['getTexts']>;

  beforeEach(async () => {
    mockOnRetentionChange = vi.fn();

    // Clear any cached modules first
    vi.resetModules();

    // Import modules dynamically after setting up mocks
    const i18nModule = await import('../../i18n');
    getTexts = i18nModule.getTexts;
    t = getTexts('en');

    const retentionModule = await import('./useRetentionInput');
    useRetentionInput = retentionModule.useRetentionInput;
  });

  describe('Initialization', () => {
    it('should initialize with empty input when retention days is 0', () => {
      const { result } = renderHook(() => useRetentionInput(0, mockOnRetentionChange, t));

      expect(result.current.inputDisplayValue).toBe(t.settings.permanent);
    });

    it('should initialize with empty input when retention days is positive', () => {
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange, t));

      expect(result.current.inputDisplayValue).toBe('30');
    });
  });

  describe('setRetentionInput', () => {
    it('should update input value', () => {
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange, t));

      act(() => {
        result.current.setRetentionInput('45');
      });

      expect(result.current.inputDisplayValue).toBe('45');
    });
  });

  describe('handleRetentionBlur', () => {
    it('should handle permanent keyword (English)', () => {
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange, t));

      act(() => {
        result.current.setRetentionInput('permanent');
      });

      act(() => {
        result.current.handleRetentionBlur();
      });

      expect(mockOnRetentionChange).toHaveBeenCalledWith(0);
      expect(result.current.inputDisplayValue).toBe(t.settings.permanent);
    });

    it('should handle permanent keyword (Chinese)', () => {
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange, t));

      act(() => {
        result.current.setRetentionInput('永久');
      });

      act(() => {
        result.current.handleRetentionBlur();
      });

      expect(mockOnRetentionChange).toHaveBeenCalledWith(0);
      expect(result.current.inputDisplayValue).toBe(t.settings.permanent);
    });

    it('should handle valid retention days', () => {
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange, t));

      act(() => {
        result.current.setRetentionInput('60');
      });

      act(() => {
        result.current.handleRetentionBlur();
      });

      expect(mockOnRetentionChange).toHaveBeenCalledWith(60);
      expect(result.current.inputDisplayValue).toBe('60');
    });

    it('should handle minimum retention days (0)', () => {
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange, t));

      act(() => {
        result.current.setRetentionInput('0');
      });

      act(() => {
        result.current.handleRetentionBlur();
      });

      expect(mockOnRetentionChange).toHaveBeenCalledWith(0);
    });

    it('should handle maximum retention days (365)', () => {
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange, t));

      act(() => {
        result.current.setRetentionInput('365');
      });

      act(() => {
        result.current.handleRetentionBlur();
      });

      expect(mockOnRetentionChange).toHaveBeenCalledWith(365);
    });

    it('should reject invalid retention days (negative)', () => {
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange, t));

      const initialDisplayValue = result.current.inputDisplayValue;

      act(() => {
        result.current.setRetentionInput('-1');
      });

      act(() => {
        result.current.handleRetentionBlur();
      });

      expect(mockOnRetentionChange).not.toHaveBeenCalled();
      expect(result.current.inputDisplayValue).toBe(initialDisplayValue);
    });

    it('should reject invalid retention days (above maximum)', () => {
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange, t));

      const initialDisplayValue = result.current.inputDisplayValue;

      act(() => {
        result.current.setRetentionInput('366');
      });

      act(() => {
        result.current.handleRetentionBlur();
      });

      expect(mockOnRetentionChange).not.toHaveBeenCalled();
      expect(result.current.inputDisplayValue).toBe(initialDisplayValue);
    });

    it('should reject invalid input (non-numeric)', () => {
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange, t));

      const initialDisplayValue = result.current.inputDisplayValue;

      act(() => {
        result.current.setRetentionInput('abc');
      });

      act(() => {
        result.current.handleRetentionBlur();
      });

      expect(mockOnRetentionChange).not.toHaveBeenCalled();
      expect(result.current.inputDisplayValue).toBe(initialDisplayValue);
    });

    it('should handle empty input (restore previous value)', () => {
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange, t));

      act(() => {
        result.current.setRetentionInput('');
      });

      act(() => {
        result.current.handleRetentionBlur();
      });

      expect(mockOnRetentionChange).not.toHaveBeenCalled();
      expect(result.current.inputDisplayValue).toBe('30');
    });

    it('should handle whitespace-only input', () => {
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange, t));

      act(() => {
        result.current.setRetentionInput('  ');
      });

      act(() => {
        result.current.handleRetentionBlur();
      });

      expect(mockOnRetentionChange).not.toHaveBeenCalled();
      expect(result.current.inputDisplayValue).toBe('30');
    });

    it('should trim whitespace from valid input', () => {
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange, t));

      act(() => {
        result.current.setRetentionInput(' 60 ');
      });

      act(() => {
        result.current.handleRetentionBlur();
      });

      expect(mockOnRetentionChange).toHaveBeenCalledWith(60);
      expect(result.current.inputDisplayValue).toBe('60');
    });
  });

  describe('handleRetentionKeyDown', () => {
    it('should trigger handleRetentionBlur on Enter key', () => {
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange, t));

      act(() => {
        result.current.setRetentionInput('60');
      });

      const mockEvent = {
        key: 'Enter',
      } as React.KeyboardEvent<HTMLInputElement>;

      act(() => {
        result.current.handleRetentionKeyDown(mockEvent);
      });

      expect(mockOnRetentionChange).toHaveBeenCalledWith(60);
    });

    it('should not trigger handleRetentionBlur on other keys', () => {
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange, t));

      act(() => {
        result.current.setRetentionInput('60');
      });

      const mockEvent = {
        key: 'Tab',
      } as React.KeyboardEvent<HTMLInputElement>;

      act(() => {
        result.current.handleRetentionKeyDown(mockEvent);
      });

      expect(mockOnRetentionChange).not.toHaveBeenCalled();
    });
  });

  describe('Input display value', () => {
    it('should show input value when user is typing', () => {
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange, t));

      act(() => {
        result.current.setRetentionInput('45');
      });

      expect(result.current.inputDisplayValue).toBe('45');
    });

    it('should show current retention days when input is empty', () => {
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange, t));

      expect(result.current.inputDisplayValue).toBe('30');
    });

    it('should show permanent text when retention days is 0', () => {
      const { result } = renderHook(() => useRetentionInput(0, mockOnRetentionChange, t));

      expect(result.current.inputDisplayValue).toBe(t.settings.permanent);
    });
  });
});
