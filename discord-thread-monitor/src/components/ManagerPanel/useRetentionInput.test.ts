import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

describe('useRetentionInput', () => {
  let mockOnRetentionChange: (days: number) => void;
  let useRetentionInput: (typeof import('./useRetentionInput'))['useRetentionInput'];

  beforeEach(async () => {
    mockOnRetentionChange = vi.fn();
    vi.resetModules();

    const retentionModule = await import('./useRetentionInput');
    useRetentionInput = retentionModule.useRetentionInput;
  });

  describe('Initialization', () => {
    it('should initialize with empty input when retention days is 0', () => {
      const { result } = renderHook(() => useRetentionInput(0, mockOnRetentionChange));

      expect(result.current.inputDisplayValue).toBe('0');
    });

    it('should initialize with empty input when retention days is positive', () => {
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange));

      expect(result.current.inputDisplayValue).toBe('30');
    });
  });

  describe('setRetentionInput', () => {
    it('should update input value', () => {
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange));

      act(() => {
        result.current.setRetentionInput('45');
      });

      expect(result.current.inputDisplayValue).toBe('45');
    });
  });

  describe('handleRetentionBlur', () => {
    it('should handle valid retention days', () => {
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange));

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
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange));

      act(() => {
        result.current.setRetentionInput('0');
      });

      act(() => {
        result.current.handleRetentionBlur();
      });

      expect(mockOnRetentionChange).toHaveBeenCalledWith(0);
    });

    it('should handle large retention days (no upper limit)', () => {
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange));

      act(() => {
        result.current.setRetentionInput('1000');
      });

      act(() => {
        result.current.handleRetentionBlur();
      });

      expect(mockOnRetentionChange).toHaveBeenCalledWith(1000);
    });

    it('should reject invalid retention days (negative)', () => {
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange));

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

    it('should reject invalid input (non-numeric)', () => {
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange));

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
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange));

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
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange));

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
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange));

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
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange));

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
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange));

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
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange));

      act(() => {
        result.current.setRetentionInput('45');
      });

      expect(result.current.inputDisplayValue).toBe('45');
    });

    it('should show current retention days when input is empty', () => {
      const { result } = renderHook(() => useRetentionInput(30, mockOnRetentionChange));

      expect(result.current.inputDisplayValue).toBe('30');
    });

    it('should show 0 when retention days is 0 (permanent)', () => {
      const { result } = renderHook(() => useRetentionInput(0, mockOnRetentionChange));

      expect(result.current.inputDisplayValue).toBe('0');
    });
  });
});
