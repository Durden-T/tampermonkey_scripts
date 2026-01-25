import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettingsHandlers } from './useSettingsHandlers';
import type { ThreadStore } from '../core/ThreadStore';

describe('useSettingsHandlers', () => {
  let mockStore: Partial<ThreadStore>;
  let mockRefreshData: () => void;
  let mockSetRetentionDays: React.Dispatch<React.SetStateAction<number>>;

  beforeEach(() => {
    mockStore = {
      setRetentionDays: vi.fn(),
    };

    mockRefreshData = vi.fn();
    mockSetRetentionDays = vi.fn();
  });

  describe('handleRetentionChange', () => {
    it('should call store.setRetentionDays with the provided days', () => {
      const { result } = renderHook(() =>
        useSettingsHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
          setRetentionDays: mockSetRetentionDays,
        })
      );

      act(() => {
        result.current.handleRetentionChange(30);
      });

      expect(mockStore.setRetentionDays).toHaveBeenCalledWith(30);
    });

    it('should call setRetentionDays with the provided days', () => {
      const { result } = renderHook(() =>
        useSettingsHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
          setRetentionDays: mockSetRetentionDays,
        })
      );

      act(() => {
        result.current.handleRetentionChange(30);
      });

      expect(mockSetRetentionDays).toHaveBeenCalledWith(30);
    });

    it('should call refreshData after updating retention days', () => {
      const { result } = renderHook(() =>
        useSettingsHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
          setRetentionDays: mockSetRetentionDays,
        })
      );

      act(() => {
        result.current.handleRetentionChange(30);
      });

      expect(mockRefreshData).toHaveBeenCalledTimes(1);
    });

    it('should handle permanent retention (0 days)', () => {
      const { result } = renderHook(() =>
        useSettingsHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
          setRetentionDays: mockSetRetentionDays,
        })
      );

      act(() => {
        result.current.handleRetentionChange(0);
      });

      expect(mockStore.setRetentionDays).toHaveBeenCalledWith(0);
      expect(mockSetRetentionDays).toHaveBeenCalledWith(0);
      expect(mockRefreshData).toHaveBeenCalledTimes(1);
    });

    it('should handle maximum retention days', () => {
      const { result } = renderHook(() =>
        useSettingsHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
          setRetentionDays: mockSetRetentionDays,
        })
      );

      act(() => {
        result.current.handleRetentionChange(365);
      });

      expect(mockStore.setRetentionDays).toHaveBeenCalledWith(365);
      expect(mockSetRetentionDays).toHaveBeenCalledWith(365);
      expect(mockRefreshData).toHaveBeenCalledTimes(1);
    });

    it('should maintain stable callback reference between renders', () => {
      const { result, rerender } = renderHook(() =>
        useSettingsHandlers({
          store: mockStore as ThreadStore,
          refreshData: mockRefreshData,
          setRetentionDays: mockSetRetentionDays,
        })
      );

      const firstCallback = result.current.handleRetentionChange;

      rerender({
        store: mockStore as ThreadStore,
        refreshData: mockRefreshData,
        setRetentionDays: mockSetRetentionDays,
      });

      expect(result.current.handleRetentionChange).toBe(firstCallback);
    });
  });
});
